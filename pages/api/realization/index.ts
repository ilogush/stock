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

      // Базовый запрос реализаций
      let query = supabaseAdmin
        .from('realization')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // 🔍 НОВЫЙ ПОИСК по реализации
      let searchRealizationIds: number[] = [];
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = search.trim().toLowerCase();
        
        // 1. Сначала ищем по номеру реализации
        const { data: realizationNumbers } = await supabaseAdmin
          .from('realization')
          .select('id')
          .ilike('realization_number', `%${searchTerm}%`);
        
        if (realizationNumbers && realizationNumbers.length > 0) {
          // Если найдены реализации по номеру, используем только их
          searchRealizationIds = realizationNumbers.map((r: any) => r.id);
        } else {
          // 2. Если по номеру не найдено, ищем по товарам в реализации
          // Сначала ищем товары по артикулу
          const { data: articleProducts } = await supabaseAdmin
            .from('products')
            .select('id')
            .ilike('article', `%${searchTerm}%`);
          
          if (articleProducts && articleProducts.length > 0) {
            // Ищем реализации с этими товарами
            const productIds = articleProducts.map((p: any) => p.id);
            const { data: realizationItems } = await supabaseAdmin
              .from('realization_items')
              .select('realization_id')
              .in('product_id', productIds);
            
            if (realizationItems && realizationItems.length > 0) {
              searchRealizationIds = Array.from(new Set(realizationItems.map((r: any) => r.realization_id)));
            }
          } else {
            // 3. Если по артикулу не найдено, ищем по названию товара
            const { data: nameProducts } = await supabaseAdmin
              .from('products')
              .select('id')
              .ilike('name', `%${searchTerm}%`);
            
            if (nameProducts && nameProducts.length > 0) {
              const productIds = nameProducts.map((p: any) => p.id);
              const { data: realizationItems } = await supabaseAdmin
                .from('realization_items')
                .select('realization_id')
                .in('product_id', productIds);
              
              if (realizationItems && realizationItems.length > 0) {
                searchRealizationIds = Array.from(new Set(realizationItems.map((r: any) => r.realization_id)));
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
                  const { data: realizationItems } = await supabaseAdmin
                    .from('realization_items')
                    .select('realization_id')
                    .in('product_id', productIds);
                  
                  if (realizationItems && realizationItems.length > 0) {
                    searchRealizationIds = Array.from(new Set(realizationItems.map((r: any) => r.realization_id)));
                  }
                }
              }
            }
          }
        }
        
        // Применяем фильтр по найденным реализациям
        if (searchRealizationIds.length > 0) {
          query = query.in('id', searchRealizationIds);
        } else {
          // Если ничего не найдено, возвращаем пустой результат
          query = query.eq('id', -1);
        }
      }

      // Получаем данные с пагинацией
      const { data: realizations, error, count } = await query
        .range(offset, offset + limitNum - 1);

      if (error) {
        console.error('Ошибка получения реализаций:', error);
        return res.status(500).json({ 
          error: 'Ошибка получения реализаций',
          realizations: [],
          pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 }
        });
      }

      const realizationsList = realizations || [];
      const total = count || 0;

      // Получаем данные о пользователях
      const userIds = Array.from(new Set(
        realizationsList.flatMap((r: any) => [r.sender_id, r.recipient_id]).filter(Boolean)
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

      // Получаем данные о товарах в реализациях
      const realizationIds = realizationsList.map((r: any) => r.id);
      let itemsData: any[] = [];
      
      if (realizationIds.length > 0) {
        const { data: items } = await supabaseAdmin
          .from('realization_items')
          .select(`
            realization_id,
            product_id,
            size_code,
            color_id,
            qty,
            products!realization_items_product_id_fkey(id, article)
          `)
          .in('realization_id', realizationIds);

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

      // Группируем товары по реализациям
      const itemsByRealization: Record<string, any[]> = {};
      const totalsByRealization: Record<string, number> = {};

      itemsData.forEach((item: any) => {
        const realizationId = item.realization_id;
        if (!itemsByRealization[realizationId]) {
          itemsByRealization[realizationId] = [];
        }

        const itemData = {
          article: item.products?.article || '—',
          size: item.size_code || '—',
          color: colorsMap[item.color_id] || '—',
          qty: item.qty || 0
        };

        itemsByRealization[realizationId].push(itemData);
        totalsByRealization[realizationId] = (totalsByRealization[realizationId] || 0) + (item.qty || 0);
      });

      // Формируем итоговые данные
      const enrichedRealizations = realizationsList.map((realization: any) => ({
        id: realization.id,
        realization_number: realization.realization_number,
        shipped_at: realization.shipped_at,
        created_at: realization.created_at,
        updated_at: realization.updated_at,
        notes: realization.notes,
        sender_name: (() => {
          const user = usersMap[realization.sender_id];
          return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '—';
        })(),
        recipient_name: (() => {
          const user = usersMap[realization.recipient_id];
          return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '—';
        })(),
        total_items: totalsByRealization[realization.id] || 0,
        items: itemsByRealization[realization.id] || [],
        first_article: itemsByRealization[realization.id]?.[0]?.article || '—',
        first_size: itemsByRealization[realization.id]?.[0]?.size || '—',
        first_color: itemsByRealization[realization.id]?.[0]?.color || '—'
      }));

      const totalPages = Math.ceil(total / limitNum);

      return res.status(200).json({
        realizations: enrichedRealizations,
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
        realizations: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
      });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
});