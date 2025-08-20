import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserIdFromCookie } from '../../../lib/actionLogger';
import { logUserAction as actionLogger } from '../../../lib/actionLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Ошибка при получении заказа:', error);
        return res.status(500).json({ error: 'Ошибка при получении заказа' });
      }

      return res.status(200).json(order);
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'DELETE') {
    return res.status(403).json({ error: 'Удаление заказов запрещено' });
  }

  if (req.method === 'PUT') {
    try {
      const { status } = req.body as { status: string };

      const { data: updated, error } = await supabaseAdmin
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Ошибка при обновлении заказа:', error);
        try {
          const actorId = getUserIdFromCookie(req);
          await actionLogger.orderUpdate(actorId || 0, `Ошибка обновления заказа ID ${id}: ${error.message}`);
        } catch {}
        return res.status(500).json({ error: 'Ошибка при обновлении заказа' });
      }

      try {
        const actorId = getUserIdFromCookie(req);
        await actionLogger.orderUpdate(actorId || 0, `Обновлен заказ ID ${id} → статус: ${status}`);
      } catch {}
      return res.status(200).json(updated);
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 