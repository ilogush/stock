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
      // Пытаемся использовать receipt_id (если колонка существует), иначе используем временной интервал
      let itemsRows: any[] = [];
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

      if (useReceiptId) {
        // Используем прямой JOIN по receipt_id (предпочтительный метод)
        const { data: itemsData, error: itemsErr } = await supabaseAdmin
          .from('receipt_items')
          .select(`
            *,
            product:products!receipt_items_product_id_fkey(
              id, 
              name, 
              article,
              color_id,
              brand:brands!products_brand_id_fkey(name),
              category:categories!products_category_id_fkey(name)
            )
          `)
          .eq('receipt_id', receiptRow.id);
        
        if (itemsErr) {
          console.error('Ошибка при получении позиций по receipt_id:', itemsErr);
          // Fallback на time-based linking
          useReceiptId = false;
        } else {
          itemsRows = itemsData || [];
        }
      }

      if (!useReceiptId) {
        // Fallback: используем временной интервал (старый метод)
        const receiptDate = new Date(receiptRow.created_at);
        const startDate = new Date(receiptDate.getTime() - 30000); // -30 секунд
        const endDate = new Date(receiptDate.getTime() + 30000);   // +30 секунд
        
        const { data: itemsData, error: itemsErr } = await supabaseAdmin
          .from('receipt_items')
          .select(`
            *,
            product:products!receipt_items_product_id_fkey(
              id, 
              name, 
              article,
              color_id,
              brand:brands!products_brand_id_fkey(name),
              category:categories!products_category_id_fkey(name)
            )
          `)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
        
        if (itemsErr) {
          console.error('Ошибка при получении позиций:', itemsErr);
          return res.status(500).json({ error: 'Ошибка при получении позиций' });
        }
        
        itemsRows = itemsData || [];
      }

      if (itemsErr) {
        console.error('Ошибка при получении позиций:', itemsErr);
        return res.status(500).json({ error: 'Ошибка при получении позиций' });
      }

      // Оптимизированная загрузка цветов одним запросом
      const colorIds = Array.from(new Set(
        itemsRows?.map((item: any) => item.color_id).filter(Boolean) || []
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
      const enrichedItems = itemsRows.map((item: any) => ({
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