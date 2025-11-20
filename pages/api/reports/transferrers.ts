import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

/**
 * API endpoint для получения списка пользователей из поступлений
 * Возвращает только тех пользователей, которые есть в таблице receipts как transferrer_id
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Получаем уникальные transferrer_id из поступлений
    const { data: receipts, error: receiptsError } = await supabaseAdmin
      .from('receipts')
      .select('transferrer_id')
      .not('transferrer_id', 'is', null);

    if (receiptsError) {
      console.error('Ошибка при получении поступлений:', receiptsError);
      return res.status(500).json({ error: 'Ошибка при получении данных о поступлениях' });
    }

    if (!receipts || receipts.length === 0) {
      return res.status(200).json({
        data: {
          transferrers: []
        }
      });
    }

    // Получаем уникальные ID передатчиков
    const transferrerIds = Array.from(new Set(
      receipts
        .map((r: any) => r.transferrer_id)
        .filter((id: any) => id !== null)
    ));

    if (transferrerIds.length === 0) {
      return res.status(200).json({
        data: {
          transferrers: []
        }
      });
    }

    // Получаем данные пользователей
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', transferrerIds)
      .order('first_name', { ascending: true });

    if (usersError) {
      console.error('Ошибка при получении пользователей:', usersError);
      return res.status(500).json({ error: 'Ошибка при получении данных о пользователях' });
    }

    return res.status(200).json({
      data: {
        transferrers: users || []
      }
    });
  } catch (error: any) {
    console.error('Ошибка при формировании списка передатчиков:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

