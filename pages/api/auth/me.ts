import type { NextApiRequest, NextApiResponse } from 'next';
import { AuthService } from '../../../lib/authService';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Получаем пользователя из куки
    const user = await AuthService.requireAuth(req, res);
    if (!user) {
      return; // Ответ уже отправлен в requireAuth
    }

    return res.status(200).json({ user });

  } catch (error) {
    log.error('Ошибка при получении пользователя', error as Error, {
      endpoint: '/api/auth/me'
    });
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Применяем rate limiting для публичного endpoint
export default withRateLimit(RateLimitConfigs.API)(handler); 