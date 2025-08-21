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
        
        // 1. Сначала ищем по номеру поступления
        const { data: receiptNumbers } = await supabaseAdmin
          .from('receipts')
          .select('id')
          .ilike('receipt_number', `%${searchTerm}%`);
        
        if (receiptNumbers && receiptNumbers.length > 0) {
          // Если найдены поступления по номеру, используем только их
          searchReceiptIds = receiptNumbers.map((r: any) => r.id);
        } else {
          // 2. Если по номеру не найдено, ищем по товарам в поступлениях
          // Сначала ищем товары по артикулу
          const { data: articleProducts } = await supabaseAdmin
            .from('products')
            .select('id')
            .ilike('article', `%${searchTerm}%`);
          
          if (articleProducts && articleProducts.length > 0) {
            // Ищем поступления с этими товарами
            const productIds = articleProducts.map((p: any) => p.id);
            const { data: receiptItems } = await supabaseAdmin
              .from('receipt_items')
              .select('receipt_id')
              .in('product_id', productIds);
            
            if (receiptItems && receiptItems.length > 0) {
              searchReceiptIds = Array.from(new Set(receiptItems.map((r: any) => r.receipt_id)));
            }
          } else {
            // 3. Если по артикулу не найдено, ищем по названию товара
            const { data: nameProducts } = await supabaseAdmin
              .from('products')
              .select('id')
              .ilike('name', `%${searchTerm}%`);
            
            if (nameProducts && nameProducts.length > 0) {
              const productIds = nameProducts.map((p: any) => p.id);
              const { data: receiptItems } = await supabaseAdmin
                .from('receipt_items')
                .select('receipt_id')
                .in('product_id', productIds);
              
              if (receiptItems && receiptItems.length > 0) {
                searchReceiptIds = Array.from(new Set(receiptItems.map((r: any) => r.receipt_id)));
              }
            } else {
              // 4. Если по названию не найдено, ищем по бренду
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
                    .select('receipt_id')
                    .in('product_id', productIds);
                  
                  if (receiptItems && receiptItems.length > 0) {
                    searchReceiptIds = Array.from(new Set(receiptItems.map((r: any) => r.receipt_id)));
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
      const receiptIds = receiptsList.map((r: any) => r.id);
      let itemsData: any[] = [];
      
      if (receiptIds.length > 0) {
        const { data: items } = await supabaseAdmin
          .from('receipt_items')
          .select(`
            receipt_id,
            product_id,
            size_code,
            color_id,
            qty,
            products!receipt_items_product_id_fkey(id, article)
          `)
          .in('receipt_id', receiptIds);

        itemsData = items || [];
      }

      // Получаем справочники цветов
      const colorIds = Array.from(new Set(
        itemsData.map((item: any) => item.color_id).filter(Boolean)
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
        const receiptId = item.receipt_id;
        if (!itemsByReceipt[receiptId]) {
          itemsByReceipt[receiptId] = [];
        }

        const itemData = {
          article: item.products?.article || '—',
          size: item.size_code || '—',
          color: colorsMap[item.color_id] || '—',
          qty: item.qty || 0
        };

        itemsByReceipt[receiptId].push(itemData);
        totalsByReceipt[receiptId] = (totalsByReceipt[receiptId] || 0) + (item.qty || 0);
      });

      // Формируем итоговые данные
      const enrichedReceipts = receiptsList.map((receipt: any) => ({
        id: receipt.id,
        receipt_number: receipt.receipt_number,
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