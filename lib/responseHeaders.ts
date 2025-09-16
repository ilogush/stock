import { NextApiRequest, NextApiResponse } from 'next';

interface HeaderConfig {
  cacheControl?: string;
  cors?: boolean;
  security?: boolean;
  rateLimit?: boolean;
}

/**
 * Middleware для установки стандартных заголовков ответа
 */
export function withStandardHeaders(config: HeaderConfig = {}) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // CORS заголовки
      if (config.cors !== false) {
        res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
          ? process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'
          : '*'
        );
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');
        res.setHeader('Access-Control-Max-Age', '86400');
      }

      // Заголовки безопасности
      if (config.security !== false) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // CSP заголовок
        res.setHeader('Content-Security-Policy', 
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' https://*.supabase.co;"
        );
      }

      // Заголовки кэширования
      if (config.cacheControl) {
        res.setHeader('Cache-Control', config.cacheControl);
      } else {
        // По умолчанию отключаем кэширование для API
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      // Заголовки производительности
      res.setHeader('X-Powered-By', 'Next.js');
      res.setHeader('Server', 'Next.js API');

      // Обработка OPTIONS запросов для CORS
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      // Выполняем основной обработчик
      await handler(req, res);
    };
  };
}

/**
 * Предустановленные конфигурации заголовков
 */
export const HeaderConfigs = {
  // Для статических данных (справочники)
  STATIC: {
    cacheControl: 'public, max-age=3600, stale-while-revalidate=86400',
    cors: true,
    security: true
  },
  
  // Для динамических данных
  DYNAMIC: {
    cacheControl: 'no-store, no-cache, must-revalidate',
    cors: true,
    security: true
  },
  
  // Для авторизации
  AUTH: {
    cacheControl: 'no-store, no-cache, must-revalidate',
    cors: true,
    security: true
  },
  
  // Для файлов
  FILES: {
    cacheControl: 'public, max-age=31536000, immutable',
    cors: true,
    security: true
  }
};
