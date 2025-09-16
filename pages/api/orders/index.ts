import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { 
  withApiMiddleware, 
  apiConfigs, 
  handleDatabaseError,
  sendErrorResponse,
  cache,
  cacheKeys
} from '../../../lib/unified';

/**
 * API роут для API заказов
 * Использует унифицированную систему обработки ошибок, валидации и кэширования
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { search = '', page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Генерируем ключ кэша
    const cacheKey = cacheKeys.orders(pageNum, limitNum, search as string);

    try {
      // Пытаемся получить данные из кэша
      const cachedData = cache.getOnly(cacheKey);
      if (cachedData) {
        return res.status(200).json(cachedData);
      }

      // Загружаем данные из базы данных
      const { data: items, error, count } = await supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) {
        const apiError = handleDatabaseError(error, 'orders fetch');
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

      const totalPages = Math.ceil((count || 0) / limitNum);

      const responseData = {
        data: {
          orders: filteredItems,
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

      // Сохраняем в кэш
      cache.set(cacheKey, responseData);

      return res.status(200).json(responseData);

    } catch (error) {
      const apiError = handleDatabaseError(error, 'orders list');
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
  apiConfigs.list('orders'),
  handler,
  {
    logging: true,
    performance: true
  }
);
