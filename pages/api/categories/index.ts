import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import {
  withApiMiddleware,
  apiConfigs,
  handleDatabaseError,
  sendErrorResponse
} from '../../../lib/unified';
import {
  createListResponse,
  createPagination,
  parsePaginationParams
} from '../../../lib/api/standardResponse';

/**
 * API роут для API категорий
 * Использует унифицированную систему обработки ошибок, валидации и кэширования
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { search = '' } = req.query;
    const { page, limit, offset } = parsePaginationParams(req.query);

    try {
      // Загружаем данные из базы данных (только нужные поля)
      const { data: items, error, count } = await supabaseAdmin
        .from('categories')
        .select('id, name', { count: 'exact' })
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        const apiError = handleDatabaseError(error, 'categories fetch');
        return sendErrorResponse(res, apiError);
      }

      // Применяем поиск если указан
      let filteredItems = items || [];
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = decodeURIComponent(search.trim()).toLowerCase();
        filteredItems = filteredItems.filter((item: any) => {
          // Адаптируйте логику поиска под конкретную таблицу
          return (
            (item.name && item.name.toLowerCase().includes(searchTerm)) ||
            (item.id && String(item.id).includes(searchTerm))
          );
        });
      }

      const pagination = createPagination(count || 0, page, limit);
      const response = createListResponse(filteredItems, pagination.total, page, limit, 'categories');

      return res.status(200).json(response);

    } catch (error) {
      const apiError = handleDatabaseError(error, 'categories list');
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
  apiConfigs.list('categories'),
  handler,
  {
    logging: true,
    performance: true
  }
);
