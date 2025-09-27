import { NextApiRequest, NextApiResponse } from 'next';
import { notificationService } from '../../../lib/features/notifications';
import { withApiMiddleware, apiConfigs, handleDatabaseError, sendErrorResponse } from '../../../lib/unified';

/**
 * API эндпоинт для работы с уведомлениями
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { limit = '20', offset = '0', unread_only, category } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Требуется авторизация' });
      }

      const notifications = await notificationService.getUserNotifications(userId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        unreadOnly: unread_only === 'true',
        category: category as string
      });

      return res.status(200).json({
        data: notifications.notifications,
        pagination: {
          total: notifications.total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: notifications.total > parseInt(offset as string) + parseInt(limit as string)
        }
      });

    } catch (error) {
      const apiError = handleDatabaseError(error, 'notifications fetch');
      return sendErrorResponse(res, apiError);
    }
  }

  if (req.method === 'POST') {
    try {
      const { action } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Требуется авторизация' });
      }

      switch (action) {
        case 'mark_all_read':
          await notificationService.markAllAsRead(userId);
          return res.status(200).json({ message: 'Все уведомления отмечены как прочитанные' });

        case 'cleanup_expired':
          const deletedCount = await notificationService.cleanupExpiredNotifications();
          return res.status(200).json({ 
            message: `Удалено ${deletedCount} истекших уведомлений` 
          });

        default:
          return res.status(400).json({ error: 'Неизвестное действие' });
      }

    } catch (error) {
      const apiError = handleDatabaseError(error, 'notifications action');
      return sendErrorResponse(res, apiError);
    }
  }

  return res.status(405).json({
    error: 'Метод не поддерживается',
    allowedMethods: ['GET', 'POST']
  });
}

export default handler;
