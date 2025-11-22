import { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitConfig {
  windowMs: number; // Время окна в миллисекундах
  maxRequests: number; // Максимальное количество запросов в окне
  message?: string; // Сообщение при превышении лимита
  skipSuccessfulRequests?: boolean; // Пропускать успешные запросы
  skipFailedRequests?: boolean; // Пропускать неудачные запросы
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory хранилище для rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Middleware для ограничения количества запросов
 */
export function withRateLimit(config: RateLimitConfig) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const clientId = getClientId(req);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Получаем или создаем запись для клиента
      let entry = rateLimitStore.get(clientId);
      
      if (!entry || entry.resetTime <= now) {
        // Создаем новую запись или сбрасываем счетчик
        entry = {
          count: 0,
          resetTime: now + config.windowMs
        };
        rateLimitStore.set(clientId, entry);
      }

      // Увеличиваем счетчик
      entry.count++;

      // Проверяем лимит
      if (entry.count > config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        res.setHeader('Retry-After', retryAfter.toString());
        res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
        
        return res.status(429).json({
          error: config.message || 'Слишком много запросов. Попробуйте позже.',
          retryAfter
        });
      }

      // Устанавливаем заголовки rate limit
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      // Выполняем основной обработчик
      await handler(req, res);
    };
  };
}

/**
 * Получает идентификатор клиента для rate limiting
 */
function getClientId(req: NextApiRequest): string {
  // Используем IP адрес как основной идентификатор
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? (forwarded as string).split(',')[0] : req.connection.remoteAddress;
  
  // Добавляем user_id если есть (для более точного ограничения)
  const userId = req.headers['x-user-id'];
  
  return userId ? `${ip}-${userId}` : ip || 'unknown';
}

/**
 * Предустановленные конфигурации rate limiting
 */
export const RateLimitConfigs = {
  // Строгий лимит для авторизации
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 минут
    maxRequests: 5, // 5 попыток входа
    message: 'Слишком много попыток входа. Попробуйте через 15 минут.'
  },
  
  // Умеренный лимит для API
  API: {
    windowMs: 60 * 1000, // 1 минута
    maxRequests: 100, // 100 запросов в минуту
    message: 'Превышен лимит запросов. Попробуйте позже.'
  },
  
  // Либеральный лимит для чтения
  READ: {
    windowMs: 60 * 1000, // 1 минута
    maxRequests: 200, // 200 запросов в минуту
    message: 'Превышен лимит запросов на чтение.'
  },
  
  // Строгий лимит для записи
  WRITE: {
    windowMs: 60 * 1000, // 1 минута
    maxRequests: 30, // 30 запросов в минуту
    message: 'Превышен лимит запросов на запись.'
  }
};

/**
 * Очистка устаревших записей (вызывать периодически)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// Очищаем хранилище каждые 5 минут
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
