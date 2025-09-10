import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Попробуем загрузить из БД, если не получится - используем хардкод
    try {
      const { data: statuses, error } = await supabaseAdmin
        .from('task_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (!error && statuses && statuses.length > 0) {
        return res.status(200).json({ statuses });
      }
    } catch (dbError) {
              // Таблица task_statuses не найдена, используем хардкод
    }

    // Хардкодированные статусы как fallback
    const fallbackStatuses = [
      { id: 1, code: 'new', display_name: 'Новый', sort_order: 1 },
      { id: 2, code: 'viewed', display_name: 'Просмотренно', sort_order: 2 },
      { id: 3, code: 'in_progress', display_name: 'В процессе', sort_order: 3 },
      { id: 4, code: 'done', display_name: 'Выполненно', sort_order: 4 }
    ];

    return res.status(200).json({ statuses: fallbackStatuses });
  } catch (error) {
    console.error('Ошибка API статусов:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 