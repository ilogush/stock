/**
 * 🔄 Система постепенной замены API на оптимизированные версии
 * Позволяет A/B тестирование и плавный переход
 */

interface ApiRoute {
  original: string;
  optimized: string;
  rolloutPercentage: number; // 0-100
  enabled: boolean;
}

const API_ROUTES: ApiRoute[] = [
  {
    original: '/api/products',
    optimized: '/api/optimized/products-search',
    rolloutPercentage: 0, // Начинаем с 0%
    enabled: false
  },
  {
    original: '/api/stock',
    optimized: '/api/optimized/stock', 
    rolloutPercentage: 0,
    enabled: false
  },
  {
    original: '/api/realization',
    optimized: '/api/optimized/realization',
    rolloutPercentage: 0,
    enabled: false
  }
];

/**
 * Определяет, какую версию API использовать
 */
export function shouldUseOptimizedApi(originalPath: string, userId?: number): boolean {
  const route = API_ROUTES.find(r => r.original === originalPath);
  
  if (!route || !route.enabled) {
    return false;
  }

  // Если 100% - всегда используем оптимизированную версию
  if (route.rolloutPercentage >= 100) {
    return true;
  }

  // Если 0% - всегда используем оригинальную версию
  if (route.rolloutPercentage <= 0) {
    return false;
  }

  // Детерминированный выбор на основе userId или случайного числа
  const seed = userId || Math.floor(Math.random() * 1000);
  return (seed % 100) < route.rolloutPercentage;
}

/**
 * Получить оптимизированный путь для API
 */
export function getOptimizedApiPath(originalPath: string): string | null {
  const route = API_ROUTES.find(r => r.original === originalPath);
  return route?.optimized || null;
}

/**
 * Получить конфигурацию роутинга
 */
export function getApiRoutingConfig(): ApiRoute[] {
  return [...API_ROUTES];
}

/**
 * Обновить процент роллаута для API
 */
export function updateRolloutPercentage(originalPath: string, percentage: number): boolean {
  const route = API_ROUTES.find(r => r.original === originalPath);
  if (!route) return false;

  route.rolloutPercentage = Math.max(0, Math.min(100, percentage));
  return true;
}

/**
 * Включить/выключить оптимизированный API
 */
export function toggleOptimizedApi(originalPath: string, enabled: boolean): boolean {
  const route = API_ROUTES.find(r => r.original === originalPath);
  if (!route) return false;

  route.enabled = enabled;
  return true;
}

/**
 * Middleware для автоматического роутинга
 */
export function withApiRouting(handler: Function, originalPath: string) {
  return async (req: any, res: any) => {
    // Проверяем, нужно ли использовать оптимизированную версию
    const userId = req.cookies?.user_id ? parseInt(req.cookies.user_id) : undefined;
    const useOptimized = shouldUseOptimizedApi(originalPath, userId);

    if (useOptimized) {
      // Добавляем заголовок для отслеживания
      res.setHeader('X-API-Version', 'optimized');
      
      // Здесь можно перенаправить на оптимизированную версию
      // Пока просто помечаем запрос
      req.isOptimizedVersion = true;
    } else {
      res.setHeader('X-API-Version', 'original');
      req.isOptimizedVersion = false;
    }

    return handler(req, res);
  };
}
