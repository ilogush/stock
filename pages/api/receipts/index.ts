import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { 
  withApiMiddleware, 
  apiConfigs, 
  handleDatabaseError,
  sendErrorResponse
} from '../../../lib/unified';

/**
 * API роут для API поступлений
 * Использует унифицированную систему обработки ошибок, валидации и кэширования
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { search = '', page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
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
        const receiptIds = filteredItems.map(item => item.id);
        
        // Пытаемся использовать receipt_id (если колонка существует)
        // Проверяем наличие колонки через попытку запроса
        let useReceiptId = false;
        try {
          const { data: testData, error: testError } = await supabaseAdmin
            .from('receipt_items')
            .select('receipt_id')
            .limit(1);
          
          if (!testError && testData !== null) {
            useReceiptId = true;
          }
        } catch (e) {
          // Колонка не существует, используем time-based linking
        }

        let allReceiptItems: any[] = [];

        if (useReceiptId) {
          // Используем прямой JOIN по receipt_id (предпочтительный метод)
          const { data: itemsData, error: itemsError } = await supabaseAdmin
            .from('receipt_items')
            .select(`
              id,
              product_id,
              size_code,
              qty,
              color_id,
              created_at,
              receipt_id,
              products!receipt_items_product_id_fkey(
                id, 
                article, 
                name
              )
            `)
            .in('receipt_id', receiptIds);
          
          if (itemsError) {
            console.error('Ошибка при получении товаров по receipt_id:', itemsError);
            // Fallback на time-based linking
            useReceiptId = false;
          } else {
            allReceiptItems = itemsData || [];
          }
        }

        if (!useReceiptId) {
          // Fallback: используем time-based linking (старый метод)
          const dates = filteredItems.map(item => new Date(item.created_at));
          const minDate = new Date(Math.min(...dates.map(d => d.getTime())) - 60 * 60 * 1000); // -1 час
          const maxDate = new Date(Math.max(...dates.map(d => d.getTime())) + 60 * 60 * 1000); // +1 час
          
          // Загружаем все товары за период (без лимита для больших поступлений)
          let from = 0;
          const pageSize = 1000;
          let hasMore = true;
          
          while (hasMore) {
            const { data: batch, error: itemsError } = await supabaseAdmin
              .from('receipt_items')
              .select(`
                id,
                product_id,
                size_code,
                qty,
                color_id,
                created_at,
                products!receipt_items_product_id_fkey(
                  id, 
                  article, 
                  name
                )
              `)
              .gte('created_at', minDate.toISOString())
              .lte('created_at', maxDate.toISOString())
              .range(from, from + pageSize - 1);
            
            if (itemsError) {
              console.error('Ошибка при получении товаров:', itemsError);
              break;
            }
            
            if (batch && batch.length > 0) {
              allReceiptItems = allReceiptItems.concat(batch);
              from += pageSize;
              hasMore = batch.length === pageSize;
            } else {
              hasMore = false;
            }
          }
        }
        
        if (allReceiptItems.length > 0) {
          if (useReceiptId) {
            // Группируем по receipt_id
            filteredItems.forEach(receipt => {
              const receiptItems = allReceiptItems.filter(item => item.receipt_id === receipt.id);
              itemsByReceipt[receipt.id] = receiptItems;
              totalsByReceipt[receipt.id] = receiptItems.reduce((sum, item) => sum + (item.qty || 0), 0);
            });
          } else {
            // Сопоставляем товары с поступлениями по точному времени (с допуском ±10 минут)
            filteredItems.forEach(receipt => {
              const receiptTime = new Date(receipt.created_at).getTime();
              const timeWindow = 10 * 60 * 1000; // 10 минут в миллисекундах
              
              const receiptItems = allReceiptItems.filter(item => {
                const itemTime = new Date(item.created_at).getTime();
                return Math.abs(itemTime - receiptTime) <= timeWindow;
              });
              
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
