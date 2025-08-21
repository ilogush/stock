import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyPassword } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { email, username, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Пароль обязателен' });
    }

    if (!email && !username) {
      return res.status(400).json({ error: 'Email или имя пользователя обязательны' });
    }

    // Проверяем минимальную длину пароля
    if (password.length < 4) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 4 символа' });
    }

    let user;
    let error;

    // Пытаемся найти пользователя по email или имени
    if (email) {
      const result = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      user = result.data;
      error = result.error;
    } else if (username) {
      const result = await supabase
        .from('users')
        .select('*')
        .or(`first_name.ilike.%${username}%,last_name.ilike.%${username}%`)
        .single();
      user = result.data;
      error = result.error;
    }

    if (error || !user) {
      // Логируем неудачную попытку входа (если пользователь не найден)
      try {
        await supabaseAdmin
          .from('user_actions')
          .insert({
            user_id: 0, // Системный ID для неудачных попыток
            action_name: 'Попытка входа',
            status: 'error',
            details: `Неудачная попытка входа с ${email ? 'email: ' + email : 'именем: ' + username}`,
            created_at: new Date().toISOString()
          });
      } catch (logError) {
        console.error('Ошибка логирования неудачного входа:', logError);
      }
      
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Проверяем статус
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Пользователь заблокирован' });
    }

    // Проверяем пароль
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      // Логируем неудачную попытку входа (неверный пароль)
      try {
        await supabaseAdmin
          .from('user_actions')
          .insert({
            user_id: user.id,
            action_name: 'Попытка входа',
            status: 'error',
            details: 'Неверный пароль',
            created_at: new Date().toISOString()
          });
      } catch (logError) {
        console.error('Ошибка логирования неудачного входа:', logError);
      }
      
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Устанавливаем куки с ID пользователя (24 часа)
    res.setHeader('Set-Cookie', `user_id=${user.id}; HttpOnly; Path=/; Max-Age=86400`);

    // Логируем успешный вход
    try {
      await supabaseAdmin
        .from('user_actions')
        .insert({
          user_id: user.id,
          action_name: 'Вход в систему',
          status: 'success',
          details: 'Успешная авторизация',
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Ошибка логирования входа:', logError);
    }

    // Возвращаем данные пользователя без пароля
    const { password_hash: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({ 
      user: userWithoutPassword,
      message: 'Успешный вход' 
    });

  } catch (error) {
    console.error('Ошибка при входе:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 