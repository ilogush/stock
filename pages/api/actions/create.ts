import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { user_id, action_name, status = 'success', details = null } = req.body;

    if (!user_id || !action_name) {
      return res.status(400).json({ error: 'Необходимы user_id и action_name' });
    }

    const { data, error } = await supabaseAdmin
      .from('user_actions')
      .insert({
        user_id,
        action_name,
        status,
        details,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка создания действия:', error);
      return res.status(500).json({ error: 'Ошибка создания действия' });
    }

    res.status(201).json({ action: data });

  } catch (error) {
    console.error('Ошибка API создания действия:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 