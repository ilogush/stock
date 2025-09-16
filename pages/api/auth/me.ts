import type { NextApiRequest, NextApiResponse } from 'next';
import { AuthService } from '../../../lib/authService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Получаем пользователя из куки
    const user = await AuthService.requireAuth(req, res);
    if (!user) {
      return; // Ответ уже отправлен в requireAuth
    }

    return res.status(200).json({ user });

  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 