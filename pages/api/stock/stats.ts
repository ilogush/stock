import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Получаем данные из поступлений
      const { data: receiptItems, error: receiptError } = await supabaseAdmin
        .from('receipt_items')
        .select('product_id, qty');

      if (receiptError) {
        console.error('Ошибка при получении поступлений:', receiptError);
        return res.status(500).json({ error: 'Ошибка при получении статистики' });
      }

      // Получаем данные из реализаций
      const { data: realizationItems, error: realizationError } = await supabaseAdmin
        .from('realization_items')
        .select('product_id, qty');

      if (realizationError) {
        console.error('Ошибка при получении реализаций:', realizationError);
        return res.status(500).json({ error: 'Ошибка при получении статистики' });
      }

      // Агрегируем поступления
      const receiptAggregated: Record<number, number> = {};
      (receiptItems || []).forEach((item: any) => {
        if (!receiptAggregated[item.product_id]) {
          receiptAggregated[item.product_id] = 0;
        }
        receiptAggregated[item.product_id] += item.qty || 0;
      });

      // Вычитаем реализации
      (realizationItems || []).forEach((item: any) => {
        if (receiptAggregated[item.product_id] !== undefined) {
          receiptAggregated[item.product_id] = Math.max(0, receiptAggregated[item.product_id] - (item.qty || 0));
        }
      });

      // Фильтруем только положительные остатки
      const availableStock = Object.entries(receiptAggregated)
        .filter(([_, qty]) => qty > 0)
        .map(([productId, qty]) => ({ product_id: parseInt(productId), qty }));

      const totalQuantity = availableStock.reduce((sum, item) => sum + item.qty, 0);
      const uniqueProductIds = new Set(availableStock.map(item => item.product_id));

      return res.status(200).json({
        totalQuantity,
        uniqueProducts: uniqueProductIds.size,
        totalPositions: availableStock.length
      });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}