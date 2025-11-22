import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import { verifyPassword } from '../../../lib/auth';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { setSecureCookie } from '../../../lib/utils/cookieUtils';
import { log } from '../../../lib/loggingService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { password } = req.body;

    // Проверяем, что пароль передан
    if (!password) {
      return res.status(400).json({ error: 'Пароль обязателен' });
    }

    // Проверяем минимальную длину пароля
    if (password.length < 4) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 4 символа' });
    }

    log.debug('Поиск пользователя по паролю', {
      endpoint: '/api/auth/login',
      ip: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress
    });

    // Получаем всех пользователей из базы данных
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, telegram, role_id, avatar_url, password_hash, created_at, updated_at');

    if (usersError) {
      log.error('Ошибка получения пользователей', usersError, {
        endpoint: '/api/auth/login'
      });
      return res.status(500).json({ error: 'Ошибка сервера' });
    }

    if (!users || users.length === 0) {
      log.warn('Пользователи не найдены', {
        endpoint: '/api/auth/login'
      });
      return res.status(401).json({ error: 'Пользователи не найдены' });
    }

    log.debug(`Найдено ${users.length} пользователей`, {
      endpoint: '/api/auth/login'
    });

    // Ищем пользователя с указанным паролем
    let foundUser = null;

    for (const user of users) {
      if (!user.password_hash) {
        continue; // Пропускаем пользователей без пароля
      }

      try {
        const isValidPassword = await verifyPassword(password, user.password_hash);
        
        if (isValidPassword) {
          foundUser = user;
          log.info(`Найден пользователь: ${user.email}`, {
            endpoint: '/api/auth/login',
            userId: user.id
          });
          break;
        }
      } catch (error) {
        log.error(`Ошибка проверки пароля для пользователя ${user.email}`, error as Error, {
          endpoint: '/api/auth/login',
          userId: user.id
        });
        continue; // Пропускаем пользователя с ошибкой проверки пароля
      }
    }

    if (!foundUser) {
      log.warn('Пользователь с таким паролем не найден', {
        endpoint: '/api/auth/login',
        ip: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress
      });
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    log.debug('Пароль верный, устанавливаем куки', {
      endpoint: '/api/auth/login',
      userId: foundUser.id
    });

    // Устанавливаем защищенные куки с ID пользователя (24 часа)
    setSecureCookie(res, 'user_id', foundUser.id.toString(), {
      maxAge: 86400, // 24 часа
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/'
    });

    // Возвращаем данные пользователя без пароля
    const userResponse = {
      id: foundUser.id,
      email: foundUser.email,
      first_name: foundUser.first_name,
      last_name: foundUser.last_name,
      phone: foundUser.phone,
      telegram: foundUser.telegram,
      role_id: foundUser.role_id,
      avatar_url: foundUser.avatar_url,
      created_at: foundUser.created_at,
      updated_at: foundUser.updated_at
    };

    log.info('Вход выполнен успешно', {
      endpoint: '/api/auth/login',
      userId: foundUser.id
    });

    return res.status(200).json({ 
      user: userResponse,
      message: 'Успешный вход' 
    });

  } catch (error) {
    log.error('Ошибка при входе', error as Error, {
      endpoint: '/api/auth/login'
    });
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Применяем rate limiting для защиты от брутфорс атак
export default withRateLimit(RateLimitConfigs.AUTH)(handler); 