import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const ONLINE_WINDOW_MINUTES = 15;
    const since = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000).toISOString();

    const { count, error } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', since);

    if (error) {
      console.error('Ошибка подсчёта онлайн-пользователей:', error);
      return res.status(500).json({ error: 'Ошибка базы данных' });
    }

    return res.status(200).json({ online: count || 0 });
  } catch (err) {
    console.error('Ошибка сервера:', err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 