/**
 * HTTP кэширование для браузеров и CDN
 */

import { NextApiResponse } from 'next';

export interface CacheConfig {
  maxAge?: number;           // Время жизни кэша в секундах
  staleWhileRevalidate?: number; // Время, в течение которого можно использовать устаревший кэш
  staleIfError?: number;     // Время использования кэша при ошибках
  mustRevalidate?: boolean;  // Принудительная ревалидация
  private?: boolean;         // Приватный кэш (только браузер)
  noStore?: boolean;         // Запретить кэширование
  immutable?: boolean;       // Контент неизменяемый
}

/**
 * Устанавливает заголовки кэширования
 */
export function setCacheHeaders(res: NextApiResponse, config: CacheConfig) {
  if (config.noStore) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return;
  }

  const directives: string[] = [];

  // Приватность
  if (config.private) {
    directives.push('private');
  } else {
    directives.push('public');
  }

  // Время жизни
  if (config.maxAge !== undefined) {
    directives.push(`max-age=${config.maxAge}`);
  }

  // Stale-while-revalidate
  if (config.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  // Stale-if-error
  if (config.staleIfError !== undefined) {
    directives.push(`stale-if-error=${config.staleIfError}`);
  }

  // Must revalidate
  if (config.mustRevalidate) {
    directives.push('must-revalidate');
  }

  // Immutable
  if (config.immutable) {
    directives.push('immutable');
  }

  res.setHeader('Cache-Control', directives.join(', '));
  
  // ETag для условных запросов
  const etag = generateETag();
  res.setHeader('ETag', etag);
  
  // Дата последней модификации
  res.setHeader('Last-Modified', new Date().toUTCString());
}

/**
 * Генерирует ETag на основе текущего времени
 */
function generateETag(): string {
  const timestamp = Date.now();
  return `"${timestamp.toString(36)}"`;
}

/**
 * Предустановленные конфигурации кэширования
 */
export const CACHE_CONFIGS = {
  // Статические данные (цвета, категории, размеры)
  STATIC_DATA: {
    maxAge: 300,              // 5 минут
    staleWhileRevalidate: 600, // 10 минут stale
    staleIfError: 3600,       // 1 час при ошибках
    private: false
  },

  // Пользовательские данные
  USER_DATA: {
    maxAge: 60,               // 1 минута
    staleWhileRevalidate: 300, // 5 минут stale
    private: true
  },

  // Динамические данные (товары, заказы)
  DYNAMIC_DATA: {
    maxAge: 30,               // 30 секунд
    staleWhileRevalidate: 120, // 2 минуты stale
    private: false
  },

  // Часто изменяющиеся данные (склад, статистика)
  VOLATILE_DATA: {
    maxAge: 10,               // 10 секунд
    staleWhileRevalidate: 60,  // 1 минута stale
    private: false
  },

  // Изображения и медиа
  MEDIA: {
    maxAge: 86400,            // 24 часа
    staleWhileRevalidate: 604800, // 7 дней stale
    immutable: true,
    private: false
  },

  // Отключение кэширования
  NO_CACHE: {
    noStore: true
  }
} as const;

/**
 * Middleware для автоматического кэширования API
 */
export function withHttpCache(config: CacheConfig) {
  return function(handler: Function) {
    return async (req: any, res: NextApiResponse) => {
      // Устанавливаем заголовки кэширования
      setCacheHeaders(res, config);
      
      // Проверяем условные запросы
      const ifNoneMatch = req.headers['if-none-match'];
      const ifModifiedSince = req.headers['if-modified-since'];
      
      // Если ETag совпадает, возвращаем 304
      if (ifNoneMatch && res.getHeader('ETag') === ifNoneMatch) {
        return res.status(304).end();
      }
      
      // Если дата не изменилась, возвращаем 304
      if (ifModifiedSince) {
        const lastModified = res.getHeader('Last-Modified');
        if (lastModified && new Date(ifModifiedSince) >= new Date(lastModified as string)) {
          return res.status(304).end();
        }
      }
      
      return handler(req, res);
    };
  };
}

/**
 * Кэширование для конкретных типов данных
 */
export const cacheMiddleware = {
  colors: withHttpCache(CACHE_CONFIGS.STATIC_DATA),
  categories: withHttpCache(CACHE_CONFIGS.STATIC_DATA),
  brands: withHttpCache(CACHE_CONFIGS.STATIC_DATA),
  sizes: withHttpCache(CACHE_CONFIGS.STATIC_DATA),
  
  users: withHttpCache(CACHE_CONFIGS.USER_DATA),
  profile: withHttpCache(CACHE_CONFIGS.USER_DATA),
  
  products: withHttpCache(CACHE_CONFIGS.NO_CACHE),
  orders: withHttpCache(CACHE_CONFIGS.NO_CACHE),
  receipts: withHttpCache(CACHE_CONFIGS.NO_CACHE),
  realization: withHttpCache(CACHE_CONFIGS.NO_CACHE),
  
  stock: withHttpCache(CACHE_CONFIGS.NO_CACHE),
  stats: withHttpCache(CACHE_CONFIGS.NO_CACHE),
  
  images: withHttpCache(CACHE_CONFIGS.MEDIA),
  
  auth: withHttpCache(CACHE_CONFIGS.NO_CACHE),
  actions: withHttpCache(CACHE_CONFIGS.NO_CACHE)
};

/**
 * Хелпер для инвалидации кэша
 */
export function invalidateCache(res: NextApiResponse, reason?: string) {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.setHeader('X-Cache-Invalidated', reason || 'Manual invalidation');
}

/**
 * Статистика кэширования
 */
export function addCacheStats(res: NextApiResponse, stats: {
  hit?: boolean;
  source?: 'memory' | 'http' | 'database';
  duration?: number;
}) {
  res.setHeader('X-Cache', stats.hit ? 'HIT' : 'MISS');
  if (stats.source) res.setHeader('X-Cache-Source', stats.source);
  if (stats.duration) res.setHeader('X-Response-Time', `${stats.duration}ms`);
}
