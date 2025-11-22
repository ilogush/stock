/**
 * Система мониторинга производительности для продакшена
 */

export interface PerformanceMetrics {
  timestamp: number;
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cacheHit: boolean;
  userId?: number;
  userAgent?: string;
  ip?: string;
}

export interface SystemMetrics {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  cacheStats: {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
  };
  databaseStats: {
    activeConnections: number;
    slowQueries: number;
    avgQueryTime: number;
  };
}

export interface AlertConfig {
  maxResponseTime: number; // ms
  maxMemoryUsage: number; // MB
  maxErrorRate: number; // percentage
  maxCacheMissRate: number; // percentage
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private alerts: AlertConfig;
  private maxMetricsHistory = 1000;

  constructor(config: AlertConfig = {
    maxResponseTime: 2000,
    maxMemoryUsage: 512,
    maxErrorRate: 5,
    maxCacheMissRate: 30
  }) {
    this.alerts = config;
    this.startSystemMonitoring();
  }

  /**
   * Записывает метрики производительности API запроса
   */
  recordApiCall(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const fullMetrics: PerformanceMetrics = {
      ...metrics,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetrics);

    // Ограничиваем историю метрик
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Проверяем на нарушения
    this.checkAlerts(fullMetrics);

    // Логируем медленные запросы
    if (fullMetrics.duration > this.alerts.maxResponseTime) {
      console.warn(`🐌 Медленный запрос: ${fullMetrics.method} ${fullMetrics.endpoint} - ${fullMetrics.duration}ms`);
    }
  }

  /**
   * Записывает системные метрики
   */
  recordSystemMetrics(metrics: Omit<SystemMetrics, 'timestamp'>): void {
    const fullMetrics: SystemMetrics = {
      ...metrics,
      timestamp: Date.now()
    };

    this.systemMetrics.push(fullMetrics);

    // Ограничиваем историю
    if (this.systemMetrics.length > 100) {
      this.systemMetrics = this.systemMetrics.slice(-100);
    }
  }

  /**
   * Получает статистику производительности
   */
  getPerformanceStats(timeWindow: number = 300000): {
    avgResponseTime: number;
    totalRequests: number;
    errorRate: number;
    cacheHitRate: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>;
    errorEndpoints: Array<{ endpoint: string; errorCount: number; errorRate: number }>;
  } {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < timeWindow);

    if (recentMetrics.length === 0) {
      return {
        avgResponseTime: 0,
        totalRequests: 0,
        errorRate: 0,
        cacheHitRate: 0,
        slowestEndpoints: [],
        errorEndpoints: []
      };
    }

    // Общая статистика
    const totalRequests = recentMetrics.length;
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalRequests) * 100;

    // Самые медленные эндпоинты
    const endpointStats = new Map<string, { totalTime: number; count: number }>();
    recentMetrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      const existing = endpointStats.get(key) || { totalTime: 0, count: 0 };
      endpointStats.set(key, {
        totalTime: existing.totalTime + m.duration,
        count: existing.count + 1
      });
    });

    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Эндпоинты с ошибками
    const errorStats = new Map<string, { errorCount: number; totalCount: number }>();
    recentMetrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      const existing = errorStats.get(key) || { errorCount: 0, totalCount: 0 };
      errorStats.set(key, {
        errorCount: existing.errorCount + (m.statusCode >= 400 ? 1 : 0),
        totalCount: existing.totalCount + 1
      });
    });

    const errorEndpoints = Array.from(errorStats.entries())
      .filter(([, stats]) => stats.errorCount > 0)
      .map(([endpoint, stats]) => ({
        endpoint,
        errorCount: stats.errorCount,
        errorRate: (stats.errorCount / stats.totalCount) * 100
      }))
      .sort((a, b) => b.errorRate - a.errorRate);

    return {
      avgResponseTime,
      totalRequests,
      errorRate,
      cacheHitRate,
      slowestEndpoints,
      errorEndpoints
    };
  }

  /**
   * Получает системную статистику
   */
  getSystemStats(): {
    currentMemory: number;
    avgMemory: number;
    currentCpu: number;
    avgCpu: number;
    cacheStats: SystemMetrics['cacheStats'];
    databaseStats: SystemMetrics['databaseStats'];
  } | null {
    if (this.systemMetrics.length === 0) return null;

    const latest = this.systemMetrics[this.systemMetrics.length - 1];
    const avgMemory = this.systemMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.systemMetrics.length;
    const avgCpu = this.systemMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / this.systemMetrics.length;

    return {
      currentMemory: latest.memoryUsage,
      avgMemory,
      currentCpu: latest.cpuUsage,
      avgCpu,
      cacheStats: latest.cacheStats,
      databaseStats: latest.databaseStats
    };
  }

  /**
   * Проверяет нарушения и отправляет алерты
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    const alerts: string[] = [];

    // Медленный ответ
    if (metrics.duration > this.alerts.maxResponseTime) {
      alerts.push(`Медленный ответ: ${metrics.duration}ms > ${this.alerts.maxResponseTime}ms`);
    }

    // Высокое использование памяти
    const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryMB > this.alerts.maxMemoryUsage) {
      alerts.push(`Высокое использование памяти: ${memoryMB.toFixed(2)}MB > ${this.alerts.maxMemoryUsage}MB`);
    }

    // Ошибка сервера
    if (metrics.statusCode >= 500) {
      alerts.push(`Ошибка сервера: ${metrics.statusCode}`);
    }

    // Отправляем алерты
    if (alerts.length > 0) {
      this.sendAlert(metrics, alerts);
    }
  }

  /**
   * Отправляет алерт
   */
  private sendAlert(metrics: PerformanceMetrics, alerts: string[]): void {
    const alertData = {
      timestamp: new Date(metrics.timestamp).toISOString(),
      endpoint: `${metrics.method} ${metrics.endpoint}`,
      statusCode: metrics.statusCode,
      duration: metrics.duration,
      memoryUsage: `${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      alerts,
      userId: metrics.userId,
      userAgent: metrics.userAgent
    };

    console.error('🚨 PERFORMANCE ALERT:', JSON.stringify(alertData, null, 2));

    // Здесь можно добавить отправку в внешние системы мониторинга
    // Например: Sentry, DataDog, New Relic, или собственный API
  }

  /**
   * Запускает системный мониторинг
   */
  private startSystemMonitoring(): void {
    if (typeof window !== 'undefined') return; // Только на сервере

    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Получаем статистику кэша
      const cacheStats = {
        hits: 0,
        misses: 0,
        size: 0,
        hitRate: 0
      };

      // Получаем статистику БД (заглушка)
      const databaseStats = {
        activeConnections: 0,
        slowQueries: 0,
        avgQueryTime: 0
      };

      this.recordSystemMetrics({
        cpuUsage: cpuUsage.user / 1000000, // Конвертируем в секунды
        memoryUsage: memUsage.heapUsed / 1024 / 1024, // MB
        activeConnections: 0, // Заглушка
        cacheStats,
        databaseStats
      });
    }, 30000); // Каждые 30 секунд
  }

  /**
   * Экспортирует метрики для анализа
   */
  exportMetrics(): {
    performance: PerformanceMetrics[];
    system: SystemMetrics[];
    stats: ReturnType<PerformanceMonitor['getPerformanceStats']>;
  } {
    return {
      performance: [...this.metrics],
      system: [...this.systemMetrics],
      stats: this.getPerformanceStats()
    };
  }

  /**
   * Очищает старые метрики
   */
  cleanup(): void {
    const cutoff = Date.now() - 3600000; // 1 час
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoff);
  }
}

// Глобальный экземпляр монитора
export const performanceMonitor = new PerformanceMonitor();

/**
 * Middleware для автоматического мониторинга API запросов
 */
export function withPerformanceMonitoring(
  handler: (...args: any[]) => Promise<void>
) {
  return async (req: any, res: any, ...args: any[]): Promise<void> => {
    const start = Date.now();
    const startMemory = process.memoryUsage();

    // Перехватываем ответ
    const originalSend = res.send;
    const originalJson = res.json;
    let statusCode = 200;

    res.send = function(data: any) {
      statusCode = res.statusCode;
      return originalSend.call(this, data);
    };

    res.json = function(data: any) {
      statusCode = res.statusCode;
      return originalJson.call(this, data);
    };

    try {
      await handler(req, res, ...args);
    } finally {
      const duration = Date.now() - start;
      const endMemory = process.memoryUsage();

      // Записываем метрики
      performanceMonitor.recordApiCall({
        endpoint: req.url || req.path || 'unknown',
        method: req.method || 'GET',
        duration,
        statusCode,
        memoryUsage: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal,
          external: endMemory.external
        },
        cacheHit: false, // Будет обновлено в кэше
        userId: req.user?.id,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
      });
    }
  };
}
