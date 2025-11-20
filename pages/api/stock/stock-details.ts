import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Создаем маппинг для строковых кодов цветов
      // Загружаем цвета для получения русских названий
      const { data: colorsData, error: colorsErr } = await supabaseAdmin
        .from('colors')
        .select('id,name');
      if (colorsErr) {
        console.error('Ошибка при загрузке цветов:', colorsErr);
      }
      const codeToName = new Map((colorsData||[]).map((c:any)=>[c.id.toString(), c.name] as const));

      // Получаем данные из поступлений (получаем все данные порциями)
      let receiptItems: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error } = await supabaseAdmin
          .from('receipt_items')
          .select(`product_id,size_code,qty,color_id, product:products(id,name,article)`)
          .order('product_id, size_code')
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Ошибка при получении данных поступлений:', error);
          return res.status(500).json({ error: 'Ошибка при получении данных поступлений' });
        }

        if (batch && batch.length > 0) {
          receiptItems = receiptItems.concat(batch);
          from += pageSize;
          hasMore = batch.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Получаем данные из реализаций (получаем все данные порциями)
      let realizationItems: any[] = [];
      from = 0;
      hasMore = true;

      while (hasMore) {
        const { data: batch, error: realizationError } = await supabaseAdmin
          .from('realization_items')
          .select(`product_id,size_code,qty,color_id`)
          .range(from, from + pageSize - 1);

        if (realizationError) {
          console.error('Ошибка при получении данных реализаций:', realizationError);
          return res.status(500).json({ error: 'Ошибка при получении данных реализаций' });
        }

        if (batch && batch.length > 0) {
          realizationItems = realizationItems.concat(batch);
          from += pageSize;
          hasMore = batch.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Агрегируем поступления
      const aggregated: Record<string, {product_id:number; name:string; article:string; size_code:string; color_id:number; qty:number}> = {};
      (receiptItems||[]).forEach((row:any)=>{
        const colorId = row.color_id; // Берем color_id из receipt_items
        const key = `${row.product_id}_${row.size_code}_${colorId}`;
        if (!aggregated[key]) {
          aggregated[key] = { product_id: row.product_id, name: row.product?.name||'Неизвестный товар', article: row.product?.article||'', size_code: row.size_code, color_id: colorId, qty: 0 };
        }
        aggregated[key].qty += row.qty||0;
      });

      // Вычитаем реализации
      (realizationItems||[]).forEach((row:any)=>{
        const colorId = row.color_id; // Берем color_id из realization_items
        const key = `${row.product_id}_${row.size_code}_${colorId}`;
        if (aggregated[key] !== undefined) {
          aggregated[key].qty = Math.max(0, aggregated[key].qty - (row.qty||0));
        }
      });

      const items = Object.values(aggregated)
        .filter((it) => (it.qty || 0) > 0) // Показываем только товары с положительным количеством
        .map((it)=>({
          product_id: it.product_id,
          name: it.name,
          article: it.article,
          size_code: it.size_code,
          color_id: it.color_id,
          color_name: codeToName.get(it.color_id.toString()) || it.color_id.toString(),
          qty: it.qty,
        }));

      return res.status(200).json({ items });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}