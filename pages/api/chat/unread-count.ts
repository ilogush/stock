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

    // Временное решение: считаем все сообщения от других пользователей как непрочитанные
    // Пока таблица chat_read_status не создана
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('id')
      .neq('user_id', user_id);

    if (error) {
      console.error('Ошибка получения непрочитанных сообщений:', error);
      return res.status(500).json({ error: 'Ошибка получения данных' });
    }

    const unreadCount = data?.length || 0;

    return res.status(200).json({
      unread_count: unreadCount
    });

  } catch (error) {
    console.error('Ошибка API непрочитанных сообщений:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 