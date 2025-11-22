/**
 * 📊 Система мониторинга производительности API
 * Отслеживает время выполнения запросов и выявляет узкие места
 */

interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: Date;
  cacheHit?: boolean;
  queryCount?: number;
  userId?: number;
}

class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000; // Храним последние 1000 метрик

  /**
   * Начать отслеживание запроса
   */
  startTracking(endpoint: string, method: string): (additionalData?: Partial<PerformanceMetric>) => PerformanceMetric {
    const startTime = Date.now();
    
    return (additionalData?: Partial<PerformanceMetric>) => {
      const duration = Date.now() - startTime;
      const metric: PerformanceMetric = {
        endpoint,
        method,
        duration,
        timestamp: new Date(),
        ...additionalData
      };

      this.addMetric(metric);
      return metric;
    };
  }

  /**
   * Добавить метрику
   */
  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Ограничиваем размер массива
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Логируем медленные запросы
    if (metric.duration > 1000) {
      console.warn(`🐌 Медленный запрос: ${metric.method} ${metric.endpoint} - ${metric.duration}ms`);
    }
  }

  /**
   * Получить статистику по endpoint
   */
  getEndpointStats(endpoint: string) {
    const endpointMetrics = this.metrics.filter(m => m.endpoint === endpoint);
    
    if (endpointMetrics.length === 0) {
      return null;
    }

    const durations = endpointMetrics.map(m => m.duration);
    const cacheHits = endpointMetrics.filter(m => m.cacheHit).length;
    
    return {
      endpoint,
      totalRequests: endpointMetrics.length,
      avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      cacheHitRate: Math.round((cacheHits / endpointMetrics.length) * 100),
      last24h: endpointMetrics.filter(m => 
        Date.now() - m.timestamp.getTime() < 24 * 60 * 60 * 1000
      ).length
    };
  }

  /**
   * Получить общую статистику
   */
  getOverallStats() {
    const now = Date.now();
    const last24h = this.metrics.filter(m => now - m.timestamp.getTime() < 24 * 60 * 60 * 1000);
    const lastHour = this.metrics.filter(m => now - m.timestamp.getTime() < 60 * 60 * 1000);
    
    const durations = this.metrics.map(m => m.duration);
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;

    return {
      totalRequests: this.metrics.length,
      requestsLast24h: last24h.length,
      requestsLastHour: lastHour.length,
      avgDuration: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      cacheHitRate: this.metrics.length ? Math.round((cacheHits / this.metrics.length) * 100) : 0,
      slowRequests: this.metrics.filter(m => m.duration > 1000).length,
      topEndpoints: this.getTopEndpoints(5)
    };
  }

  /**
   * Получить топ endpoint'ов по количеству запросов
   */
  private getTopEndpoints(limit: number = 5) {
    const endpointCounts = new Map<string, number>();
    
    this.metrics.forEach(metric => {
      const current = endpointCounts.get(metric.endpoint) || 0;
      endpointCounts.set(metric.endpoint, current + 1);
    });

    return Array.from(endpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  /**
   * Экспорт метрик для анализа
   */
  exportMetrics() {
    return {
      metrics: this.metrics,
      exported_at: new Date().toISOString(),
      summary: this.getOverallStats()
    };
  }
}

// Создаем глобальный экземпляр трекера
export const performanceTracker = new PerformanceTracker();

/**
 * Middleware для автоматического отслеживания производительности API
 */
export function withPerformanceTracking<T>(
  handler: (req: any, res: any) => Promise<T>,
  endpoint?: string
) {
  return async (req: any, res: any) => {
    const endpointName = endpoint || req.url || 'unknown';
    const stopTracking = performanceTracker.startTracking(endpointName, req.method);
    
    try {
      const result = await handler(req, res);
      stopTracking({ cacheHit: res.getHeader('X-Cache-Status') === 'HIT' });
      return result;
    } catch (error) {
      stopTracking({ cacheHit: false });
      throw error;
    }
  };
}
