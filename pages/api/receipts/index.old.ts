import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';

export default withPermissions(
  RoleChecks.canViewReceipts,
  'Просмотр поступлений доступен только администраторам, менеджерам и кладовщикам'
)(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { page = '1', limit = '20', search } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Базовый запрос поступлений
      let query = supabaseAdmin
        .from('receipts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // 🔍 НОВЫЙ ПОИСК по поступлениям
      let searchReceiptIds: number[] = [];
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = search.trim().toLowerCase();
        
        // Ищем по товарам в поступлениях
        // Сначала ищем товары по артикулу
        const { data: articleProducts } = await supabaseAdmin
          .from('products')
          .select('id')
          .ilike('article', `%${searchTerm}%`);
        
        if (articleProducts && articleProducts.length > 0) {
          // Ищем поступления с этими товарами
          const productIds = articleProducts.map((p: any) => p.id);
          // Ищем поступления, которые содержат эти товары
          // Ищем поступления, которые содержат эти товары
          const { data: receiptItems } = await supabaseAdmin
            .from('receipt_items')
            .select('id')
            .in('product_id', productIds);
          
          if (receiptItems && receiptItems.length > 0) {
            searchReceiptIds = Array.from(new Set(receiptItems.map((r: any) => r.id)));
          }
        } else {
          // Если по артикулу не найдено, ищем по названию товара
          const { data: nameProducts } = await supabaseAdmin
            .from('products')
            .select('id')
            .ilike('name', `%${searchTerm}%`);
          
          if (nameProducts && nameProducts.length > 0) {
            const productIds = nameProducts.map((p: any) => p.id);
            const { data: receiptItems } = await supabaseAdmin
              .from('receipt_items')
              .select('id')
              .in('product_id', productIds);
            
            if (receiptItems && receiptItems.length > 0) {
              searchReceiptIds = Array.from(new Set(receiptItems.map((r: any) => r.id)));
            }
          } else {
            // Если по названию не найдено, ищем по бренду
            const { data: brandProducts } = await supabaseAdmin
              .from('products')
              .select('id, brand:brands(name)')
              .ilike('brand.name', `%${searchTerm}%`);
            
            if (brandProducts && brandProducts.length > 0) {
              const filteredBrandProducts = brandProducts.filter((p: any) => 
                p.brand && p.brand.name && p.brand.name.toLowerCase().includes(searchTerm)
              );
              if (filteredBrandProducts.length > 0) {
                const productIds = filteredBrandProducts.map((p: any) => p.id);
                const { data: receiptItems } = await supabaseAdmin
                  .from('receipt_items')
                  .select('id')
                  .in('product_id', productIds);
                
                if (receiptItems && receiptItems.length > 0) {
                  searchReceiptIds = Array.from(new Set(receiptItems.map((r: any) => r.id)));
                }
              }
            }
            
            // Если по бренду не найдено, ищем по цвету
            if (searchReceiptIds.length === 0) {
              // Сначала ищем цвета по названию
              const { data: matchingColors } = await supabaseAdmin
                .from('colors')
                .select('id')
                .ilike('name', `%${searchTerm}%`);
              
              if (matchingColors && matchingColors.length > 0) {
                // Получаем ID цветов, которые подходят под поиск
                const matchingColorIds = matchingColors.map((c: any) => c.id);
                
                // Теперь ищем товары с этими цветами
                const { data: colorProducts } = await supabaseAdmin
                  .from('products')
                  .select('id')
                  .in('color_id', matchingColorIds);
                
                if (colorProducts && colorProducts.length > 0) {
                  const productIds = colorProducts.map((p: any) => p.id);
                  const { data: receiptItems } = await supabaseAdmin
                    .from('receipt_items')
                    .select('id')
                    .in('product_id', productIds);
                  
                  if (receiptItems && receiptItems.length > 0) {
                    searchReceiptIds = Array.from(new Set(receiptItems.map((r: any) => r.id)));
                  }
                }
              }
            }
          }
        }
        
        // Применяем фильтр по найденным поступлениям
        if (searchReceiptIds.length > 0) {
          query = query.in('id', searchReceiptIds);
        } else {
          // Если ничего не найдено, возвращаем пустой результат
          query = query.eq('id', -1);
        }
      }

      // Получаем данные с пагинацией
      const { data: receipts, error, count } = await query
        .range(offset, offset + limitNum - 1);

      if (error) {
        console.error('Ошибка получения поступлений:', error);
        return res.status(500).json({ 
          error: 'Ошибка получения поступлений',
          receipts: [],
          pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 }
        });
      }

      const receiptsList = receipts || [];
      const total = count || 0;

      // Получаем данные о пользователях
      const userIds = Array.from(new Set(
        receiptsList.flatMap((r: any) => [r.transferrer_id, r.creator_id]).filter(Boolean)
      ));

      let usersMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds);
        
        usersMap = Object.fromEntries(
          (users || []).map((u: any) => [u.id, u])
        );
      }

      // Получаем данные о товарах в поступлениях
      // Поскольку нет поля receipt_id, получаем все товары и группируем по дате
      let itemsData: any[] = [];
      
      if (receiptsList.length > 0) {
        // Получаем все товары за период поступлений
        const receiptDates = receiptsList.map((r: any) => new Date(r.created_at));
        const minDate = new Date(Math.min(...receiptDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...receiptDates.map(d => d.getTime())));
        
        // Расширяем диапазон на 5 минут в каждую сторону для точности
        minDate.setMinutes(minDate.getMinutes() - 5);
        maxDate.setMinutes(maxDate.getMinutes() + 5);
        
        const { data: items } = await supabaseAdmin
          .from('receipt_items')
          .select(`
            id,
            product_id,
            size_code,
            qty,
            created_at,
            products!receipt_items_product_id_fkey(id, article, color_id)
          `)
          .gte('created_at', minDate.toISOString())
          .lte('created_at', maxDate.toISOString());

        itemsData = items || [];
      }

      // Получаем справочники цветов
      const colorIds = Array.from(new Set(
        itemsData.map((item: any) => item.products?.color_id).filter(Boolean)
      ));
      
      let colorsMap: Record<string, string> = {};
      if (colorIds.length > 0) {
        const { data: colors } = await supabaseAdmin
          .from('colors')
          .select('id, name')
          .in('id', colorIds);
        
        colorsMap = Object.fromEntries(
          (colors || []).map((c: any) => [c.id.toString(), c.name])
        );
      }

      // Группируем товары по поступлениям
      const itemsByReceipt: Record<string, any[]> = {};
      const totalsByReceipt: Record<string, number> = {};

      itemsData.forEach((item: any) => {
        // Находим поступление, к которому относится этот товар, по дате создания
        const itemDate = new Date(item.created_at);
        const matchingReceipt = receiptsList.find((receipt: any) => {
          const receiptDate = new Date(receipt.created_at);
          const timeDiff = Math.abs(itemDate.getTime() - receiptDate.getTime());
          return timeDiff <= 60000; // 1 минута для более точной связи
        });
        
        if (matchingReceipt) {
          const receiptId = matchingReceipt.id;
          if (!itemsByReceipt[receiptId]) {
            itemsByReceipt[receiptId] = [];
          }

        const itemData = {
          article: item.products?.article || '—',
          size: item.size_code || '—',
          color: colorsMap[item.products?.color_id] || '—',
          qty: item.qty || 0
        };

          itemsByReceipt[receiptId].push(itemData);
          totalsByReceipt[receiptId] = (totalsByReceipt[receiptId] || 0) + (item.qty || 0);
        }
      });

      // Формируем итоговые данные
      const enrichedReceipts = receiptsList.map((receipt: any) => ({
        id: receipt.id,
        received_at: receipt.received_at,
        created_at: receipt.created_at,
        updated_at: receipt.updated_at,
        notes: receipt.notes,
        transferrer_name: (() => {
          const user = usersMap[receipt.transferrer_id];
          return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Внешний поставщик';
        })(),
        creator_name: (() => {
          const user = usersMap[receipt.creator_id];
          return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Сотрудник склада';
        })(),
        total_items: totalsByReceipt[receipt.id] || 0,
        items: itemsByReceipt[receipt.id] || [],
        first_article: itemsByReceipt[receipt.id]?.[0]?.article || '—',
        first_size: itemsByReceipt[receipt.id]?.[0]?.size || '—',
        first_color: itemsByReceipt[receipt.id]?.[0]?.color || '—'
      }));

      const totalPages = Math.ceil(total / limitNum);

      return res.status(200).json({
        receipts: enrichedReceipts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages
        }
      });

    } catch (error: any) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        receipts: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
      });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
});