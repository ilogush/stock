import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const ONLINE_WINDOW_MINUTES = 15;
    const since = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000).toISOString();

    const { count, error } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', since);

    if (error) {
      log.error('Ошибка подсчёта онлайн-пользователей', error as Error, {
        endpoint: '/api/users/online-count'
      });
      return res.status(500).json({ error: 'Ошибка базы данных' });
    }

    return res.status(200).json({ online: count || 0 });
  } catch (err) {
    log.error('Ошибка сервера при подсчёте онлайн-пользователей', err as Error, {
      endpoint: '/api/users/online-count'
    });
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Применяем rate limiting для GET запросов
export default withRateLimit(RateLimitConfigs.READ)(handler); 