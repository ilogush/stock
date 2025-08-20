import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Получаем user_id из куки
    const cookies = req.headers.cookie || '';
    const userIdMatch = cookies.match(/user_id=([^;]*)/);
    const userId = userIdMatch ? userIdMatch[1] : null;

    if (!userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    // Получаем данные пользователя
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, telegram, role_id, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    // Простая проверка существования пользователя - никаких дополнительных проверок сессий

    return res.status(200).json({ user });

  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 