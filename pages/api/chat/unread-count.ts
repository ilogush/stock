import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { user_id, last_read_at } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'ID пользователя обязателен' });
    }

    // Если есть время последнего прочтения, считаем сообщения после этого времени
    let query = supabaseAdmin
      .from('chat_messages')
      .select('id, created_at')
      .neq('user_id', user_id);

    if (last_read_at) {
      query = query.gt('created_at', last_read_at);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Ошибка получения непрочитанных сообщений:', error);
      return res.status(500).json({ error: 'Ошибка получения данных' });
    }

    const unreadCount = data?.length || 0;

    return res.status(200).json({
      unread_count: unreadCount,
      last_message_at: data && data.length > 0 ? data[data.length - 1]?.created_at : null
    });

  } catch (error) {
    console.error('Ошибка API непрочитанных сообщений:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 