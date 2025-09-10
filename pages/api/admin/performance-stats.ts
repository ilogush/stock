import { NextApiRequest, NextApiResponse } from 'next';
import { performanceTracker } from '../../../lib/performanceTracker';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';

/**
 * 📊 API для просмотра статистики производительности
 * Доступен только администраторам
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { endpoint } = req.query;

      if (endpoint && typeof endpoint === 'string') {
        // Статистика по конкретному endpoint
        const stats = performanceTracker.getEndpointStats(endpoint);
        if (!stats) {
          return res.status(404).json({ error: 'Endpoint не найден в статистике' });
        }
        return res.status(200).json(stats);
      } else {
        // Общая статистика
        const stats = performanceTracker.getOverallStats();
        return res.status(200).json(stats);
      }
    } catch (error) {
      console.error('Ошибка получения статистики производительности:', error);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  }

  if (req.method === 'POST' && req.query.action === 'export') {
    try {
      // Экспорт всех метрик для анализа
      const exportData = performanceTracker.exportMetrics();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="performance-metrics-${Date.now()}.json"`);
      
      return res.status(200).json(exportData);
    } catch (error) {
      console.error('Ошибка экспорта метрик:', error);
      return res.status(500).json({ error: 'Ошибка экспорта' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}

export default withPermissions(
  RoleChecks.canManageSystem,
  'Доступ к статистике производительности ограничен администраторами'
)(handler);
