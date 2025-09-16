import { NextApiResponse } from 'next';

/**
 * Единая система кэширования для всего проекта
 */

export interface CacheConfig {
  ttl: number; // Time to live в миллисекундах
  staleWhileRevalidate?: number; // Время для stale-while-revalidate
  tags?: string[]; // Теги для групповой инвалидации
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Предустановленные конфигурации кэша
 */
export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Статические данные - редко меняются
  STATIC_DATA: {
    ttl: 60 * 60 * 1000, // 1 час
    staleWhileRevalidate: 2 * 60 * 60 * 1000, // 2 часа
    tags: ['static']
  },

  // Пользовательские данные - могут обновляться
  USER_DATA: {
    ttl: 5 * 60 * 1000, // 5 минут
    staleWhileRevalidate: 10 * 60 * 1000, // 10 минут
    tags: ['user']
  },

  // Динамические данные - часто меняются
  DYNAMIC_DATA: {
    ttl: 2 * 60 * 1000, // 2 минуты
    staleWhileRevalidate: 5 * 60 * 1000, // 5 минут
    tags: ['dynamic']
  },

  // Критичные данные - без кэширования
  NO_CACHE: {
    ttl: 0,
    tags: ['no-cache']
  },

  // Медиа файлы
  MEDIA: {
    ttl: 60 * 60 * 1000, // 1 час
    staleWhileRevalidate: 2 * 60 * 60 * 1000, // 2 часа
    tags: ['media']
  }
};

/**
 * Единый класс кэша
 */
class UnifiedCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private stats = { hits: 0, misses: 0 };

  /**
   * Получает данные из кэша или выполняет fetcher
   */
  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    config: CacheConfig = CACHE_CONFIGS.DYNAMIC_DATA
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    // Проверяем кэш
    if (cached && (now - cached.timestamp) < cached.ttl) {
      this.stats.hits++;
      return cached.data;
    }

    // Проверяем pending запросы (deduplication)
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Выполняем новый запрос
    const promise = fetcher().then(data => {
      this.cache.set(key, {
        data,
        timestamp: now,
        ttl: config.ttl,
        tags: config.tags || []
      });
      this.pendingRequests.delete(key);
      return data;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, promise);
    this.stats.misses++;
    return promise;
  }

  /**
   * Устанавливает данные в кэш
   */
  set<T>(key: string, data: T, config: CacheConfig = CACHE_CONFIGS.DYNAMIC_DATA): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      tags: config.tags || []
    });
  }

  /**
   * Получает данные из кэша без выполнения fetcher
   */
  getOnly<T>(key: string): T | null {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && (now - cached.timestamp) < cached.ttl) {
      this.stats.hits++;
      return cached.data;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Инвалидирует кэш по ключу
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Инвалидирует кэш по тегам
   */
  invalidateByTags(tags: string[]): number {
    let deleted = 0;
    const keys = Array.from(this.cache.keys());

    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry && entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Инвалидирует кэш по паттерну
   */
  invalidateByPattern(pattern: string): number {
    let deleted = 0;
    const keys = Array.from(this.cache.keys());

    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Очищает весь кэш
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Очищает устаревшие записи
   */
  cleanup(): number {
    const now = Date.now();
    let deleted = 0;
    const keys = Array.from(this.cache.keys());

    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry && (now - entry.timestamp) >= entry.ttl) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Получает статистику кэша
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  /**
   * Получает информацию о записях в кэше
   */
  getCacheInfo(): Array<{ key: string; age: number; ttl: number; tags: string[] }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
      tags: entry.tags
    }));
  }
}

/**
 * Глобальный экземпляр кэша
 */
export const cache = new UnifiedCache();

/**
 * Утилиты для генерации ключей кэша
 */
export const cacheKeys = {
  // Пользователи
  users: (page?: number, limit?: number, role?: string, search?: string) => 
    `users:${page || 'all'}:${limit || 'all'}:${role || 'all'}:${search || 'none'}`,
  
  userById: (id: number) => `user:${id}`,
  
  // Товары
  products: (page?: number, limit?: number, category?: string, brand?: string, search?: string) => 
    `products:${page || 'all'}:${limit || 'all'}:${category || 'all'}:${brand || 'all'}:${search || 'none'}`,
  
  productById: (id: number) => `product:${id}`,
  
  // Цвета
  colors: (page?: number, limit?: number, search?: string) => 
    `colors:${page || 'all'}:${limit || 'all'}:${search || 'none'}`,
  
  colorById: (id: number) => `color:${id}`,
  
  // Заказы
  orders: (page?: number, limit?: number, status?: string, search?: string) => 
    `orders:${page || 'all'}:${limit || 'all'}:${status || 'all'}:${search || 'none'}`,
  
  orderById: (id: number) => `order:${id}`,
  
  // Склад
  stock: (page?: number, limit?: number, category?: string) => 
    `stock:${page || 'all'}:${limit || 'all'}:${category || 'all'}`,
  
  stockStats: () => 'stock:stats',
  
  // Поступления
  receipts: (page?: number, limit?: number, search?: string) => 
    `receipts:${page || 'all'}:${limit || 'all'}:${search || 'none'}`,
  
  receiptById: (id: number) => `receipt:${id}`,
  
  // Реализация
  realization: (page?: number, limit?: number, search?: string) => 
    `realization:${page || 'all'}:${limit || 'all'}:${search || 'none'}`,
  
  realizationById: (id: number) => `realization:${id}`,
  
  // Статические данные
  categories: (page?: number, limit?: number, search?: string) => 
    `categories:${page || 'all'}:${limit || 'all'}:${search || 'none'}`,
  brands: (page?: number, limit?: number, search?: string) => 
    `brands:${page || 'all'}:${limit || 'all'}:${search || 'none'}`,
  sizes: (page?: number, limit?: number, search?: string) => 
    `sizes:${page || 'all'}:${limit || 'all'}:${search || 'none'}`,
  
  // Действия пользователей
  userActions: (page?: number, limit?: number) => 
    `actions:${page || 'all'}:${limit || 'all'}`
};

/**
 * Middleware для HTTP кэширования
 */
export function withHttpCache(config: CacheConfig) {
  return function<T extends any[]>(
    handler: (...args: T) => Promise<void>
  ) {
    return async (req: any, res: NextApiResponse, ...args: any[]): Promise<void> => {
      // Устанавливаем HTTP заголовки кэширования
      if (config.ttl > 0) {
        const maxAge = Math.floor(config.ttl / 1000);
        const staleWhileRevalidate = config.staleWhileRevalidate 
          ? Math.floor(config.staleWhileRevalidate / 1000) 
          : maxAge * 2;

        res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
      } else {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }

      // Добавляем ETag для валидации кэша
      const etag = `"${Date.now()}"`;
      res.setHeader('ETag', etag);

      // Проверяем If-None-Match для 304 ответов
      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return;
      }

      await handler(req, res, ...args);
    };
  };
}

/**
 * Предустановленные middleware для разных типов данных
 */
export const cacheMiddleware = {
  // Статические данные
  colors: withHttpCache(CACHE_CONFIGS.STATIC_DATA),
  categories: withHttpCache(CACHE_CONFIGS.STATIC_DATA),
  brands: withHttpCache(CACHE_CONFIGS.STATIC_DATA),
  sizes: withHttpCache(CACHE_CONFIGS.STATIC_DATA),
  
  // Пользовательские данные
  users: withHttpCache(CACHE_CONFIGS.USER_DATA),
  profile: withHttpCache(CACHE_CONFIGS.USER_DATA),
  
  // Динамические данные
  products: withHttpCache(CACHE_CONFIGS.DYNAMIC_DATA),
  orders: withHttpCache(CACHE_CONFIGS.DYNAMIC_DATA),
  receipts: withHttpCache(CACHE_CONFIGS.DYNAMIC_DATA),
  realization: withHttpCache(CACHE_CONFIGS.DYNAMIC_DATA),
  stock: withHttpCache(CACHE_CONFIGS.DYNAMIC_DATA),
  
  // Медиа
  images: withHttpCache(CACHE_CONFIGS.MEDIA),
  
  // Без кэширования
  auth: withHttpCache(CACHE_CONFIGS.NO_CACHE),
  actions: withHttpCache(CACHE_CONFIGS.NO_CACHE)
};

/**
 * Автоматическая очистка кэша каждые 5 минут
 */
if (typeof window === 'undefined') {
  setInterval(() => {
    const deleted = cache.cleanup();
    if (deleted > 0) {
      console.log(`🧹 Cache cleanup: removed ${deleted} expired entries`);
    }
  }, 5 * 60 * 1000);
}
