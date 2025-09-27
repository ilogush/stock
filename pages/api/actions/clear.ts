import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    try {
      // Проверяем, что запрос от админа (можно добавить дополнительную проверку)
      
      // Очищаем всю таблицу user_actions
      const { error } = await supabaseAdmin
        .from('user_actions')
        .delete()
        .neq('id', 0); // Удаляем все записи

      if (error) {
        console.error('Ошибка очистки истории действий:', error);
        return res.status(500).json({ error: 'Ошибка очистки истории действий' });
      }

      return res.status(200).json({ 
        message: 'История действий успешно очищена',
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
