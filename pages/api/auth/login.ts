import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import { verifyPassword } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { password } = req.body;

    // Проверяем, что пароль передан
    if (!password) {
      return res.status(400).json({ error: 'Пароль обязателен' });
    }

    // Проверяем минимальную длину пароля
    if (password.length < 4) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 4 символа' });
    }

    console.log('Поиск пользователя по паролю...');

    // Получаем всех пользователей из базы данных
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, telegram, role_id, avatar_url, password_hash, created_at, updated_at');

    if (usersError) {
      console.error('Ошибка получения пользователей:', usersError);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Пользователи не найдены' });
    }

    console.log(`Найдено ${users.length} пользователей`);

    // Ищем пользователя с указанным паролем
    let foundUser = null;

    for (const user of users) {
      if (!user.password_hash) {
        continue; // Пропускаем пользователей без пароля
      }

      try {
        const isValidPassword = await verifyPassword(password, user.password_hash);
        
        if (isValidPassword) {
          foundUser = user;
          console.log(`Найден пользователь: ${user.email}`);
          break;
        }
      } catch (error) {
        console.error(`Ошибка проверки пароля для пользователя ${user.email}:`, error);
        continue; // Пропускаем пользователя с ошибкой проверки пароля
      }
    }

    if (!foundUser) {
      console.log('Пользователь с таким паролем не найден');
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    console.log('Пароль верный, устанавливаем куки...');

    // Устанавливаем куки с ID пользователя (24 часа)
    res.setHeader('Set-Cookie', `user_id=${foundUser.id}; HttpOnly; Path=/; Max-Age=86400`);

    // Возвращаем данные пользователя без пароля
    const userResponse = {
      id: foundUser.id,
      email: foundUser.email,
      first_name: foundUser.first_name,
      last_name: foundUser.last_name,
      phone: foundUser.phone,
      telegram: foundUser.telegram,
      role_id: foundUser.role_id,
      avatar_url: foundUser.avatar_url,
      created_at: foundUser.created_at,
      updated_at: foundUser.updated_at
    };

    console.log('Вход выполнен успешно');

    return res.status(200).json({ 
      user: userResponse,
      message: 'Успешный вход' 
    });

  } catch (error) {
    console.error('Ошибка при входе:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 