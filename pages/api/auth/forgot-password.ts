import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }

    // Ищем пользователя по email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, password')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Пользователь с таким email не найден' });
    }

    // Возвращаем пароль напрямую (для демонстрации)
    // В реальном приложении здесь должна быть отправка email
    return res.status(200).json({ 
      message: 'Пароль восстановлен',
      password: user.password,
      success: true 
    });

  } catch (error) {
    console.error('Ошибка при восстановлении пароля:', error);
    return res.status(500).json({ 
      error: 'Ошибка при восстановлении пароля' 
    });
  }
} 