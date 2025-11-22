/**
 * Утилиты для безопасной работы с куки
 */

import { NextApiResponse } from 'next';

/**
 * Безопасно устанавливает куки с необходимыми флагами безопасности
 * @param res - Next.js response объект
 * @param name - Имя куки
 * @param value - Значение куки
 * @param options - Дополнительные опции
 */
export function setSecureCookie(
  res: NextApiResponse,
  name: string,
  value: string,
  options: {
    maxAge?: number; // В секундах
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    path?: string;
  } = {}
): void {
  const {
    maxAge = 86400, // 24 часа по умолчанию
    httpOnly = true,
    secure = process.env.NODE_ENV === 'production', // Secure только в production
    sameSite = 'Strict',
    path = '/'
  } = options;

  const cookieParts = [
    `${name}=${value}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    httpOnly ? 'HttpOnly' : '',
    secure ? 'Secure' : '',
    `SameSite=${sameSite}`
  ].filter(Boolean); // Убираем пустые строки

  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

/**
 * Безопасно очищает куки
 * @param res - Next.js response объект
 * @param name - Имя куки
 * @param path - Путь куки (должен совпадать с путем при установке)
 */
export function clearSecureCookie(
  res: NextApiResponse,
  name: string,
  path: string = '/'
): void {
  const cookieParts = [
    `${name}=`,
    `Path=${path}`,
    'Max-Age=0',
    'HttpOnly',
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
    'SameSite=Strict'
  ].filter(Boolean);

  res.setHeader('Set-Cookie', cookieParts.join('; '));
}


