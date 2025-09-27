import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { 
  withApiMiddleware, 
  apiConfigs, 
  handleDatabaseError,
  sendErrorResponse
} from '../../../lib/unified';

/**
 * API роут для API пользователей
 * Использует унифицированную систему обработки ошибок, валидации и кэширования
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { search = '', page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    try {
      // Загружаем данные из базы данных с информацией о роли
      const { data: items, error, count } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          role:roles(display_name, name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) {
        const apiError = handleDatabaseError(error, 'users fetch');
        return sendErrorResponse(res, apiError);
      }

      // Применяем поиск если указан
      let filteredItems = items || [];
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = decodeURIComponent(search.trim()).toLowerCase();
        filteredItems = filteredItems.filter((item: any) => {
          // Поиск по имени, фамилии, email и телефону
          return (
            (item.first_name && item.first_name.toLowerCase().includes(searchTerm)) ||
            (item.last_name && item.last_name.toLowerCase().includes(searchTerm)) ||
            (item.email && item.email.toLowerCase().includes(searchTerm)) ||
            (item.phone && item.phone.toLowerCase().includes(searchTerm)) ||
            (item.telegram && item.telegram.toLowerCase().includes(searchTerm)) ||
            (item.id && String(item.id).includes(searchTerm))
          );
        });
      }

      const totalPages = Math.ceil((count || 0) / limitNum);

      const responseData = {
        data: {
          users: filteredItems,
          pagination: {
            total: count || 0,
            page: pageNum,
            limit: limitNum,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        }
      };

      return res.status(200).json(responseData);

    } catch (error) {
      const apiError = handleDatabaseError(error, 'users list');
      return sendErrorResponse(res, apiError);
    }
  }

  return res.status(405).json({
    error: 'Метод не поддерживается',
    allowedMethods: ['GET']
  });
}

// Экспортируем обработчик с унифицированным middleware
export default withApiMiddleware(
  apiConfigs.list('users'),
  handler,
  {
    logging: true,
    performance: true
  }
);
