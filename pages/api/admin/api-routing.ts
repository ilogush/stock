import { NextApiRequest, NextApiResponse } from 'next';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';
import { 
  getApiRoutingConfig, 
  updateRolloutPercentage, 
  toggleOptimizedApi 
} from '../../../lib/apiRouter';

/**
 * 🔄 API для управления роллаутом оптимизированных API
 * Доступен только администраторам
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Получить текущую конфигурацию роутинга
    try {
      const config = getApiRoutingConfig();
      return res.status(200).json({
        routes: config,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Ошибка получения конфигурации роутинга:', error);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  }

  if (req.method === 'POST') {
    // Обновить конфигурацию роутинга
    try {
      const { action, path, percentage, enabled } = req.body;

      if (!action || !path) {
        return res.status(400).json({ 
          error: 'Требуются параметры action и path' 
        });
      }

      let success = false;

      switch (action) {
        case 'updatePercentage':
          if (typeof percentage !== 'number') {
            return res.status(400).json({ 
              error: 'Параметр percentage должен быть числом' 
            });
          }
          success = updateRolloutPercentage(path, percentage);
          break;

        case 'toggle':
          if (typeof enabled !== 'boolean') {
            return res.status(400).json({ 
              error: 'Параметр enabled должен быть boolean' 
            });
          }
          success = toggleOptimizedApi(path, enabled);
          break;

        default:
          return res.status(400).json({ 
            error: 'Неизвестное действие. Доступны: updatePercentage, toggle' 
          });
      }

      if (!success) {
        return res.status(404).json({ 
          error: 'API маршрут не найден' 
        });
      }

      // Возвращаем обновленную конфигурацию
      const config = getApiRoutingConfig();
      return res.status(200).json({
        success: true,
        message: `Действие ${action} выполнено успешно`,
        routes: config
      });

    } catch (error) {
      console.error('Ошибка обновления конфигурации роутинга:', error);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}

export default withPermissions(
  RoleChecks.canManageSystem,
  'Доступ к управлению API роутингом ограничен администраторами'
)(handler);
