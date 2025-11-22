import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { 
  withApiMiddleware, 
  apiConfigs, 
  handleDatabaseError,
  sendErrorResponse
} from '../../../lib/unified';
import { DEFAULT_PAGE_SIZE } from '../../../lib/constants';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

/**
 * API роут для API реализации
 * Использует унифицированную систему обработки ошибок, валидации и кэширования
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { search = '', page = '1', limit } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string) || DEFAULT_PAGE_SIZE;
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
        const realizationIds = filteredItems.map((item: any) => item.id);
        
        // Получаем realization_items по realization_id
        const { data: allRealizationItems, error: itemsError } = await supabaseAdmin
          .from('realization_items')
          .select(`
            id,
            product_id,
            size_code,
            qty,
            color_id,
            created_at,
            realization_id
          `)
          .in('realization_id', realizationIds);
        
        if (itemsError) {
          log.error('Ошибка при получении товаров по realization_id', itemsError as Error, {
            endpoint: '/api/realization'
          });
          // Не возвращаем ошибку, просто продолжаем без товаров
        }
        
        // Затем получаем products отдельно
        const productIds = new Set<number>();
        if (allRealizationItems && Array.isArray(allRealizationItems)) {
          allRealizationItems.forEach(item => {
            if (item && item.product_id) {
              productIds.add(item.product_id);
            }
          });
        }
        
        let productMap: Record<number, { id: number; article: string; name: string }> = {};
        if (productIds.size > 0) {
          const { data: products } = await supabaseAdmin
            .from('products')
            .select('id, article, name')
            .in('id', Array.from(productIds));
          
          if (products) {
            products.forEach((product: any) => {
              productMap[product.id] = product;
            });
          }
        }
        
        // Добавляем информацию о продуктах к realization_items
        if (allRealizationItems && Array.isArray(allRealizationItems)) {
          allRealizationItems.forEach(item => {
            if (item && item.product_id && productMap[item.product_id]) {
              (item as any).products = productMap[item.product_id];
            }
          });
        }
        
        // Группируем по realization_id
        if (allRealizationItems && allRealizationItems.length > 0) {
          filteredItems.forEach((realization: any) => {
            const realizationItems = allRealizationItems.filter((item: any) => item.realization_id === realization.id);
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
          colors.forEach((color: any) => {
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

// Применяем rate limiting для публичного endpoint чтения
export default withRateLimit(RateLimitConfigs.READ)(
  withApiMiddleware(
    apiConfigs.list('realization'),
    handler,
    {
      logging: true,
      performance: true
    }
  )
);
