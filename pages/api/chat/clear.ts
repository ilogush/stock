import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserIdFromCookie } from '../../../lib/actionLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    try {
      // Получаем ID пользователя из cookie
      const userId = getUserIdFromCookie(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Не авторизован' });
      }

      // Проверяем, что пользователь - администратор
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('role_id')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }

      if (userData.role_id !== 1) {
        return res.status(403).json({ error: 'Только администратор может очищать чат' });
      }
      
      // Очищаем всю таблицу chat_messages
      const { error } = await supabaseAdmin
        .from('chat_messages')
        .delete()
        .neq('id', 0); // Удаляем все записи

      if (error) {
        console.error('Ошибка очистки чата:', error);
        return res.status(500).json({ error: 'Ошибка очистки чата' });
      }

      return res.status(200).json({ 
        message: 'Чат успешно очищен',
        deleted: true
      });

    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}

