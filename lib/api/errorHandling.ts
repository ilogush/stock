/**
 * Универсальная система обработки ошибок API
 */

import { NextApiResponse } from 'next';
import { createErrorResponse } from './standardResponse';

export interface DatabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Коды ошибок базы данных PostgreSQL
 */
export const DB_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  UNDEFINED_TABLE: '42P01',
  UNDEFINED_COLUMN: '42703',
  INVALID_TEXT_REPRESENTATION: '22P02',
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01'
} as const;

/**
 * Переводит коды ошибок БД на русский
 */
export function translateDatabaseError(error: DatabaseError): string {
  if (!error.code) {
    return error.message || 'Неизвестная ошибка базы данных';
  }

  switch (error.code) {
    case DB_ERROR_CODES.UNIQUE_VIOLATION:
      return 'Запись с такими данными уже существует';
    
    case DB_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return 'Нарушение целостности данных. Проверьте связанные записи';
    
    case DB_ERROR_CODES.NOT_NULL_VIOLATION:
      return 'Обязательное поле не может быть пустым';
    
    case DB_ERROR_CODES.CHECK_VIOLATION:
      return 'Значение не соответствует ограничениям';
    
    case DB_ERROR_CODES.UNDEFINED_TABLE:
      return 'Таблица не найдена';
    
    case DB_ERROR_CODES.UNDEFINED_COLUMN:
      return 'Поле не найдено';
    
    case DB_ERROR_CODES.INVALID_TEXT_REPRESENTATION:
      return 'Неверный формат данных';
    
    case DB_ERROR_CODES.SERIALIZATION_FAILURE:
      return 'Конфликт параллельных операций. Повторите попытку';
    
    case DB_ERROR_CODES.DEADLOCK_DETECTED:
      return 'Временная блокировка. Повторите попытку';
    
    default:
      return error.message || `Ошибка базы данных (код: ${error.code})`;
  }
}

/**
 * Обрабатывает ошибки Supabase и возвращает стандартизированный ответ
 */
export function handleDatabaseError(error: any, res: NextApiResponse, context?: string) {
  console.error(`Database error${context ? ` in ${context}` : ''}:`, error);
  
  const translatedMessage = translateDatabaseError(error);
  const errorResponse = createErrorResponse(
    translatedMessage,
    undefined,
    {
      context,
      code: error.code,
      timestamp: new Date().toISOString()
    }
  );
  
  // Определяем HTTP статус на основе типа ошибки
  let statusCode = 500;
  
  if (error.code) {
    switch (error.code) {
      case DB_ERROR_CODES.UNIQUE_VIOLATION:
        statusCode = 409; // Conflict
        break;
      case DB_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      case DB_ERROR_CODES.NOT_NULL_VIOLATION:
      case DB_ERROR_CODES.CHECK_VIOLATION:
      case DB_ERROR_CODES.INVALID_TEXT_REPRESENTATION:
        statusCode = 400; // Bad Request
        break;
      case DB_ERROR_CODES.UNDEFINED_TABLE:
      case DB_ERROR_CODES.UNDEFINED_COLUMN:
        statusCode = 500; // Internal Server Error
        break;
      default:
        statusCode = 500;
    }
  }
  
  return res.status(statusCode).json(errorResponse);
}

/**
 * Обрабатывает ошибки валидации
 */
export function handleValidationErrors(
  errors: ValidationError[], 
  res: NextApiResponse,
  context?: string
) {
  const errorMessages = errors.map(err => `${err.field}: ${err.message}`);
  const mainError = errors.length === 1 
    ? errors[0].message 
    : `Ошибки валидации: ${errors.length} полей`;
  
  const errorResponse = createErrorResponse(
    mainError,
    errorMessages,
    {
      context,
      validationErrors: errors,
      timestamp: new Date().toISOString()
    }
  );
  
  return res.status(400).json(errorResponse);
}

/**
 * Обрабатывает общие ошибки
 */
export function handleGenericError(
  error: any, 
  res: NextApiResponse, 
  context?: string,
  defaultMessage = 'Внутренняя ошибка сервера'
) {
  console.error(`Generic error${context ? ` in ${context}` : ''}:`, error);
  
  const message = error instanceof Error ? error.message : defaultMessage;
  const errorResponse = createErrorResponse(
    message,
    undefined,
    {
      context,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  );
  
  return res.status(500).json(errorResponse);
}

/**
 * Обрабатывает ошибки авторизации
 */
export function handleAuthError(
  message: string, 
  res: NextApiResponse,
  statusCode: number = 401
) {
  const errorResponse = createErrorResponse(
    message,
    undefined,
    {
      context: 'authentication',
      timestamp: new Date().toISOString()
    }
  );
  
  return res.status(statusCode).json(errorResponse);
}

/**
 * Обрабатывает ошибки доступа (403)
 */
export function handlePermissionError(
  message = 'Недостаточно прав для выполнения операции',
  res: NextApiResponse
) {
  return handleAuthError(message, res, 403);
}

/**
 * Обрабатывает ошибки "не найдено" (404)
 */
export function handleNotFoundError(
  resource: string,
  res: NextApiResponse
) {
  const errorResponse = createErrorResponse(
    `${resource} не найден`,
    undefined,
    {
      context: 'not_found',
      resource,
      timestamp: new Date().toISOString()
    }
  );
  
  return res.status(404).json(errorResponse);
}

/**
 * Middleware для отлова всех ошибок в API роутах
 */
export function withErrorHandling(handler: Function) {
  return async (req: any, res: NextApiResponse) => {
    try {
      return await handler(req, res);
    } catch (error) {
      // Если это ошибка БД
      if (error && typeof error === 'object' && 'code' in error) {
        return handleDatabaseError(error, res, 'API handler');
      }
      
      // Общая ошибка
      return handleGenericError(error, res, 'API handler');
    }
  };
}
