import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Получаем общее количество заказов
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .order('id');

      if (ordersError) {
        console.error('Ошибка при получении заказов:', ordersError);
        return res.status(500).json({ error: 'Ошибка при получении статистики заказов' });
      }

      // Подсчитываем заказы по статусам
      const stats = {
        total: orders?.length || 0,
        pending: orders?.filter((order: any) => order.status === 'pending').length || 0,
        processing: orders?.filter((order: any) => order.status === 'processing').length || 0,
        completed: orders?.filter((order: any) => order.status === 'completed').length || 0,
        cancelled: orders?.filter((order: any) => order.status === 'cancelled').length || 0
      };

      return res.status(200).json(stats);
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 