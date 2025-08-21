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

    // Если не указан email и username, но указан пароль - ищем пользователя только по паролю
    if (!email && !username) {
      if (!password) {
        return res.status(400).json({ error: 'Пароль обязателен' });
      }
      
      let user;
      
      // Ищем пользователя только по паролю
      const result = await supabase
        .from('users')
        .select('*');
      
      if (result.data && result.data.length > 0) {
        // Проверяем пароль для каждого пользователя
        for (const candidateUser of result.data) {
          const isValidPassword = await verifyPassword(password, candidateUser.password_hash);
          
          if (isValidPassword) {
            user = candidateUser;
            user.password_verified = true;
            break;
          }
        }
        
        if (!user) {
          return res.status(401).json({ error: 'Неверный пароль' });
        }
      } else {
        return res.status(401).json({ error: 'Пользователи не найдены' });
      }
    } else {
      // Обычная логика поиска по email или username

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
        // Ищем всех пользователей с таким именем или фамилией
        let result = await supabase
          .from('users')
          .select('*')
          .or(`first_name.eq.${username},last_name.eq.${username},first_name.ilike.%${username}%,last_name.ilike.%${username}%`);
        
        if (result.data && result.data.length > 0) {
          // Если найдено несколько пользователей, проверяем пароль для каждого
          if (result.data.length > 1) {
            for (const candidateUser of result.data) {
              if (candidateUser.is_blocked || candidateUser.is_deleted) {
                continue; // Пропускаем заблокированных и удаленных
              }
              
              const isValidPassword = await verifyPassword(password, candidateUser.password_hash);
              
              if (isValidPassword) {
                user = candidateUser;
                user.password_verified = true; // Отмечаем, что пароль уже проверен
                break;
              }
            }
            
            if (!user) {
              error = { message: 'Неверный пароль' };
            }
          } else {
            // Если найден только один пользователь
            user = result.data[0];
          }
          error = null;
        } else {
          user = null;
          error = result.error || { message: 'Пользователь не найден' };
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Проверяем статус
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Пользователь заблокирован' });
    }
    
    if (user.is_deleted) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Проверяем пароль (только если не проверяли ранее для множественных пользователей)
    if (!user.password_verified) {
      const isValidPassword = await verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }
    }

    // Устанавливаем куки с ID пользователя (24 часа)
    res.setHeader('Set-Cookie', `user_id=${user.id}; HttpOnly; Path=/; Max-Age=86400`);

    // Возвращаем данные пользователя без пароля
    const { password_hash, ...userWithoutPassword } = user;
    
    return res.status(200).json({ 
      user: userWithoutPassword,
      message: 'Успешный вход' 
    });

  } catch (error) {
    console.error('Ошибка при входе:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 