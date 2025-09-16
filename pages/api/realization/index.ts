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
 * API роут для API реализации
 * Использует унифицированную систему обработки ошибок, валидации и кэширования
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { search = '', page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Генерируем ключ кэша
    const cacheKey = cacheKeys.realization(pageNum, limitNum, search as string);

    try {
      // Пытаемся получить данные из кэша
      const cachedData = cache.getOnly(cacheKey);
      if (cachedData) {
        return res.status(200).json(cachedData);
      }

      // Загружаем данные из базы данных
      const { data: items, error, count } = await supabaseAdmin
        .from('realization')
        .select(`
          *,
          sender:users!realization_sender_id_fkey(first_name, last_name),
          recipient:users!realization_recipient_id_fkey(first_name, last_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) {
        const apiError = handleDatabaseError(error, 'realization fetch');
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

      // Загружаем товары для всех реализаций одним запросом
      let itemsByRealization: Record<number, any[]> = {};
      
      if (filteredItems.length > 0) {
        // Получаем диапазон дат для всех реализаций
        const dates = filteredItems.map(item => new Date(item.created_at));
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        
        // Загружаем все товары за период одним запросом
        const { data: allRealizationItems, error: itemsError } = await supabaseAdmin
          .from('realization_items')
          .select(`
            id,
            product_id,
            size_code,
            qty,
            color_id,
            created_at,
            products!realization_items_product_id_fkey(
              id, 
              article, 
              name
            )
          `)
          .gte('created_at', minDate.toISOString())
          .lte('created_at', maxDate.toISOString())
          .limit(100);
        
        if (allRealizationItems && allRealizationItems.length > 0) {
          // Сопоставляем товары с реализациями по точному времени (с допуском ±5 минут)
          filteredItems.forEach(realization => {
            const realizationTime = new Date(realization.created_at).getTime();
            const timeWindow = 5 * 60 * 1000; // 5 минут в миллисекундах
            
            const realizationItems = allRealizationItems.filter(item => {
              const itemTime = new Date(item.created_at).getTime();
              return Math.abs(itemTime - realizationTime) <= timeWindow;
            });
            
            itemsByRealization[realization.id] = realizationItems;
          });
        }
      }

      // Загружаем цвета для товаров
      const allColorIds = new Set<number>();
      Object.values(itemsByRealization).forEach(items => {
        items.forEach(item => {
          if (item.color_id) {
            allColorIds.add(item.color_id);
          }
        });
      });

      let colorMap: Record<number, string> = {};
      if (allColorIds.size > 0) {
        const { data: colors } = await supabaseAdmin
          .from('colors')
          .select('id, name')
          .in('id', Array.from(allColorIds));
        
        if (colors) {
          colors.forEach(color => {
            colorMap[color.id] = color.name;
          });
        }
      }

      // Обрабатываем данные для фронтенда
      const processedItems = filteredItems.map((item: any) => {
        const items = itemsByRealization[item.id] || [];
        const firstItem = items[0];
        
        return {
          id: item.id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          notes: item.notes || '',
          sender_name: item.sender ? `${item.sender.first_name || ''} ${item.sender.last_name || ''}`.trim() : 'Отправитель',
          recipient_name: item.recipient ? `${item.recipient.first_name || ''} ${item.recipient.last_name || ''}`.trim() : 'Получатель',
          total_items: item.total_items || 0,
          first_article: firstItem?.products?.article || '',
          first_size: firstItem?.size_code || '',
          first_color: firstItem?.color_id ? colorMap[firstItem.color_id] || '' : '',
          status: item.status || 'active',
          items: items
        };
      });

      const responseData = {
        realizations: processedItems,
        pagination: {
          total: count || 0,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      };

      // Сохраняем в кэш
      cache.set(cacheKey, responseData);

      return res.status(200).json(responseData);

    } catch (error) {
      const apiError = handleDatabaseError(error, 'realization list');
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
  apiConfigs.list('realization'),
  handler,
  {
    logging: true,
    performance: true
  }
);
