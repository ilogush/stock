import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

/**
 * API endpoint для получения отчета по доходам (реализациям)
 * Поддерживает фильтрацию по датам
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { startDate, endDate, senderId, recipientId, articleSearch } = req.query;

    // Базовый запрос для получения реализаций (без JOIN)
    let realizationQuery = supabaseAdmin
      .from('realization')
      .select(`
        id,
        created_at,
        sender_id,
        recipient_id
      `)
      .order('created_at', { ascending: false });

    // Применяем фильтр по датам, если указаны
    if (startDate && typeof startDate === 'string') {
      realizationQuery = realizationQuery.gte('created_at', startDate);
    }
    if (endDate && typeof endDate === 'string') {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      realizationQuery = realizationQuery.lte('created_at', endDateTime.toISOString());
    }

    // Применяем фильтр по отправителю, если указан
    if (senderId && typeof senderId === 'string') {
      const senderIdNum = parseInt(senderId);
      if (!isNaN(senderIdNum)) {
        realizationQuery = realizationQuery.eq('sender_id', senderIdNum);
      }
    }

    // Применяем фильтр по получателю, если указан
    if (recipientId && typeof recipientId === 'string') {
      const recipientIdNum = parseInt(recipientId);
      if (!isNaN(recipientIdNum)) {
        realizationQuery = realizationQuery.eq('recipient_id', recipientIdNum);
      }
    }

    const { data: realizations, error: realizationsError } = await realizationQuery;

    if (realizationsError) {
      console.error('Ошибка при получении реализаций:', realizationsError);
      return res.status(500).json({ error: 'Ошибка при получении данных о реализациях' });
    }

    if (!realizations || realizations.length === 0) {
      return res.status(200).json({
        data: {
          totalRealizations: 0,
          totalItems: 0,
          totalQuantity: 0,
          realizations: []
        }
      });
    }

    const realizationIds = realizations.map(r => r.id);

    // Получаем пользователей (отправители и получатели)
    const userIds = new Set<number>();
    realizations.forEach((r: any) => {
      if (r.sender_id) userIds.add(r.sender_id);
      if (r.recipient_id) userIds.add(r.recipient_id);
    });
    
    const userMap: Record<number, { first_name?: string; last_name?: string }> = {};
    if (userIds.size > 0) {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name')
        .in('id', Array.from(userIds));

      if (!usersError && users) {
        users.forEach((u: any) => {
          userMap[u.id] = { first_name: u.first_name, last_name: u.last_name };
        });
      }
    }

    // Получаем товары из реализаций (без JOIN)
    let realizationItems: any[] | null = null;
    let itemsError: any = null;
    
    // Проверяем, что есть ID реализаций
    if (realizationIds.length === 0) {
      realizationItems = [];
    } else {
      // Сначала пробуем по realization_id, если колонка существует
      try {
        const { data, error } = await supabaseAdmin
          .from('realization_items')
          .select(`
            id,
            realization_id,
            product_id,
            size_code,
            color_id,
            qty
          `)
          .in('realization_id', realizationIds);
        
        realizationItems = data;
        itemsError = error;
      } catch (e: any) {
        itemsError = e;
      }
      
      // Если колонка realization_id не существует, используем связь по времени
      if (itemsError && (itemsError.code === '42703' || itemsError.message?.includes('realization_id') || itemsError.message?.includes('does not exist'))) {
        console.log('[API /api/reports/income] Колонка realization_id не существует, используем связь по времени');
        realizationItems = [];
        
        for (const realization of realizations) {
          const realizationTime = new Date(realization.created_at);
          const timeStart = new Date(realizationTime.getTime() - 300000); // минус 5 минут
          const timeEnd = new Date(realizationTime.getTime() + 300000); // плюс 5 минут
          
          const { data: timeBasedItems, error: timeError } = await supabaseAdmin
            .from('realization_items')
            .select(`
              id,
              product_id,
              size_code,
              color_id,
              qty,
              created_at
            `)
            .gte('created_at', timeStart.toISOString())
            .lte('created_at', timeEnd.toISOString());
          
          if (!timeError && timeBasedItems) {
            // Добавляем realization_id для группировки
            timeBasedItems.forEach(item => {
              (item as any).realization_id = realization.id;
            });
            realizationItems.push(...timeBasedItems);
          }
        }
        itemsError = null; // Сбрасываем ошибку, так как данные получены
      } else if (itemsError && itemsError.code !== 'PGRST116') {
        console.error('[API /api/reports/income] Ошибка при получении товаров по realization_id:', itemsError);
        return res.status(500).json({ error: 'Ошибка при получении товаров реализаций' });
      }
    }

    // Если указан поиск по артикулу, фильтруем товары
    let filteredRealizationItems = realizationItems || [];
    if (articleSearch && typeof articleSearch === 'string' && articleSearch.trim()) {
      const searchTerm = articleSearch.trim().toLowerCase();
      // Получаем product_id для товаров, артикулы которых содержат поисковый запрос
      const { data: productsByArticle } = await supabaseAdmin
        .from('products')
        .select('id')
        .ilike('article', `%${searchTerm}%`);
      
      if (productsByArticle && productsByArticle.length > 0) {
        const productIds = productsByArticle.map(p => p.id);
        filteredRealizationItems = (realizationItems || []).filter(
          (item: any) => productIds.includes(item.product_id)
        );
      } else {
        filteredRealizationItems = [];
      }
    }

    // Получаем товары отдельно
    const productIds = new Set<number>();
    const colorIds = new Set<number | null>();
    
    filteredRealizationItems.forEach((item: any) => {
      if (item.product_id) productIds.add(item.product_id);
      if (item.color_id) colorIds.add(item.color_id);
    });

    const productMap: Record<number, { id: number; name: string; article: string; brand_id: number | null; category_id: number | null }> = {};
    if (productIds.size > 0) {
      const productIdsArray = Array.from(productIds);
      // Загружаем порциями по 100 товаров
      for (let i = 0; i < productIdsArray.length; i += 100) {
        const batch = productIdsArray.slice(i, i + 100);
        const { data: products, error: productsError } = await supabaseAdmin
          .from('products')
          .select('id, name, article, brand_id, category_id')
          .in('id', batch);

        if (productsError) {
          console.error('Ошибка при получении товаров:', productsError);
        } else if (products) {
          products.forEach((p: any) => {
            productMap[p.id] = p;
          });
        }
      }
    }

    // Получаем бренды
    const brandIds = new Set<number>();
    Object.values(productMap).forEach(p => {
      if (p.brand_id) brandIds.add(p.brand_id);
    });
    const brandMap: Record<number, string> = {};
    if (brandIds.size > 0) {
      const { data: brands, error: brandsError } = await supabaseAdmin
        .from('brands')
        .select('id, name')
        .in('id', Array.from(brandIds));

      if (!brandsError && brands) {
        brands.forEach((b: any) => {
          brandMap[b.id] = b.name;
        });
      }
    }

    // Получаем цвета
    const colorMap: Record<number, string> = {};
    if (colorIds.size > 0) {
      const colorIdsArray = Array.from(colorIds).filter(id => id !== null) as number[];
      if (colorIdsArray.length > 0) {
        const { data: colors, error: colorsError } = await supabaseAdmin
          .from('colors')
          .select('id, name')
          .in('id', colorIdsArray);

        if (!colorsError && colors) {
          colors.forEach((c: any) => {
            colorMap[c.id] = c.name;
          });
        }
      }
    }

    // Группируем данные по реализациям
    const reportData = realizations.map((realization: any) => {
      const items = filteredRealizationItems.filter(
        (item: any) => item.realization_id === realization.id
      );

      const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);

      const sender = realization.sender_id ? userMap[realization.sender_id] : null;
      const recipient = realization.recipient_id ? userMap[realization.recipient_id] : null;

      return {
        id: realization.id,
        date: realization.created_at,
        sender: sender
          ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || 'Не указан'
          : 'Не указан',
        recipient: recipient
          ? `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || 'Не указан'
          : 'Не указан',
        itemsCount: items.length,
        totalQuantity,
        items: items.map((item: any) => {
          const product = productMap[item.product_id];
          return {
            product_id: item.product_id,
            product_name: product?.name || 'Неизвестный товар',
            article: product?.article || '',
            brand: product?.brand_id ? (brandMap[product.brand_id] || '') : '',
            size_code: item.size_code,
            color: item.color_id ? (colorMap[item.color_id] || 'Не указан') : 'Не указан',
            color_id: item.color_id,
            category_id: product?.category_id || null,
            qty: item.qty || 0
          };
        })
      };
    });

    const totalRealizations = reportData.length;
    const totalItems = filteredRealizationItems.length;
    const totalQuantity = reportData.reduce((sum, r) => sum + r.totalQuantity, 0);

    return res.status(200).json({
      data: {
        totalRealizations,
        totalItems,
        totalQuantity,
        realizations: reportData
      }
    });
  } catch (error: any) {
    console.error('Ошибка при формировании отчета по доходам:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

