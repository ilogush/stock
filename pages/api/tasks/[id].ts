import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserIdFromCookie } from '../../../lib/actionLogger';
import { logAction, ActionTypes } from '../../../lib/actionLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id обязательен' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('tasks').select('*').eq('id', id).single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status обязателен' });
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      try {
        const actorId = getUserIdFromCookie(req);
        await logAction({ user_id: actorId || 0, action_name: 'Редактирование задания', status: 'error', details: `Ошибка смены статуса задачи ${id}: ${error.message}` });
      } catch {}
      return res.status(500).json({ error: error.message });
    }
    try {
      const actorId = getUserIdFromCookie(req);
      await logAction({ user_id: actorId || 0, action_name: 'Редактирование задания', status: 'success', details: `Задача ${id}: новый статус → ${status}` });
    } catch {}
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 