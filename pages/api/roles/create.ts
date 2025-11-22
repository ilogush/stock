import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { withCsrfProtection } from '../../../lib/csrf';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const { name, display_name } = req.body;

  if (!name || !display_name) {
    return res.status(400).json({ error: 'Поле name и display_name обязательны' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .insert({ name, display_name })
      .select('*')
      .single();

    if (error) {
      const userId = getUserIdFromCookie(req);
      if (userId) {
        await logUserAction(userId, 'Создание роли', 'error', `Ошибка: ${error.message}`);
      }
      
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Роль с таким ключом уже существует' });
      }
      log.error('Ошибка при создании роли', error as Error, {
        endpoint: '/api/roles/create',
        userId: userId || undefined
      });
      return res.status(500).json({ error: 'Ошибка при создании роли' });
    }

    // Логируем успешное создание роли
    const userId = getUserIdFromCookie(req);
    if (userId) {
      await logUserAction(userId, 'Создание роли', 'success', `Создана роль: ${name}`);
    }

    return res.status(201).json(data);
  } catch (e) {
    log.error('Ошибка сервера при создании роли', e as Error, {
      endpoint: '/api/roles/create'
    });
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Применяем CSRF защиту и rate limiting для модифицирующих операций
export default withCsrfProtection(
  withRateLimit(RateLimitConfigs.WRITE)(handler)
); 