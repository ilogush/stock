import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // получаем поступление
      const { data: receiptRow, error: recErr } = await supabaseAdmin
        .from('receipts')
        .select('*')
        .eq('id', parseInt(id as string))
        .single();

      if (recErr || !receiptRow) {
        console.error('Ошибка при получении поступления:', recErr);
        return res.status(500).json({ error: 'Ошибка при получении поступления' });
      }

      // получаем позиции
      const { data: itemsRows, error: itemsErr } = await supabaseAdmin
        .from('receipt_items')
        .select('id, product_id, size_code, color_id, qty')
        .eq('receipt_id', parseInt(id as string));

      if (itemsErr) {
        console.error('Ошибка при получении позиций:', itemsErr);
        return res.status(500).json({ error: 'Ошибка при получении позиций' });
      }

      // Загружаем цвета для получения русских названий
      const { data: colorsData, error: colorsErr } = await supabaseAdmin
        .from('colors')
        .select('id,name');
      if (colorsErr) {
        console.error('Ошибка при загрузке цветов:', colorsErr);
      }
      const colorMapping = Object.fromEntries((colorsData||[]).map((c:any)=>[c.id.toString(), c.name]));

      const receipt = {
        ...receiptRow,
        transferrer_name: 'Не указан',
        creator_name: 'Не указан',
        items: (itemsRows || []).map((item: any) => ({
          ...item,
          color_name: colorMapping[item.color_id?.toString()] || item.color_id?.toString()
        })),
      };

      return res.status(200).json({ receipt });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 