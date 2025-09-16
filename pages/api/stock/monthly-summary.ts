import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Возвращает агрегированную статистику за текущий календарный месяц (с 1-го числа)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
    const startISO = startOfMonth.toISOString();

    // 1) Количество обработанных заказов за месяц (примерная метрика)
    let ordersProcessed = 0;
    try {
      const { data: orders, error: ordersErr } = await supabaseAdmin
        .from('orders')
        .select('id')
        .gte('created_at', startISO)
        .not('status', 'eq', 'cancelled');
      if (!ordersErr) {
        ordersProcessed = orders?.length || 0;
      } else {
        console.warn('orders summary skipped:', ordersErr?.message);
      }
    } catch (e) {
      console.warn('orders summary failed:', e);
    }

    // 2) Приход за месяц (qty из receipt_items по поступлениям месяца)
    let receiptsItems = 0;
    try {
      const { data: receipts, error: receiptsErr } = await supabaseAdmin
        .from('receipts')
        .select('id')
        .gte('created_at', startISO);
      if (!receiptsErr && receipts?.length) {
        const receiptIds = receipts.map((r: any) => r.id);
        // Получаем товары по дате создания поступлений
        const { data: receiptItems, error: itemsErr } = await supabaseAdmin
          .from('receipt_items')
          .select('qty, created_at')
          .gte('created_at', startISO);
        if (!itemsErr) {
          receiptsItems = (receiptItems || []).reduce((sum: number, it: any) => sum + (it.qty || 0), 0);
        } else {
          console.warn('receipt_items monthly sum skipped:', itemsErr?.message);
        }
      }
    } catch (e) {
      console.warn('receipts monthly summary failed:', e);
    }

    // 3) Отгрузка за месяц — точнее по позициям (realization_items)
    let shippedItems = 0;
    try {
      const { data: realizations, error: realizationErr } = await supabaseAdmin
        .from('realization')
        .select('id')
        .gte('created_at', startISO);
      if (!realizationErr && realizations?.length) {
        const realizationIds = realizations.map((r: any) => r.id);
        const { data: realItems, error: realItemsErr } = await supabaseAdmin
          .from('realization_items')
          .select('qty')
          .in('id', realizationIds);
        if (!realItemsErr) {
          shippedItems = (realItems || []).reduce((sum: number, it: any) => sum + (it.qty || 0), 0);
        } else {
          console.warn('realization_items monthly sum skipped:', realItemsErr?.message);
        }
      }
    } catch (e) {
      console.warn('realizations monthly summary failed:', e);
    }

    // 4) Текущий общий остаток на складе = все поступления − все реализации
    let sumReceipts = 0;
    let sumReal = 0;
    try {
      const { data: allReceiptItems, error: allRecErr } = await supabaseAdmin
        .from('receipt_items')
        .select('qty');
      if (!allRecErr) {
        sumReceipts = (allReceiptItems || []).reduce((s: number, it: any) => s + (it.qty || 0), 0);
      } else {
        console.warn('receipt_items total sum skipped:', allRecErr?.message);
      }
    } catch (e) {
      console.warn('receipt_items total sum failed:', e);
    }
    try {
      const { data: allRealItems, error: allRealErr } = await supabaseAdmin
        .from('realization_items')
        .select('qty');
      if (!allRealErr) {
        sumReal = (allRealItems || []).reduce((s: number, it: any) => s + (it.qty || 0), 0);
      } else {
        console.warn('realization_items total sum skipped:', allRealErr?.message);
      }
    } catch (e) {
      console.warn('realization_items total sum failed:', e);
    }
    const totalInStock = Math.max(0, sumReceipts - sumReal);

    return res.status(200).json({
      ordersProcessed,
      receiptsItems,
      shippedItems,
      totalInStock
    });
  } catch (e: any) {
    console.error('Ошибка расчёта месячной статистики склада:', e);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 