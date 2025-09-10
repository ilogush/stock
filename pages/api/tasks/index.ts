import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserIdFromCookie } from '../../../lib/actionLogger';
import { logAction } from '../../../lib/actionLogger';
import { AuthService } from '../../../lib/authService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Получаем пользователя из заголовка
  const user = await AuthService.requireAuthHeader(req, res);
  if (!user) {
    return; // Ответ уже отправлен в requireAuthHeader
  }
  
  const currentUserId = user.id;

  if (req.method === 'GET') {
    try {
      // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ - данные загружаются в реальном времени
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .or(`author_id.eq.${currentUserId},assignee_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ tasks: data || [] });
    } catch (error) {
      console.error('Ошибка получения задач:', error);
      return res.status(500).json({ error: 'Ошибка получения задач' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { description = '', assignee_ids = [] } = req.body;

      if (!description || !Array.isArray(assignee_ids) || assignee_ids.length === 0) {
        return res.status(400).json({ error: 'description и assignee_ids обязательны' });
      }

      // Берём только первого исполнителя, чтобы создать одно задание
      const primaryAssignee = assignee_ids[0];

      const { data, error } = await supabaseAdmin
        .from('tasks')
        .insert({
          title: null,
          description,
          assignee_id: primaryAssignee,
          author_id: currentUserId,
          status: 'new'
        })
        .select();

      if (error) throw error;
      try {
        const actorId = getUserIdFromCookie(req) || currentUserId;
        await logAction({ user_id: actorId || 0, action_name: 'Создание задания', status: 'success', details: `Создано задание для пользователя ${primaryAssignee}` });
      } catch {}
      return res.status(201).json(data);
    } catch (error) {
      console.error('Ошибка создания задачи:', error);
      try {
        const actorId = getUserIdFromCookie(req) || currentUserId;
        await logAction({ user_id: actorId || 0, action_name: 'Создание задания', status: 'error', details: `Ошибка: ${error instanceof Error ? error.message : String(error)}` });
      } catch {}
      return res.status(500).json({ error: 'Ошибка создания задачи' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 