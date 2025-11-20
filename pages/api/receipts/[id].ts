import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // получаем поступление с данными пользователей
      const { data: receiptRow, error: recErr } = await supabaseAdmin
        .from('receipts')
        .select(`
          *,
          transferrer:users!receipts_transferrer_id_fkey(first_name, last_name, email),
          creator:users!receipts_creator_id_fkey(first_name, last_name, email)
        `)
        .eq('id', parseInt(id as string))
        .single();

      if (recErr || !receiptRow) {
        console.error('Ошибка при получении поступления:', recErr);
        return res.status(500).json({ error: 'Ошибка при получении поступления' });
      }

      // Получаем позиции поступления
      // Сначала пробуем по receipt_id, если колонка существует
      let itemsRows: any[] | null = null;
      let itemsErr: any = null;
      
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
        .eq('receipt_id', receiptRow.id);
      
      // Если колонка receipt_id не существует, используем связь по времени
      if (error && (error.code === '42703' || error.message?.includes('receipt_id') || error.message?.includes('does not exist'))) {
        console.log('Колонка receipt_id не существует, используем связь по времени');
        const receiptTime = new Date(receiptRow.created_at);
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
        
        itemsRows = timeBasedItems;
        itemsErr = timeError;
      } else {
        itemsRows = data;
        itemsErr = error;
      }
      
      if (itemsErr && itemsErr.code !== '42703') {
        console.error('Ошибка при получении позиций:', itemsErr);
        // Не возвращаем ошибку, просто продолжаем без товаров
      }

      // Затем получаем products отдельно
      const productIds = new Set<number>();
      if (itemsRows && Array.isArray(itemsRows)) {
        itemsRows.forEach(item => {
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
      const enrichedItemsRows = (itemsRows || []).map((item: any) => ({
        ...item,
        product: item.product_id && productMap[item.product_id] ? productMap[item.product_id] : null
      }));

      // Оптимизированная загрузка цветов одним запросом
      const colorIds = Array.from(new Set(
        enrichedItemsRows?.map((item: any) => item.color_id).filter(Boolean) || []
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

      // Обогащаем позиции данными
      const enrichedItems = enrichedItemsRows.map((item: any) => ({
        ...item,
        color_name: colorsMap[item.color_id?.toString()] || item.color_id || '—'
      }));

      // Форматируем имена пользователей
      const getDisplayName = (user: any) => {
        if (!user) return 'Не указан';
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        if (fullName) return fullName;
        const local = (user.email || '').split('@')[0];
        const pretty = local
          .split(/[._-]+/)
          .filter(Boolean)
          .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        return pretty || local || 'Не указан';
      };

      const receipt = {
        ...receiptRow,
        received_at: receiptRow.created_at, // используем created_at как received_at
        transferrer_name: getDisplayName(receiptRow.transferrer),
        creator_name: getDisplayName(receiptRow.creator),
        items: enrichedItems,
      };

      return res.status(200).json({ receipt });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 