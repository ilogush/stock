import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserIdFromCookie } from '../../../lib/actionLogger';
import { withCsrfProtection } from '../../../lib/csrf';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        log.error('Ошибка очистки чата', error as Error, {
          endpoint: '/api/chat/clear',
          userId: userId || undefined
        });
        return res.status(500).json({ error: 'Ошибка очистки чата' });
      }

      return res.status(200).json({ 
        message: 'Чат успешно очищен',
        deleted: true
      });

    } catch (error) {
      log.error('Ошибка сервера при очистке чата', error as Error, {
        endpoint: '/api/chat/clear'
      });
      return res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}

// Применяем CSRF защиту и rate limiting для модифицирующих операций
export default withCsrfProtection(
  withRateLimit(RateLimitConfigs.WRITE)(handler)
);

