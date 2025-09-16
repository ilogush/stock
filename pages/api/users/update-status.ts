import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'ID пользователя обязателен' });
    }

    // Обновляем updated_at для указания активности пользователя
    const { error } = await supabaseAdmin
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', user_id);

    if (error) {
      console.error('Ошибка обновления статуса пользователя:', error);
      return res.status(500).json({ error: 'Ошибка базы данных' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Ошибка сервера:', err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 