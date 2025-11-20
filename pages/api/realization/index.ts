import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { 
  withApiMiddleware, 
  apiConfigs, 
  handleDatabaseError,
  sendErrorResponse
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

    try {
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

      // Загружаем товары для всех реализаций
      let itemsByRealization: Record<number, any[]> = {};
      
      if (filteredItems.length > 0) {
        const realizationIds = filteredItems.map(item => item.id);
        
        // Пытаемся использовать realization_id (если колонка существует)
        let useRealizationId = false;
        try {
          const { data: testData, error: testError } = await supabaseAdmin
            .from('realization_items')
            .select('realization_id')
            .limit(1);
          
          if (!testError && testData !== null) {
            useRealizationId = true;
          }
        } catch (e) {
          // Колонка не существует, используем time-based linking
        }

        let allRealizationItems: any[] = [];

        if (useRealizationId) {
          // Используем прямой JOIN по realization_id (предпочтительный метод)
          const { data: itemsData, error: itemsError } = await supabaseAdmin
            .from('realization_items')
            .select(`
              id,
              product_id,
              size_code,
              qty,
              color_id,
              created_at,
              realization_id,
              products!realization_items_product_id_fkey(
                id, 
                article, 
                name
              )
            `)
            .in('realization_id', realizationIds);
          
          if (itemsError) {
            console.error('Ошибка при получении товаров по realization_id:', itemsError);
            // Fallback на time-based linking
            useRealizationId = false;
          } else {
            allRealizationItems = itemsData || [];
          }
        }

        if (!useRealizationId) {
          // Fallback: используем time-based linking (старый метод)
          const dates = filteredItems.map(item => new Date(item.created_at));
          const minDate = new Date(Math.min(...dates.map(d => d.getTime())) - 10 * 60 * 1000); // -10 минут
          const maxDate = new Date(Math.max(...dates.map(d => d.getTime())) + 10 * 60 * 1000); // +10 минут
          
          // Расширяем временной диапазон до ±3 часов от крайних реализаций
          const expandedMinDate = new Date(minDate.getTime() - 3 * 60 * 60 * 1000); // -3 часа
          const expandedMaxDate = new Date(maxDate.getTime() + 3 * 60 * 60 * 1000); // +3 часа
          
          // Загружаем все товары за период (без лимита для больших реализаций)
          let from = 0;
          const pageSize = 1000;
          let hasMore = true;
          
          while (hasMore) {
            const { data: batch, error: itemsError } = await supabaseAdmin
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
              .gte('created_at', expandedMinDate.toISOString())
              .lte('created_at', expandedMaxDate.toISOString())
              .range(from, from + pageSize - 1);
            
            if (itemsError) {
              console.error('Ошибка при получении товаров:', itemsError);
              break;
            }
            
            if (batch && batch.length > 0) {
              allRealizationItems = allRealizationItems.concat(batch);
              from += pageSize;
              hasMore = batch.length === pageSize;
            } else {
              hasMore = false;
            }
          }
        }
        
        if (allRealizationItems.length > 0) {
          if (useRealizationId) {
            // Группируем по realization_id
            filteredItems.forEach(realization => {
              const realizationItems = allRealizationItems.filter(item => item.realization_id === realization.id);
              itemsByRealization[realization.id] = realizationItems;
            });
          } else {
            // Связываем товары с реализациями по времени (±2 часа)
            filteredItems.forEach(realization => {
              const realizationTime = new Date(realization.created_at).getTime();
              const timeWindow = 2 * 60 * 60 * 1000; // 2 часа в миллисекундах
              
              const realizationItems = allRealizationItems.filter(item => {
                const itemTime = new Date(item.created_at).getTime();
                return Math.abs(itemTime - realizationTime) <= timeWindow;
              });
              
              itemsByRealization[realization.id] = realizationItems;
            });
          }
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
        
        // Формируем данные о первом товаре
        let first_article = '';
        let first_size = '';
        let first_color = '';
        
        if (firstItem) {
          first_article = firstItem.products?.article || '';
          first_size = firstItem.size_code || '';
          
          // Получаем название цвета из карты цветов
          if (firstItem.color_id && colorMap[firstItem.color_id]) {
            first_color = colorMap[firstItem.color_id];
          } else if (firstItem.color_id) {
            first_color = firstItem.color_id.toString();
          } else {
            first_color = '';
          }
        }
        
        return {
          id: item.id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          notes: item.notes || '',
          sender_name: item.sender ? `${item.sender.first_name || ''} ${item.sender.last_name || ''}`.trim() : 'Отправитель',
          recipient_name: item.recipient ? `${item.recipient.first_name || ''} ${item.recipient.last_name || ''}`.trim() : 'Получатель',
          total_items: item.total_items || 0,
          first_article,
          first_size,
          first_color,
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


      // МАКСИМАЛЬНАЯ защита от кэширования
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Last-Modified', new Date().toUTCString());
      res.setHeader('ETag', `"${Date.now()}"`);
      res.setHeader('Vary', '*');
      res.setHeader('Surrogate-Control', 'no-store');
      
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
