import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserById } from './auth';
import { parse } from 'cookie';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: any;
}

export function withAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Получаем куки
      const cookies = parse(req.headers.cookie || '');
      const userIdStr = cookies.user_id;

      if (!userIdStr) {
        return res.status(401).json({ error: 'Не авторизован' });
      }

      // Парсим userId как number
      const userId = parseInt(userIdStr, 10);
      if (isNaN(userId)) {
        return res.status(401).json({ error: 'Неверный ID пользователя' });
      }

      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(401).json({ error: 'Пользователь не найден' });
      }

      // Добавляем пользователя в запрос
      req.user = user;

      // Вызываем основной обработчик
      return handler(req, res);
    } catch (error) {
      console.error('Ошибка middleware аутентификации:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  };
} 