import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { 
  withApiMiddleware, 
  apiConfigs, 
  handleDatabaseError,
  sendErrorResponse
} from '../../../lib/unified';
import { DEFAULT_PAGE_SIZE } from '../../../lib/constants';

/**
 * API роут для API поступлений
 * Использует унифицированную систему обработки ошибок, валидации и кэширования
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { search = '', page = '1', limit } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string) || DEFAULT_PAGE_SIZE;
    const offset = (pageNum - 1) * limitNum;

    try {
      // Загружаем данные из базы данных с пользователями
      const { data: items, error, count } = await supabaseAdmin
        .from('receipts')
        .select(`
          *,
          creator:users!receipts_creator_id_fkey(first_name, last_name),
          transferrer:users!receipts_transferrer_id_fkey(first_name, last_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) {
        const apiError = handleDatabaseError(error, 'receipts fetch');
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

      // Загружаем товары для каждого поступления
      let itemsByReceipt: Record<number, any[]> = {};
      let totalsByReceipt: Record<number, number> = {};
      
      if (filteredItems.length > 0) {
        const receiptIds = filteredItems.map(item => item.id).filter(id => id != null);
        
        if (receiptIds.length > 0) {
          // Получаем receipt_items
          // Сначала пробуем по receipt_id, если колонка существует
          let allReceiptItems: any[] | null = null;
          let itemsError: any = null;
          
          try {
            const { data, error } = await supabaseAdmin
              .from('receipt_items')
              .select(`
                id,
                product_id,
                size_code,
                qty,
                color_id,
                created_at,
                receipt_id
              `)
              .in('receipt_id', receiptIds);
            
            allReceiptItems = data;
            itemsError = error;
          } catch (e: any) {
            itemsError = e;
          }
          
          // Если колонка receipt_id не существует, используем связь по времени
          if (itemsError && (itemsError.code === '42703' || itemsError.message?.includes('receipt_id') || itemsError.message?.includes('does not exist'))) {
            console.log('Колонка receipt_id не существует, используем связь по времени');
            allReceiptItems = [];
            
            for (const receipt of filteredItems) {
              const receiptTime = new Date(receipt.created_at);
              const timeStart = new Date(receiptTime.getTime() - 300000); // минус 5 минут
              const timeEnd = new Date(receiptTime.getTime() + 300000); // плюс 5 минут
              
              const { data: timeBasedItems, error: timeError } = await supabaseAdmin
                .from('receipt_items')
                .select(`
                  id,
                  product_id,
                  size_code,
                  qty,
                  color_id,
                  created_at
                `)
                .gte('created_at', timeStart.toISOString())
                .lte('created_at', timeEnd.toISOString());
              
              if (!timeError && timeBasedItems) {
                // Добавляем receipt_id для группировки
                timeBasedItems.forEach(item => {
                  (item as any).receipt_id = receipt.id;
                });
                allReceiptItems.push(...timeBasedItems);
              }
            }
            itemsError = null; // Сбрасываем ошибку, так как данные получены
          } else if (itemsError) {
            console.error('Ошибка при получении товаров по receipt_id:', itemsError);
            // Не возвращаем ошибку, просто продолжаем без товаров
          }
        
          // Затем получаем products отдельно
          const productIds = new Set<number>();
          if (allReceiptItems && Array.isArray(allReceiptItems)) {
            allReceiptItems.forEach(item => {
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
              products.forEach(product => {
                productMap[product.id] = product;
              });
            }
          }
          
          // Добавляем информацию о продуктах к receipt_items
          if (allReceiptItems && Array.isArray(allReceiptItems)) {
            allReceiptItems.forEach(item => {
              if (item && item.product_id && productMap[item.product_id]) {
                (item as any).products = productMap[item.product_id];
              }
            });
          }
          
          // Группируем по receipt_id
          if (allReceiptItems && Array.isArray(allReceiptItems) && allReceiptItems.length > 0) {
            filteredItems.forEach(receipt => {
              const receiptItems = allReceiptItems.filter(item => item && item.receipt_id === receipt.id);
              itemsByReceipt[receipt.id] = receiptItems;
              totalsByReceipt[receipt.id] = receiptItems.reduce((sum, item) => sum + (item.qty || 0), 0);
            });
          }
        }
      }

      // Загружаем цвета для товаров
      const allColorIds = new Set<number>();
      Object.values(itemsByReceipt).forEach(items => {
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
        const items = itemsByReceipt[item.id] || [];
        const firstItem = items[0];
        
        return {
          id: item.id,
          received_at: item.received_at,
          created_at: item.created_at,
          updated_at: item.updated_at,
          notes: item.notes || '',
          creator_name: item.creator ? `${item.creator.first_name || ''} ${item.creator.last_name || ''}`.trim() : 'Сотрудник склада',
          transferrer_name: item.transferrer ? `${item.transferrer.first_name || ''} ${item.transferrer.last_name || ''}`.trim() : 'Внешний поставщик',
          total_items: totalsByReceipt[item.id] || 0,
          first_article: firstItem?.products?.article || '',
          first_size: firstItem?.size_code || '',
          first_color: firstItem?.color_id ? colorMap[firstItem.color_id] || '' : '',
          items: items
        };
      });

      const responseData = {
        receipts: processedItems,
        pagination: {
          total: count || 0,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      };

      return res.status(200).json(responseData);

    } catch (error) {
      const apiError = handleDatabaseError(error, 'receipts list');
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
  apiConfigs.list('receipts'),
  handler,
  {
    logging: true,
    performance: true
  }
);
