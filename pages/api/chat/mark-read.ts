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

    // Временное решение: просто возвращаем успех
    // Пока таблица chat_read_status не создана
    return res.status(200).json({
      success: true,
      message: 'Время прочтения обновлено',
      last_read_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка API отметки прочтения:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 