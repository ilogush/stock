import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'ID пользователя обязателен' });
    }

    const userId = parseInt(user_id as string);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Получаем поступления за текущий месяц (все, так как нет created_by)
    const { data: receiptsData, error: receiptsError } = await supabaseAdmin
      .from('receipts')
      .select('id, created_at')
      .gte('created_at', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('created_at', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

    if (receiptsError) {
      console.error('Ошибка получения поступлений:', receiptsError);
    }

    // Получаем количество товаров в поступлениях пользователя
    let receiptsItemsCount = 0;
    if (receiptsData && receiptsData.length > 0) {
      const receiptIds = receiptsData.map((r: any) => r.id);
      // Получаем товары по дате создания поступлений пользователя
      const { data: receiptItemsData, error: itemsError } = await supabaseAdmin
        .from('receipt_items')
        .select('qty, created_at')
        .gte('created_at', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`);

      if (!itemsError && receiptItemsData) {
        receiptsItemsCount = receiptItemsData.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
      }
    }

    // Получаем реализацию за текущий месяц (все, так как нет created_by)
    const { data: realizationData, error: realizationError } = await supabaseAdmin
      .from('realization')
      .select('id, created_at')
      .gte('created_at', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('created_at', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

    if (realizationError) {
      console.error('Ошибка получения реализации:', realizationError);
    }

    // Получаем количество товаров в реализации пользователя
    let realizationItemsCount = 0;
    if (realizationData && realizationData.length > 0) {
      const realizationIds = realizationData.map((s: any) => s.id);
      const { data: realizationItemsData, error: itemsError } = await supabaseAdmin
        .from('realization_items')
        .select('qty')
        .in('id', realizationIds);

      if (!itemsError && realizationItemsData) {
        realizationItemsCount = realizationItemsData.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
      }
    }

    return res.status(200).json({
      receipts: receiptsData?.length || 0,
      receiptsItems: receiptsItemsCount,
      realization: realizationData?.length || 0,
      realizationItems: realizationItemsCount
    });

  } catch (error) {
    console.error('Ошибка сервера:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 