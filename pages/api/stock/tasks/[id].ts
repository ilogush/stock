import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getUserIdFromCookie } from '../../../../lib/actionLogger';
import { logAction } from '../../../../lib/actionLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id обязателен' });

  if (req.method === 'GET') {
    try {
      // Получаем задание
      const { data: task, error: taskError } = await supabaseAdmin
        .from('warehouse_tasks')
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

      // Автоматически обновляем статус на "просмотрено" если задание новое
      if (task.status === 'новое') {
        const { error: updateError } = await supabaseAdmin
          .from('warehouse_tasks')
          .update({ 
            status: 'просмотрено',
            updated_at: new Date().toISOString()
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
          task.status = 'просмотрено';
          task.updated_at = new Date().toISOString();
        }
      }

      return res.status(200).json({ task });
    } catch (error) {
      console.error('Ошибка обработки запроса:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { status, comment } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'status обязателен' });
      }

      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      // Добавляем комментарий если он есть
      if (comment) {
        updateData.comment = comment;
      }

      const { data: updatedTask, error: updateError } = await supabaseAdmin
        .from('warehouse_tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Ошибка обновления задания:', updateError);
        return res.status(500).json({ error: 'Ошибка обновления задания' });
      }

      // Логируем действие
      try {
        const actorId = getUserIdFromCookie(req);
        await logAction({ 
          user_id: actorId || 0, 
          action_name: 'Обновление статуса задания', 
          status: 'success', 
          details: `Задание ${id}: статус изменен на ${status}` 
        });
      } catch {}

      return res.status(200).json({ task: updatedTask });
    } catch (error) {
      console.error('Ошибка обработки запроса:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}
