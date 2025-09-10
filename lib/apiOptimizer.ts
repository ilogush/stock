/**
 * Система оптимизации API запросов
 * Устраняет дублирование запросов и улучшает производительность
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();

  async get<T>(key: string, fetcher: () => Promise<T>, ttl = 30000): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    // Проверяем кэш
    if (cached && (now - cached.timestamp) < cached.ttl) {
      return cached.data;
    }

    // Проверяем pending запросы
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Выполняем новый запрос
    const promise = fetcher().then(data => {
      this.cache.set(key, {
        data,
        timestamp: now,
        ttl
      });
      this.pendingRequests.delete(key);
      return data;
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  invalidate(pattern: string) {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

export const apiCache = new APICache();

/**
 * Оптимизированный fetch с кэшированием
 */
export async function optimizedFetch<T>(
  url: string, 
  options?: RequestInit, 
  ttl = 30000
): Promise<T> {
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  
  return apiCache.get(cacheKey, async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }, ttl);
}

/**
 * Batch запросы для уменьшения количества HTTP запросов
 */
export async function batchRequests<T>(
  requests: Array<{ url: string; options?: RequestInit }>,
  ttl = 30000
): Promise<T[]> {
  const promises = requests.map(({ url, options }) => 
    optimizedFetch<T>(url, options, ttl)
  );
  
  return Promise.all(promises);
}

/**
 * Debounced функция для поиска
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
