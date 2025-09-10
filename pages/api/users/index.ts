import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { 
  createListResponse, 
  createErrorResponse, 
  parsePaginationParams 
} from '../../../lib/api/standardResponse';
import { handleDatabaseError, handleGenericError } from '../../../lib/api/errorHandling';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ - данные загружаются в реальном времени
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      
      const { role, search } = req.query;
      const { page, limit, offset } = parsePaginationParams(req.query);

      // 🚀 ОПТИМИЗАЦИЯ: Поиск перенесен в SQL запрос
      let query = supabaseAdmin
        .from('users')
        .select(`
          id, 
          email, 
          first_name, 
          last_name, 
          phone, 
          telegram, 
          role_id, 
          created_at, 
          updated_at, 
          avatar_url, 
          is_deleted,
          role:roles(id, name, display_name)
        `, { count: 'exact' })
        .eq('is_deleted', false);

      // Фильтр по роли
      if (role) {
        query = query.eq('role_id', role);
      }

      // 🔍 ПОИСК: Используем простую фильтрацию
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = decodeURIComponent(search.trim());
        // Используем отдельные запросы для поиска
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      // Получаем общее количество для пагинации
      const { count: totalCount, error: countError } = await query;
      if (countError) {
        return handleDatabaseError(countError, res, 'users count');
      }

      // Получаем данные с пагинацией
      const { data: users, error: usersError } = await query
        .order('id', { ascending: true })
        .range(offset, offset + limit - 1);

      if (usersError) {
        return handleDatabaseError(usersError, res, 'users fetch');
      }

      // Обрабатываем данные пользователей
      const processedUsers = (users || []).map((user: any) => ({
        ...user,
        role_name: user.role?.display_name || user.role?.name || 'Не указана',
        full_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Не указано'
      }));

      // 📊 СТАНДАРТИЗИРОВАННЫЙ ОТВЕТ
      const response = createListResponse(
        processedUsers,
        totalCount || 0,
        page,
        limit,
        'users',
        {
          search: search || null,
          role_filter: role || null,
          active_users: processedUsers.length,
          has_avatars: processedUsers.filter((u: any) => u.avatar_url).length
        }
      );

      return res.status(200).json(response);

    } catch (error) {
      return handleGenericError(error, res, 'users API');
    }
  }

  // Неподдерживаемый метод
  const errorResponse = createErrorResponse('Метод не поддерживается');
  return res.status(405).json(errorResponse);
}