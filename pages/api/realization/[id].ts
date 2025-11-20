import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAdminOnly } from '../../../lib/api/roleAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // Получаем основную информацию о реализации
      const { data: realization, error: realizationError } = await supabaseAdmin
      .from('realization')
      .select('*, sender:users!sender_id(id, first_name, last_name, email), recipient:users!recipient_id(id, first_name, last_name, email)')
      .eq('id', id)
      .single();

      if (realizationError) {
        console.error('Ошибка получения реализации:', realizationError);
        return res.status(404).json({ error: 'Реализация не найдена' });
      }

      // Получаем позиции реализации
      // Сначала пробуем по realization_id, если колонка существует
      let items: any[] | null = null;
      let itemsError: any = null;
      
      const { data, error } = await supabaseAdmin
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
        .eq('realization_id', realization.id)
        .order('created_at');
      
      // Если колонка realization_id не существует или товары не найдены, используем связь по времени
      if (error && (error.code === '42703' || error.message?.includes('realization_id') || error.message?.includes('does not exist'))) {
        console.log('Колонка realization_id не существует, используем связь по времени');
        const realizationTime = new Date(realization.created_at);
        const timeStart = new Date(realizationTime.getTime() - 300000); // минус 5 минут
        const timeEnd = new Date(realizationTime.getTime() + 300000); // плюс 5 минут
        
        const { data: timeBasedItems, error: timeError } = await supabaseAdmin
          .from('realization_items')
          .select(`
            id,
            product_id,
            size_code,
            qty,
            color_id,
            created_at
          `)
          .gte('created_at', timeStart.toISOString())
          .lte('created_at', timeEnd.toISOString())
          .order('created_at');
        
        items = timeBasedItems;
        itemsError = timeError;
      } else {
        items = data;
        itemsError = error;
      }
      
      if (itemsError && itemsError.code !== '42703') {
        console.error('Ошибка получения позиций реализации:', itemsError);
        // Не возвращаем ошибку, просто продолжаем без товаров
      }

      // Затем получаем products отдельно
      const productIds = new Set<number>();
      if (items && Array.isArray(items)) {
        items.forEach(item => {
          if (item && item.product_id) {
            productIds.add(item.product_id);
          }
        });
      }
      
      let productMap: Record<number, { id: number; name: string; article: string; brand?: { name: string }; category?: { name: string } }> = {};
      if (productIds.size > 0) {
        const { data: products, error: productsError } = await supabaseAdmin
          .from('products')
          .select(`
            id, 
            name, 
            article,
            color_id,
            brand_id,
            category_id
          `)
          .in('id', Array.from(productIds));
        
        if (!productsError && products) {
          // Получаем бренды
          const brandIds = new Set<number>();
          products.forEach(product => {
            if (product.brand_id) {
              brandIds.add(product.brand_id);
            }
          });
          
          let brandMap: Record<number, { name: string }> = {};
          if (brandIds.size > 0) {
            const { data: brands } = await supabaseAdmin
              .from('brands')
              .select('id, name')
              .in('id', Array.from(brandIds));
            
            if (brands) {
              brands.forEach(brand => {
                brandMap[brand.id] = { name: brand.name };
              });
            }
          }
          
          // Формируем productMap
          products.forEach(product => {
            productMap[product.id] = {
              id: product.id,
              name: product.name,
              article: product.article,
              brand: product.brand_id ? brandMap[product.brand_id] : undefined
            };
          });
        }
      }
      
      // Объединяем данные
      const enrichedItems = (items || []).map((item: any) => ({
        ...item,
        product: item.product_id && productMap[item.product_id] ? productMap[item.product_id] : null
      }));

      // Оптимизированная загрузка цветов одним запросом
      const colorIds = Array.from(new Set(
        enrichedItems?.map((item: any) => item.color_id).filter(Boolean) || []
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

      // Формируем ответ
      const realizationWithItems = {
        ...realization,
        sender_name: realization.sender ? 
          `${realization.sender.first_name || ''} ${realization.sender.last_name || ''}`.trim() || realization.sender.email : 
          'Не указан',
        recipient_name: realization.recipient ? 
          `${realization.recipient.first_name || ''} ${realization.recipient.last_name || ''}`.trim() || realization.recipient.email : 
          'Не указан',
        items: enrichedItems?.map((item: any) => ({
          ...item,
          product_name: item.product?.name || 'Товар не найден',
          article: item.product?.article || '',
          brand_name: item.product?.brand?.name || '',
          size_name: item.size_code, // Размер уже в правильном формате
          color_name: colorsMap[item.color_id?.toString()] || item.color_id || '—'
        })) || []
      };

      // Добавляем заголовки для предотвращения кэширования
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      return res.status(200).json(realizationWithItems);
    } catch (error) {
      console.error('Серверная ошибка:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'DELETE') {
    return withAdminOnly(async (req, res) => {
      try {
        const realizationId = parseInt(id as string);
        
        if (isNaN(realizationId)) {
          return res.status(400).json({ error: 'Неверный ID реализации' });
        }

        // Проверяем, существует ли реализация
        const { data: existingRealization, error: checkError } = await supabaseAdmin
          .from('realization')
          .select('id')
          .eq('id', realizationId)
          .single();

        if (checkError || !existingRealization) {
          return res.status(404).json({ error: 'Реализация не найдена' });
        }

        // Удаляем позиции реализации по realization_id
        const { error: itemsError } = await supabaseAdmin
          .from('realization_items')
          .delete()
          .eq('realization_id', realizationId);

        if (itemsError) {
          console.error('Ошибка удаления позиций реализации:', itemsError);
          return res.status(500).json({ error: 'Ошибка удаления позиций реализации' });
        }

        // Удаляем саму реализацию
        const { error: realizationError } = await supabaseAdmin
          .from('realization')
          .delete()
          .eq('id', realizationId);

        if (realizationError) {
          console.error('Ошибка удаления реализации:', realizationError);
          return res.status(500).json({ error: 'Ошибка удаления реализации' });
        }

        return res.status(200).json({ message: 'Реализация успешно удалена' });
      } catch (error) {
        console.error('Серверная ошибка при удалении реализации:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    })(req, res);
  }

  res.status(405).json({ error: 'Метод не поддерживается' });
} 