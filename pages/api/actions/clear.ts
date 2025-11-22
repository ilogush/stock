import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    try {
      // Проверяем, что запрос от админа (можно добавить дополнительную проверку)
      
      // Очищаем всю таблицу user_actions
      const { error } = await supabaseAdmin
        .from('user_actions')
        .delete()
        .neq('id', 0); // Удаляем все записи

      if (error) {
        log.error('Ошибка очистки истории действий', error as Error, {
          endpoint: '/api/actions/clear'
        });
        return res.status(500).json({ error: 'Ошибка очистки истории действий' });
      }

      return res.status(200).json({ 
        message: 'История действий успешно очищена',
        deleted: true
      });

    } catch (error) {
      log.error('Ошибка сервера при очистке истории действий', error as Error, {
        endpoint: '/api/actions/clear'
      });
      return res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}

export default withRateLimit(RateLimitConfigs.WRITE)(handler);
