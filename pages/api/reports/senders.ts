import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

/**
 * API endpoint для получения списка отправителей из реализаций
 * Возвращает только тех пользователей, которые есть в таблице realization как sender_id
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Получаем уникальные sender_id из реализаций
    const { data: realizations, error: realizationsError } = await supabaseAdmin
      .from('realization')
      .select('sender_id')
      .not('sender_id', 'is', null);

    if (realizationsError) {
      console.error('Ошибка при получении реализаций:', realizationsError);
      return res.status(500).json({ error: 'Ошибка при получении данных о реализациях' });
    }

    if (!realizations || realizations.length === 0) {
      return res.status(200).json({
        data: {
          senders: []
        }
      });
    }

    // Получаем уникальные ID отправителей
    const senderIds = Array.from(new Set(
      realizations
        .map((r: any) => r.sender_id)
        .filter((id: any) => id !== null)
    ));

    if (senderIds.length === 0) {
      return res.status(200).json({
        data: {
          senders: []
        }
      });
    }

    // Получаем данные пользователей
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', senderIds)
      .order('first_name', { ascending: true });

    if (usersError) {
      console.error('Ошибка при получении пользователей:', usersError);
      return res.status(500).json({ error: 'Ошибка при получении данных о пользователях' });
    }

    return res.status(200).json({
      data: {
        senders: users || []
      }
    });
  } catch (error: any) {
    console.error('Ошибка при формировании списка отправителей:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

