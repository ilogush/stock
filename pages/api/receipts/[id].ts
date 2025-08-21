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

      // получаем позиции
      const { data: itemsRows, error: itemsErr } = await supabaseAdmin
        .from('receipt_items')
        .select('*')
        .eq('receipt_id', parseInt(id as string));

      if (itemsErr) {
        console.error('Ошибка при получении позиций:', itemsErr);
        return res.status(500).json({ error: 'Ошибка при получении позиций' });
      }

      // Получаем дополнительную информацию о товарах и цветах
      const productIds = Array.from(new Set(itemsRows.map((item: any) => item.product_id)));
      const colorIds = Array.from(new Set(itemsRows.map((item: any) => item.color_id).filter(Boolean)));

      // Загружаем товары
      let productsMap: Record<string, any> = {};
      if (productIds.length > 0) {
        const { data: products } = await supabaseAdmin
          .from('products')
          .select('id, name, article, brand:brands(name)')
          .in('id', productIds);
        
        productsMap = Object.fromEntries(
          (products || []).map((p: any) => [p.id.toString(), p])
        );
      }

      // Загружаем цвета
      let colorsMap: Record<string, any> = {};
      if (colorIds.length > 0) {
        const { data: colors } = await supabaseAdmin
          .from('colors')
          .select('id, name')
          .in('id', colorIds);
        
        colorsMap = Object.fromEntries(
          (colors || []).map((c: any) => [c.id.toString(), c])
        );
      }

      // Обогащаем позиции данными
      const enrichedItems = itemsRows.map((item: any) => ({
        ...item,
        product: productsMap[item.product_id.toString()],
        color: colorsMap[item.color_id?.toString()]
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