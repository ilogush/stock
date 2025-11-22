/**
 * CSRF защита для API endpoints
 * Генерирует и проверяет CSRF токены для защиты от межсайтовых подделок запросов
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes, createHash } from 'crypto';
import { parse } from 'cookie';
import { setSecureCookie, clearSecureCookie } from './utils/cookieUtils';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_COOKIE = 'csrf-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';

/**
 * Генерирует CSRF токен
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Получает CSRF токен из куки
 */
export function getCsrfTokenFromCookie(req: NextApiRequest): string | null {
  const cookies = parse(req.headers.cookie || '');
  return cookies[CSRF_TOKEN_COOKIE] || null;
}

/**
 * Устанавливает CSRF токен в куки
 */
export function setCsrfTokenCookie(res: NextApiResponse, token: string): void {
  setSecureCookie(res, CSRF_TOKEN_COOKIE, token, {
    maxAge: 24 * 60 * 60, // 24 часа
    httpOnly: false, // Должен быть доступен для JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/'
  });
}

/**
 * Проверяет CSRF токен
 */
export function verifyCsrfToken(req: NextApiRequest): boolean {
  // GET, HEAD, OPTIONS запросы не требуют CSRF токена
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
    return true;
  }

  const cookieToken = getCsrfTokenFromCookie(req);
  const headerToken = req.headers[CSRF_TOKEN_HEADER] as string;

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Сравниваем токены (защита от timing attacks)
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Безопасное сравнение строк (защита от timing attacks)
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Middleware для CSRF защиты
 */
export function withCsrfProtection(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Для GET запросов генерируем новый токен, если его нет
    if (req.method === 'GET') {
      const existingToken = getCsrfTokenFromCookie(req);
      if (!existingToken) {
        const token = generateCsrfToken();
        setCsrfTokenCookie(res, token);
      }
      return handler(req, res);
    }

    // Для модифицирующих запросов проверяем токен
    if (!verifyCsrfToken(req)) {
      return res.status(403).json({
        error: 'CSRF токен недействителен или отсутствует',
        code: 'CSRF_TOKEN_INVALID'
      });
    }

    return handler(req, res);
  };
}

/**
 * Генерирует и возвращает CSRF токен для клиента
 */
export function getCsrfToken(req: NextApiRequest, res: NextApiResponse): string {
  let token = getCsrfTokenFromCookie(req);
  
  if (!token) {
    token = generateCsrfToken();
    setCsrfTokenCookie(res, token);
  }
  
  return token;
}

