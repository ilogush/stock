// lib/authService.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from './supabaseClient';
import { supabaseAdmin } from './supabaseAdmin';
import { verifyPassword } from './auth';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  telegram?: string;
  role_id: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  statusCode?: number;
}

export class AuthService {
  /**
   * Получает пользователя из куки
   */
  static async getUserFromCookie(req: NextApiRequest): Promise<AuthResult> {
    try {
      const cookies = req.headers.cookie || '';
      const userIdMatch = cookies.match(/user_id=([^;]*)/);
      const userId = userIdMatch ? userIdMatch[1] : null;

      if (!userId) {
        return {
          success: false,
          error: 'Не авторизован',
          statusCode: 401
        };
      }

      // Получаем данные пользователя
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, telegram, role_id, avatar_url, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return {
          success: false,
          error: 'Пользователь не найден',
          statusCode: 401
        };
      }

      return {
        success: true,
        user: user as User
      };
    } catch (error) {
      console.error('Ошибка при получении пользователя из куки:', error);
      return {
        success: false,
        error: 'Внутренняя ошибка сервера',
        statusCode: 500
      };
    }
  }

  /**
   * Получает пользователя из заголовка x-user-id
   */
  static async getUserFromHeader(req: NextApiRequest): Promise<AuthResult> {
    try {
      const userIdHeader = req.headers['x-user-id'];
      const currentUserId = Array.isArray(userIdHeader) ? parseInt(userIdHeader[0]) : parseInt(userIdHeader || '0');

      if (!currentUserId) {
        return {
          success: false,
          error: 'Не авторизован',
          statusCode: 401
        };
      }

      // Получаем данные пользователя
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, phone, telegram, role_id, avatar_url, created_at, updated_at')
        .eq('id', currentUserId)
        .single();

      if (error || !user) {
        return {
          success: false,
          error: 'Пользователь не найден',
          statusCode: 401
        };
      }

      return {
        success: true,
        user: user as User
      };
    } catch (error) {
      console.error('Ошибка при получении пользователя из заголовка:', error);
      return {
        success: false,
        error: 'Внутренняя ошибка сервера',
        statusCode: 500
      };
    }
  }

  /**
   * Аутентификация пользователя по паролю
   */
  static async authenticateUser(password: string): Promise<AuthResult> {
    try {
      // Проверяем, что пароль передан
      if (!password) {
        return {
          success: false,
          error: 'Пароль обязателен',
          statusCode: 400
        };
      }

      // Проверяем минимальную длину пароля
      if (password.length < 4) {
        return {
          success: false,
          error: 'Пароль должен содержать минимум 4 символа',
          statusCode: 400
        };
      }

      console.log('Поиск пользователя по паролю...');

      // Получаем всех пользователей из базы данных
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, telegram, role_id, avatar_url, password_hash, created_at, updated_at');

      if (usersError) {
        console.error('Ошибка получения пользователей:', usersError);
        return {
          success: false,
          error: 'Ошибка сервера',
          statusCode: 500
        };
      }

      if (!users || users.length === 0) {
        return {
          success: false,
          error: 'Пользователи не найдены',
          statusCode: 401
        };
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
        return {
          success: false,
          error: 'Неверный пароль',
          statusCode: 401
        };
      }

      // Возвращаем данные пользователя без пароля
      const userResponse: User = {
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

      return {
        success: true,
        user: userResponse
      };
    } catch (error) {
      console.error('Ошибка при аутентификации пользователя:', error);
      return {
        success: false,
        error: 'Внутренняя ошибка сервера',
        statusCode: 500
      };
    }
  }

  /**
   * Устанавливает куки для пользователя
   */
  static setUserCookie(res: NextApiResponse, userId: number): void {
    res.setHeader('Set-Cookie', `user_id=${userId}; HttpOnly; Path=/; Max-Age=86400`);
  }

  /**
   * Очищает куки пользователя
   */
  static clearUserCookie(res: NextApiResponse): void {
    res.setHeader('Set-Cookie', 'user_id=; HttpOnly; Path=/; Max-Age=0');
  }

  /**
   * Middleware для проверки аутентификации
   */
  static async requireAuth(req: NextApiRequest, res: NextApiResponse): Promise<User | null> {
    const authResult = await this.getUserFromCookie(req);
    
    if (!authResult.success) {
      res.status(authResult.statusCode || 401).json({ error: authResult.error });
      return null;
    }

    return authResult.user!;
  }

  /**
   * Middleware для проверки аутентификации через заголовок
   */
  static async requireAuthHeader(req: NextApiRequest, res: NextApiResponse): Promise<User | null> {
    const authResult = await this.getUserFromHeader(req);
    
    if (!authResult.success) {
      res.status(authResult.statusCode || 401).json({ error: authResult.error });
      return null;
    }

    return authResult.user!;
  }
}
