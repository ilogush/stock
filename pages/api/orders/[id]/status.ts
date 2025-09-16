import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { logUserAction } from '../../../../lib/actionLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const statusLabels = {
    'new': 'Новый',
    'processing': 'В обработке',
    'shipped': 'Отправлен',
    'delivered': 'Доставлен',
    'cancelled': 'Отменен'
  };

  try {
    const { id } = req.query;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ error: 'ID и статус обязательны' });
    }

    // Валидация статуса
    const validStatuses = ['new', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    // Получаем текущий заказ для логирования старого статуса
    const { data: currentOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('status, order_number')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Ошибка получения заказа:', fetchError);
      return res.status(500).json({ error: 'Ошибка получения заказа' });
    }

    // Обновляем статус заказа
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Ошибка обновления статуса:', error);
      return res.status(500).json({ error: 'Ошибка обновления статуса заказа' });
    }

    // Логируем действие смены статуса
    try {
      const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : 1;
      const oldStatus = currentOrder?.status || 'unknown';
      const newStatus = status;
      const orderNumber = currentOrder?.order_number || `ЗАК-${String(id).padStart(6, '0')}`;
      
      await logUserAction.orderUpdate(userId, 
        `Изменение статуса заказа №${orderNumber} с "${statusLabels[oldStatus as keyof typeof statusLabels] || oldStatus}" на "${statusLabels[newStatus as keyof typeof statusLabels] || newStatus}"`
      );
      
      // Логирование изменения статуса заказа ${orderNumber}: ${oldStatus} → ${newStatus}
    } catch (logError) {
      console.error('❌ Ошибка логирования действия:', logError);
    }

    return res.status(200).json({ 
      success: true, 
      order: data,
      message: `Статус заказа изменен на "${statusLabels[status as keyof typeof statusLabels] || status}"`
    });

  } catch (error) {
    console.error('Ошибка API статуса заказа:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 