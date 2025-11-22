/**
 * Универсальный middleware для безопасности API
 * Объединяет CSRF защиту, rate limiting и логирование
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withCsrfProtection } from '../csrf';
import { withRateLimit, RateLimitConfigs } from '../rateLimiter';
import { log } from '../loggingService';

/**
 * Комбинированный middleware для модифицирующих операций
 * Применяет CSRF защиту и rate limiting
 */
export function withSecurityMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>,
  options: {
    csrf?: boolean;
    rateLimit?: typeof RateLimitConfigs[keyof typeof RateLimitConfigs];
    skipCsrfForGet?: boolean;
  } = {}
) {
  const { csrf = true, rateLimit = RateLimitConfigs.WRITE, skipCsrfForGet = true } = options;

  let wrappedHandler = handler;

  // Применяем CSRF защиту
  if (csrf) {
    wrappedHandler = withCsrfProtection(wrappedHandler);
  }

  // Применяем rate limiting
  if (rateLimit) {
    // Приводим тип для совместимости с withRateLimit
    wrappedHandler = withRateLimit(rateLimit)(wrappedHandler as any) as typeof wrappedHandler;
  }

  // Добавляем логирование
  wrappedHandler = withSecurityLogging(wrappedHandler);

  return wrappedHandler;
}

/**
 * Middleware для логирования безопасности
 */
function withSecurityLogging(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    const method = req.method || 'UNKNOWN';
    const endpoint = req.url || 'unknown';
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
               req.connection.remoteAddress || 
               'unknown';

    try {
      await handler(req, res);
      
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode || 200;

      // Логируем только важные события
      if (statusCode >= 400 || duration > 1000) {
        log.api(method, endpoint, statusCode, duration, {
          ip,
          userAgent: req.headers['user-agent']
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error(`API Error: ${method} ${endpoint}`, error as Error, {
        endpoint,
        ip,
        duration
      });
      throw error;
    }
  };
}

/**
 * Предустановленные конфигурации безопасности
 */
export const SecurityConfigs = {
  // Для модифицирующих операций (POST, PUT, DELETE)
  WRITE: {
    csrf: true,
    rateLimit: RateLimitConfigs.WRITE
  },
  
  // Для чтения (GET)
  READ: {
    csrf: false,
    rateLimit: RateLimitConfigs.READ
  },
  
  // Для авторизации
  AUTH: {
    csrf: false, // CSRF не нужен для login, так как это публичный endpoint
    rateLimit: RateLimitConfigs.AUTH
  },
  
  // Для публичных endpoints
  PUBLIC: {
    csrf: false,
    rateLimit: RateLimitConfigs.API
  }
};

