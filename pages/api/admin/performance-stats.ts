import { NextApiRequest, NextApiResponse } from 'next';
import { performanceMonitor } from '../../../lib/monitoring/performanceMonitor';
import { withApiMiddleware, apiConfigs } from '../../../lib/unified';

/**
 * API эндпоинт для получения статистики производительности
 * Доступен только администраторам
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { timeWindow = '300000' } = req.query; // 5 минут по умолчанию
      const timeWindowMs = parseInt(timeWindow as string);

      // Получаем статистику производительности
      const performanceStats = performanceMonitor.getPerformanceStats(timeWindowMs);
      const systemStats = performanceMonitor.getSystemStats();

      // Получаем детальные метрики
      const metrics = performanceMonitor.exportMetrics();

      const response = {
        timestamp: new Date().toISOString(),
        timeWindow: timeWindowMs,
        performance: performanceStats,
        system: systemStats,
        alerts: {
          slowEndpoints: performanceStats.slowestEndpoints.slice(0, 5),
          errorEndpoints: performanceStats.errorEndpoints.slice(0, 5),
          recommendations: generateRecommendations(performanceStats, systemStats)
        },
        summary: {
          status: getSystemStatus(performanceStats, systemStats),
          healthScore: calculateHealthScore(performanceStats, systemStats),
          uptime: process.uptime()
        }
      };

      return res.status(200).json(response);

    } catch (error) {
      console.error('Ошибка получения статистики производительности:', error);
      return res.status(500).json({
        error: 'Ошибка получения статистики производительности',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action } = req.body;

      switch (action) {
        case 'cleanup':
          performanceMonitor.cleanup();
          return res.status(200).json({
            message: 'Старые метрики очищены',
            timestamp: new Date().toISOString()
          });

        case 'export':
          const metrics = performanceMonitor.exportMetrics();
          return res.status(200).json({
            message: 'Метрики экспортированы',
            data: metrics,
            timestamp: new Date().toISOString()
          });

        default:
          return res.status(400).json({
            error: 'Неизвестное действие',
            availableActions: ['cleanup', 'export']
          });
      }

    } catch (error) {
      console.error('Ошибка выполнения действия:', error);
      return res.status(500).json({
        error: 'Ошибка выполнения действия',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }

  return res.status(405).json({
    error: 'Метод не поддерживается',
    allowedMethods: ['GET', 'POST']
  });
}

/**
 * Генерирует рекомендации по оптимизации
 */
function generateRecommendations(performance: any, system: any): string[] {
  const recommendations: string[] = [];

  // Рекомендации по производительности
  if (performance.avgResponseTime > 1000) {
    recommendations.push('Среднее время ответа превышает 1 секунду. Рекомендуется оптимизировать запросы к БД.');
  }

  if (performance.cacheHitRate < 70) {
    recommendations.push('Низкий процент попаданий в кэш. Рекомендуется увеличить время кэширования.');
  }

  if (performance.errorRate > 5) {
    recommendations.push('Высокий процент ошибок. Рекомендуется проверить логи и исправить проблемы.');
  }

  // Рекомендации по системе
  if (system && system.currentMemory > 400) {
    recommendations.push('Высокое использование памяти. Рекомендуется оптимизировать код или увеличить ресурсы.');
  }

  if (system && system.currentCpu > 80) {
    recommendations.push('Высокая нагрузка на CPU. Рекомендуется оптимизировать алгоритмы.');
  }

  // Рекомендации по медленным эндпоинтам
  if (performance.slowestEndpoints.length > 0) {
    const slowest = performance.slowestEndpoints[0];
    if (slowest.avgTime > 2000) {
      recommendations.push(`Эндпоинт ${slowest.endpoint} работает медленно (${slowest.avgTime.toFixed(0)}ms). Рекомендуется оптимизировать.`);
    }
  }

  return recommendations;
}

/**
 * Определяет статус системы
 */
function getSystemStatus(performance: any, system: any): 'healthy' | 'warning' | 'critical' {
  if (performance.errorRate > 10 || (system && system.currentMemory > 500)) {
    return 'critical';
  }

  if (performance.avgResponseTime > 2000 || performance.errorRate > 5 || (system && system.currentMemory > 400)) {
    return 'warning';
  }

  return 'healthy';
}

/**
 * Вычисляет общий балл здоровья системы
 */
function calculateHealthScore(performance: any, system: any): number {
  let score = 100;

  // Штрафы за производительность
  if (performance.avgResponseTime > 1000) score -= 20;
  if (performance.avgResponseTime > 2000) score -= 30;
  if (performance.cacheHitRate < 70) score -= 15;
  if (performance.errorRate > 5) score -= 25;
  if (performance.errorRate > 10) score -= 40;

  // Штрафы за системные ресурсы
  if (system) {
    if (system.currentMemory > 400) score -= 20;
    if (system.currentMemory > 500) score -= 30;
    if (system.currentCpu > 80) score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

// Экспортируем обработчик
export default handler;