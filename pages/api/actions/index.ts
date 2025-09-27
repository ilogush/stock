import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ - данные загружаются в реальном времени
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);



    let query = supabaseAdmin
      .from('user_actions')
      .select(`
        *,
        user:users!user_actions_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });



    // Добавляем пагинацию
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: actions, error, count } = await query;



    if (error) {
      console.error('Ошибка загрузки действий:', error);
      return res.status(500).json({ error: 'Ошибка загрузки действий' });
    }



    const totalPages = Math.ceil((count || 0) / Number(limit));

    res.status(200).json({
      actions: actions || [],
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages
      }
    });

  } catch (error) {
    console.error('Ошибка API действий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 