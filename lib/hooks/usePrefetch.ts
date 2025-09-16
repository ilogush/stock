import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

interface PrefetchConfig {
  [key: string]: {
    api: string;
    cacheTime?: number;
    priority?: 'high' | 'medium' | 'low';
  };
}

// Конфигурация для предварительной загрузки
const PREFETCH_CONFIG: PrefetchConfig = {
  '/products': {
    api: '/api/products',
    cacheTime: 5 * 60 * 1000, // 5 минут
    priority: 'high'
  },
  '/users': {
    api: '/api/users',
    cacheTime: 5 * 60 * 1000,
    priority: 'high'
  },
  '/brands': {
    api: '/api/brands',
    cacheTime: 10 * 60 * 1000, // 10 минут
    priority: 'medium'
  },
  '/companies': {
    api: '/api/companies',
    cacheTime: 10 * 60 * 1000,
    priority: 'medium'
  },
  '/colors': {
    api: '/api/colors',
    cacheTime: 15 * 60 * 1000, // 15 минут
    priority: 'low'
  },
  '/categories': {
    api: '/api/categories',
    cacheTime: 30 * 60 * 1000, // 30 минут
    priority: 'low'
  },
  '/receipts': {
    api: '/api/receipts',
    cacheTime: 2 * 60 * 1000, // 2 минуты
    priority: 'high'
  },
  '/orders': {
    api: '/api/orders',
    cacheTime: 2 * 60 * 1000,
    priority: 'high'
  },
  '/stock': {
    api: '/api/stock',
    cacheTime: 1 * 60 * 1000, // 1 минута
    priority: 'high'
  }
};

// Кеш для prefetch запросов
const prefetchCache = new Map<string, Promise<any>>();

// Функция для выполнения prefetch запроса
const prefetchApi = async (api: string, cacheTime: number = 5 * 60 * 1000) => {
  const cacheKey = `prefetch:${api}`;
  
  // Проверяем, есть ли уже запрос в процессе
  if (prefetchCache.has(cacheKey)) {
    return prefetchCache.get(cacheKey);
  }

  // Создаем новый запрос
  const fetchPromise = fetch(api, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'force-cache' // Используем кеш браузера
  }).then(response => {
    if (!response.ok) {
      throw new Error(`Prefetch failed: ${response.status}`);
    }
    return response.json();
  }).catch(error => {
    console.warn(`Prefetch failed for ${api}:`, error);
    return null;
  });

  // Сохраняем запрос в кеше
  prefetchCache.set(cacheKey, fetchPromise);

  // Очищаем кеш через некоторое время
  setTimeout(() => {
    prefetchCache.delete(cacheKey);
  }, cacheTime);

  return fetchPromise;
};

// Хук для автоматического prefetching
export function usePrefetch() {
  const router = useRouter();

  // Функция для prefetch конкретного маршрута
  const prefetchRoute = useCallback(async (path: string) => {
    const config = PREFETCH_CONFIG[path];
    if (!config) return;

    try {
      await prefetchApi(config.api, config.cacheTime);
    } catch (error) {
      console.warn(`Failed to prefetch ${path}:`, error);
    }
  }, []);

  // Функция для prefetch всех маршрутов
  const prefetchAll = useCallback(async () => {
    const promises = Object.entries(PREFETCH_CONFIG)
      .filter(([_, config]) => config.priority === 'high')
      .map(([path, config]) => prefetchApi(config.api, config.cacheTime));

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('Failed to prefetch all routes:', error);
    }
  }, []);

  // Функция для prefetch при наведении на ссылку
  const prefetchOnHover = useCallback((path: string) => {
    const config = PREFETCH_CONFIG[path];
    if (!config) return;

    // Используем requestIdleCallback для низкоприоритетных запросов
    if (config.priority === 'low' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        prefetchApi(config.api, config.cacheTime);
      });
    } else {
      prefetchApi(config.api, config.cacheTime);
    }
  }, []);

  // Автоматический prefetch при изменении маршрута
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Prefetch связанные маршруты
      const currentPath = url.split('?')[0];
      
      // Prefetch дочерние маршруты
      Object.keys(PREFETCH_CONFIG).forEach(path => {
        if (path.startsWith(currentPath) && path !== currentPath) {
          prefetchRoute(path);
        }
      });
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router, prefetchRoute]);

  return {
    prefetchRoute,
    prefetchAll,
    prefetchOnHover
  };
}

// Хук для prefetch конкретного API
export function usePrefetchApi(api: string, cacheTime?: number) {
  const prefetch = useCallback(async () => {
    try {
      await prefetchApi(api, cacheTime);
    } catch (error) {
      console.warn(`Failed to prefetch API ${api}:`, error);
    }
  }, [api, cacheTime]);

  return prefetch;
}

// Компонент для автоматического prefetch при монтировании
export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const { prefetchAll } = usePrefetch();

  useEffect(() => {
    // Prefetch высокоприоритетные маршруты при загрузке приложения
    prefetchAll();
  }, [prefetchAll]);

  return React.createElement(React.Fragment, null, children);
}
