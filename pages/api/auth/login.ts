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

    if ((!email && !username) || !password) {
      return res.status(400).json({ error: 'Email/имя пользователя и пароль обязательны' });
    }

    if (email) {
      // Вход по email
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !user) {
        // Логируем неудачную попытку входа
        try {
          await supabaseAdmin
            .from('user_actions')
            .insert({
              user_id: 0,
              action_name: 'Попытка входа',
              status: 'error',
              details: `Неудачная попытка входа с email: ${email}`,
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
        // Логируем неудачную попытку входа
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
            details: 'Успешная авторизация по email',
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

    } else if (username) {
      // Вход по имени - ищем всех пользователей с таким именем
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('first_name', username);

      if (error || !users || users.length === 0) {
        // Логируем неудачную попытку входа
        try {
          await supabaseAdmin
            .from('user_actions')
            .insert({
              user_id: 0,
              action_name: 'Попытка входа',
              status: 'error',
              details: `Неудачная попытка входа с именем: ${username}`,
              created_at: new Date().toISOString()
            });
        } catch (logError) {
          console.error('Ошибка логирования неудачного входа:', logError);
        }
        
        return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
      }

      // Проверяем пароль у всех найденных пользователей
      for (const user of users) {
        // Проверяем статус
        if (user.is_blocked) {
          continue; // Пропускаем заблокированных пользователей
        }

        // Проверяем пароль
        const isValidPassword = await verifyPassword(password, user.password_hash);
        if (isValidPassword) {
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
                details: 'Успешная авторизация по имени',
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
        }
      }

      // Если пароль не подошел ни одному пользователю
      try {
        await supabaseAdmin
          .from('user_actions')
          .insert({
            user_id: 0,
            action_name: 'Попытка входа',
            status: 'error',
            details: `Неверный пароль для имени: ${username}`,
            created_at: new Date().toISOString()
          });
      } catch (logError) {
        console.error('Ошибка логирования неудачного входа:', logError);
      }
      
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }

  } catch (error) {
    console.error('Ошибка при входе:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 