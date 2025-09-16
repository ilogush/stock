import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserIdFromCookie } from '../../../lib/actionLogger';
import { logAction, ActionTypes } from '../../../lib/actionLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id обязательен' });

  const currentUserId = getUserIdFromCookie(req);

  if (!currentUserId) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.method === 'GET') {
    try {
      // Получаем задание
      const { data: task, error: taskError } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (taskError) {
        console.error('Ошибка получения задания:', taskError);
        return res.status(500).json({ error: 'Ошибка получения задания' });
      }

      if (!task) {
        return res.status(404).json({ error: 'Задание не найдено' });
      }

      // Автоматически обновляем статус на "viewed" если задание новое
      if (task.status === 'new') {
        const { error: updateError } = await supabaseAdmin
          .from('tasks')
          .update({ 
            status: 'viewed'
          })
          .eq('id', id);

        if (updateError) {
          console.error('Ошибка обновления статуса:', updateError);
        } else {
          // Логируем действие
          try {
            const actorId = getUserIdFromCookie(req);
            await logAction({ 
              user_id: actorId || 0, 
              action_name: 'Просмотр задания', 
              status: 'success', 
              details: `Задание ${id} автоматически помечено как просмотрено` 
            });
          } catch {}

          // Обновляем данные задания
          task.status = 'viewed';
        }
      }

      return res.status(200).json(task);
    } catch (error) {
      console.error('Ошибка обработки запроса:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'PUT') {
    const { status, description } = req.body;
    if (!status) return res.status(400).json({ error: 'status обязателен' });
    
    // Сначала получаем задачу для проверки прав доступа
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }

    // Проверяем права доступа: пользователь должен быть автором или исполнителем
    if (task.author_id !== currentUserId && task.assignee_id !== currentUserId) {
      return res.status(403).json({ error: 'Недостаточно прав для изменения этой задачи' });
    }
    
    // Подготавливаем данные для обновления
    const updateData: any = { status };
    if (description) {
      updateData.description = description;
    }
    
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update(updateData)
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