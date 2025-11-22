
import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';

export default withPermissions(
  RoleChecks.canViewRealization,
  'Просмотр реализации доступен только администраторам, менеджерам и кладовщикам'
)(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { page = '1', limit = '20', search } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // 🚀 ОПТИМИЗИРОВАННЫЙ ЗАПРОС - один JOIN вместо множественных
      let query = supabaseAdmin
        .from('realization')
        .select(`
          *,
          sender:users!realization_sender_id_fkey(id, first_name, last_name, email),
          recipient:users!realization_recipient_id_fkey(id, first_name, last_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // 🚀 ОПТИМИЗИРОВАННЫЙ ПОИСК
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = search.trim();
        
        // Ищем реализации через товары одним запросом
        const { data: matchingProducts } = await supabaseAdmin
          .from('products')
          .select('id')
          .or(`
            article.ilike.%${searchTerm}%,
            name.ilike.%${searchTerm}%,
            brand_id.in.(select id from brands where name.ilike.%${searchTerm}%),
            color_id.in.(select id from colors where name.ilike.%${searchTerm}%)
          `);

        if (matchingProducts && matchingProducts.length > 0) {
          const productIds = matchingProducts.map((p: any) => p.id);
          
          // Ищем реализации с этими товарами
          const { data: realizationItems } = await supabaseAdmin
            .from('realization_items')
            .select('realization_id')
            .in('product_id', productIds);

          if (realizationItems && realizationItems.length > 0) {
            const realizationIds = Array.from(new Set(realizationItems.map((r: any) => r.realization_id)));
            query = query.in('id', realizationIds);
          } else {
            // Если нет товаров, возвращаем пустой результат
            return res.status(200).json({
              realizations: [],
              pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 }
            });
          }
        } else {
          // Если нет товаров, возвращаем пустой результат
          return res.status(200).json({
            realizations: [],
            pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 }
          });
        }
      }

      // Применяем пагинацию
      query = query.range(offset, offset + limitNum - 1);

      const { data: realizations, error, count } = await query;

      if (error) {
        console.error('Ошибка получения реализаций:', error);
        return res.status(500).json({ error: 'Ошибка получения реализаций' });
      }

      // Получаем позиции реализаций одним запросом по realization_id
      const realizationIds = realizations?.map((r: any) => r.id) || [];
      
      if (realizationIds.length === 0) {
        return res.status(200).json({
          realizations: [],
          pagination: {
            total: count || 0,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil((count || 0) / limitNum)
          }
        });
      }

      const { data: realizationItems, error: itemsError } = await supabaseAdmin
        .from('realization_items')
        .select(`
          realization_id,
          product_id,
          size_code,
          qty,
          product:products!realization_items_product_id_fkey(
            id,
            name,
            article,
            color:colors!products_color_id_fkey(name)
          )
        `)
        .in('realization_id', realizationIds);

      if (itemsError) {
        console.error('Ошибка получения позиций реализаций:', itemsError);
        return res.status(500).json({ error: 'Ошибка получения позиций реализаций' });
      }

      // Группируем позиции по реализациям
      const itemsByRealization = new Map<number, any[]>();
      (realizationItems || []).forEach((item: any) => {
        if (!itemsByRealization.has(item.realization_id)) {
          itemsByRealization.set(item.realization_id, []);
        }
        itemsByRealization.get(item.realization_id)!.push(item);
      });

      // Добавляем позиции к реализациям
      const realizationsWithItems = realizations?.map((realization: any) => ({
        ...realization,
        items: itemsByRealization.get(realization.id) || []
      })) || [];

      return res.status(200).json({
        realizations: realizationsWithItems,
        pagination: {
          total: count || 0,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil((count || 0) / limitNum)
        }
      });

    } catch (error) {
      console.error('Ошибка API реализаций:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
});
