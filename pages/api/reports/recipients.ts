import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

/**
 * API endpoint для получения списка получателей из реализаций
 * Возвращает только тех пользователей, которые есть в таблице realization как recipient_id
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Получаем уникальные recipient_id из реализаций
    const { data: realizations, error: realizationsError } = await supabaseAdmin
      .from('realization')
      .select('recipient_id')
      .not('recipient_id', 'is', null);

    if (realizationsError) {
      console.error('Ошибка при получении реализаций:', realizationsError);
      return res.status(500).json({ error: 'Ошибка при получении данных о реализациях' });
    }

    if (!realizations || realizations.length === 0) {
      return res.status(200).json({
        data: {
          recipients: []
        }
      });
    }

    // Получаем уникальные ID получателей
    const recipientIds = Array.from(new Set(
      realizations
        .map((r: any) => r.recipient_id)
        .filter((id: any) => id !== null)
    ));

    if (recipientIds.length === 0) {
      return res.status(200).json({
        data: {
          recipients: []
        }
      });
    }

    // Получаем данные пользователей
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', recipientIds)
      .order('first_name', { ascending: true });

    if (usersError) {
      console.error('Ошибка при получении пользователей:', usersError);
      return res.status(500).json({ error: 'Ошибка при получении данных о пользователях' });
    }

    return res.status(200).json({
      data: {
        recipients: users || []
      }
    });
  } catch (error: any) {
    console.error('Ошибка при формировании списка получателей:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

