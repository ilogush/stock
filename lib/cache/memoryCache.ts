/**
 * In-Memory кэширование для быстрого доступа к часто используемым данным
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 минут по умолчанию

  /**
   * Устанавливает значение в кэш
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };
    
    this.cache.set(key, item);
    
    // Планируем удаление через TTL
    setTimeout(() => {
      this.delete(key);
    }, item.ttl);
  }

  /**
   * Получает значение из кэша
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Проверяем TTL
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  /**
   * Удаляет ключ из кэша
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Очищает весь кэш
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Возвращает размер кэша
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Обёртка для автоматического кэширования функций
   */
  async wrap<T>(
    key: string, 
    fn: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const result = await fn();
    this.set(key, result, ttl);
    return result;
  }

  /**
   * Мемоизация для функций с аргументами
   */
  memoize<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    keyGenerator: (...args: TArgs) => string,
    ttl?: number
  ) {
    return async (...args: TArgs): Promise<TReturn> => {
      const key = keyGenerator(...args);
      return this.wrap(key, () => fn(...args), ttl);
    };
  }

  /**
   * Инвалидация кэша по паттерну
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    
    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(pattern)) {
        this.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Статистика кэша
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;
    
    for (const [key, item] of Array.from(this.cache.entries())) {
      totalSize += JSON.stringify(item.data).length;
      
      if (now - item.timestamp > item.ttl) {
        expiredCount++;
      }
    }
    
    return {
      size: this.cache.size,
      expiredCount,
      totalSizeBytes: totalSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Создаём глобальный экземпляр кэша
export const memoryCache = new MemoryCache();

// Предустановленные TTL для разных типов данных
export const CACHE_TTL = {
  COLORS: 10 * 60 * 1000,      // 10 минут (редко меняются)
  CATEGORIES: 15 * 60 * 1000,  // 15 минут (редко меняются)
  BRANDS: 10 * 60 * 1000,      // 10 минут (редко меняются)
  USERS: 5 * 60 * 1000,        // 5 минут (могут обновляться)
  PRODUCTS: 3 * 60 * 1000,     // 3 минуты (часто обновляются)
  WAREHOUSE: 2 * 60 * 1000,    // 2 минуты (часто меняется)
  STATS: 1 * 60 * 1000,        // 1 минута (статистика)
  SIZES: 30 * 60 * 1000,       // 30 минут (очень редко меняются)
} as const;

// Утилиты для генерации ключей кэша
export const cacheKeys = {
  colors: (page?: number, limit?: number, search?: string) => 
    `colors:${page || 'all'}:${limit || 'all'}:${search || 'none'}`,
  
  users: (page?: number, limit?: number, role?: string, search?: string) => 
    `users:${page || 'all'}:${limit || 'all'}:${role || 'all'}:${search || 'none'}`,
  
  products: (page?: number, limit?: number, category?: string, brand?: string, search?: string) => 
    `products:${page || 'all'}:${limit || 'all'}:${category || 'all'}:${brand || 'all'}:${search || 'none'}`,
  
  productById: (id: number) => `product:${id}`,
  
  userById: (id: number) => `user:${id}`,
  
  stockStats: () => 'stock:stats',
  
  categoriesList: () => 'categories:list',
  
  brandsList: () => 'brands:list',
  
  sizesByCategory: (categoryId: string) => `sizes:category:${categoryId}`,
  
  userActions: (page?: number, limit?: number) => 
    `actions:${page || 'all'}:${limit || 'all'}`,
};

// Middleware для автоматического кэширования API responses
export function withCache(ttl: number = CACHE_TTL.PRODUCTS) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const cacheKey = `${propertyName}:${JSON.stringify(args)}`;
      
      return memoryCache.wrap(cacheKey, () => method.apply(this, args), ttl);
    };

    return descriptor;
  };
}

/**
 * Декоратор для мемоизации методов класса
 */
export function memoized(ttl?: number) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function(...args: any[]) {
      const cacheKey = `${target.constructor.name}.${propertyName}:${JSON.stringify(args)}`;
      
      return memoryCache.wrap(cacheKey, () => method.apply(this, args), ttl);
    };

    return descriptor;
  };
}
