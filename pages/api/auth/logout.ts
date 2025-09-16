import type { NextApiRequest, NextApiResponse } from 'next';
import { AuthService } from '../../../lib/authService';
import { getUserIdFromCookie } from '../../../lib/actionLogger';
import { logUserAction as actionLogger } from '../../../lib/actionLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Логируем выход (до очистки куки, чтобы прочитать user_id)
    try {
      const userId = getUserIdFromCookie(req);
      if (userId) {
        await actionLogger.logout(userId, 'Пользователь вышел из системы');
      }
    } catch (e) {
      // без прерывания основного потока
    }

    // Очищаем куки
    AuthService.clearUserCookie(res);
    
    return res.status(200).json({ message: 'Выход выполнен успешно' });

  } catch (error) {
    console.error('Ошибка при выходе:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 