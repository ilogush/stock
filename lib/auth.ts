import { supabaseAdmin } from './supabaseAdmin';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  telegram: string | null;
  role_id: number;
  avatar_url: string | null;
  is_blocked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  permissions: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Хеширует пароль
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Проверяет пароль
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Авторизация пользователя по email и паролю
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    // Получаем пользователя из базы
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return null;
    }

    // Проверяем пароль
    if (!userData.password_hash) {
      return null;
    }

    const isValidPassword = await verifyPassword(password, userData.password_hash);
    if (!isValidPassword) {
      return null;
    }

    // Убираем пароль из ответа
    const { password_hash, ...userWithoutPassword } = userData;
    return userWithoutPassword;
  } catch (error) {
    console.error('Ошибка аутентификации:', error);
    return null;
  }
}

// Получает пользователя по ID
export async function getUserById(userId: number): Promise<User | null> {
  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return null;
    }

    // Убираем пароль из ответа
    const { password_hash, ...userWithoutPassword } = userData;
    return userWithoutPassword;
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    return null;
  }
}

// Проверяет есть ли у пользователя определенную роль
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

// Проверяет есть ли у пользователя определенные разрешения
export function hasPermission(role: Role, permission: string): boolean {
  if (role.permissions.all) {
    return true;
  }

  const parts = permission.split('.');
  let current = role.permissions;

  for (const part of parts) {
    if (current[part] === undefined) {
      return false;
    }
    if (current[part] === true) {
      return true;
    }
    current = current[part];
  }

  return false;
}

// Роли с полным доступом к системе
export const ADMIN_ROLES = ['admin', 'director'];

// Роли с ограниченным доступом
export const USER_ROLES = ['user'];

// Страницы доступные только для обычных пользователей
export const USER_ONLY_PAGES = ['/profile'];

// Страницы доступные для всех авторизованных пользователей
export const PUBLIC_PAGES = ['/login', '/', '/profile'];

// Проверяет доступ к странице
export function canAccessPage(userRole: string, pathname: string): boolean {
  // Админы и директора могут заходить везде
  if (ADMIN_ROLES.includes(userRole)) {
    return true;
  }

  // Обычные пользователи могут заходить только на разрешенные страницы
  if (USER_ROLES.includes(userRole)) {
    return PUBLIC_PAGES.includes(pathname) || USER_ONLY_PAGES.includes(pathname);
  }

  // Остальные роли имеют доступ ко всем страницам кроме USER_ONLY_PAGES
  return !USER_ONLY_PAGES.includes(pathname) || PUBLIC_PAGES.includes(pathname);
} 