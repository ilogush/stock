import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { validateStockForItems } from '../../../lib/stockValidator';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { normalizeColorId, normalizeSizeCode } from '../../../lib/utils/normalize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { customer_name, customer_phone, items, notes } = req.body;

      // Валидация входных данных
      if (!customer_name || !customer_phone || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: 'Неверные данные заказа',
          details: ['Имя клиента, телефон и товары обязательны']
        });
      }

      // Проверяем остатки на складе
      // Нормализуем размеры для валидации
      const normalizedItems = items.map((item: any) => ({
        ...item,
        size_code: normalizeSizeCode(item.size_code), // Нормализуем размер
        color_id: normalizeColorId(item.color_id) // Нормализуем цвет
      }));
      
      const stockValidation = await validateStockForItems(normalizedItems);
      
      if (!stockValidation.valid) {
        return res.status(400).json({
          error: 'Недостаточно товара на складе',
          details: stockValidation.errors.map(err => err.message),
          stockErrors: stockValidation.errors
        });
      }

      // Создаем заказ
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          customer_name: customer_name.trim(),
          customer_phone: customer_phone.trim(),
          status: 'pending',
          notes: notes || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) {
        console.error('Ошибка создания заказа:', orderError);
        return res.status(500).json({ error: 'Ошибка создания заказа' });
      }

      // Создаем позиции заказа
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        size_code: normalizeSizeCode(item.size_code), // Нормализуем размер
        color_id: normalizeColorId(item.color_id), // Нормализуем цвет
        qty: item.qty,
        price: item.price || 0
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Ошибка создания позиций заказа:', itemsError);
        return res.status(500).json({ error: 'Ошибка создания позиций заказа' });
      }

      // Остатки теперь рассчитываются на лету из receipt_items - realization_items
      // Нет необходимости обновлять отдельную таблицу stock

      // Логируем создание заказа
      const userId = getUserIdFromCookie(req);
      await logUserAction(userId, 'Создание заказа', 'success', `Создан заказ №${order.id} для ${customer_name}`);

      return res.status(201).json({
        order,
        message: 'Заказ успешно создан'
      });

    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}
