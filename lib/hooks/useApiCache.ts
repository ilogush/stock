import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface UseApiCacheOptions {
  cacheTime?: number; // Время жизни кеша в миллисекундах
  staleTime?: number; // Время, после которого данные считаются устаревшими
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

// Глобальный кеш для всех компонентов
const globalCache = new Map<string, CacheEntry<any>>();

export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiCacheOptions = {}
) {
  const {
    cacheTime = 5 * 60 * 1000, // 5 минут
    staleTime = 2 * 60 * 1000, // 2 минуты
    refetchOnWindowFocus = false,
    refetchOnReconnect = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Функция для получения данных
  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    const cached = globalCache.get(key);

    // Проверяем, есть ли валидные данные в кеше
    if (!force && cached && now < cached.expiresAt) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    // Проверяем, нужно ли обновить устаревшие данные
    const isStale = cached && now > cached.timestamp + staleTime;
    if (!force && cached && !isStale) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Отменяем предыдущий запрос
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const result = await fetcher();

      // Сохраняем в кеш
      globalCache.set(key, {
        data: result,
        timestamp: now,
        expiresAt: now + cacheTime
      });

      setData(result);
      setLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Игнорируем отмененные запросы
      }
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    }
  }, [key, fetcher, cacheTime, staleTime]);

  // Функция для принудительного обновления
  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Функция для очистки кеша
  const clearCache = useCallback(() => {
    globalCache.delete(key);
  }, [key]);

  // Функция для предварительной загрузки
  const prefetch = useCallback(() => {
    if (!globalCache.has(key)) {
      fetchData();
    }
  }, [key, fetchData]);

  // Эффект для первоначальной загрузки
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Эффект для refetch при фокусе окна
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const cached = globalCache.get(key);
      if (cached && Date.now() > cached.timestamp + staleTime) {
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, refetch, key, staleTime]);

  // Эффект для refetch при восстановлении соединения
  useEffect(() => {
    if (!refetchOnReconnect) return;

    const handleOnline = () => {
      refetch();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetchOnReconnect, refetch]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
    prefetch
  };
}

// Утилита для очистки всего кеша
export const clearAllCache = () => {
  globalCache.clear();
};

// Утилита для получения размера кеша
export const getCacheSize = () => {
  return globalCache.size;
};

// Утилита для получения информации о кеше
export const getCacheInfo = () => {
  const entries = Array.from(globalCache.entries());
  return entries.map(([key, entry]) => ({
    key,
    age: Date.now() - entry.timestamp,
    expiresIn: entry.expiresAt - Date.now()
  }));
};
