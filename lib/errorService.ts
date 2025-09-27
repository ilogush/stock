/**
 * Единый сервис для обработки ошибок
 * Централизует логику обработки ошибок во всех API endpoints
 */

import { NextApiResponse } from 'next';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
  timestamp: string;
  context?: string;
}

export interface ErrorContext {
  endpoint?: string;
  userId?: number;
  action?: string;
  resource?: string;
  metadata?: Record<string, any>;
}

/**
 * Типы ошибок
 */
export const ERROR_TYPES = {
  // Аутентификация и авторизация
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Валидация данных
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // База данных
  DATABASE_ERROR: 'DATABASE_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  FOREIGN_KEY_CONSTRAINT: 'FOREIGN_KEY_CONSTRAINT',
  
  // Бизнес-логика
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_OPERATION: 'INVALID_OPERATION',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  
  // Системные ошибки
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const;

/**
 * Создает стандартизированную ошибку API
 */
export function createApiError(
  type: keyof typeof ERROR_TYPES,
  message: string,
  details?: any,
  context?: ErrorContext
): ApiError {
  const statusCodes: Record<keyof typeof ERROR_TYPES, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    INVALID_TOKEN: 401,
    VALIDATION_ERROR: 400,
    MISSING_REQUIRED_FIELD: 400,
    INVALID_FORMAT: 400,
    DATABASE_ERROR: 500,
    RECORD_NOT_FOUND: 404,
    DUPLICATE_RECORD: 409,
    FOREIGN_KEY_CONSTRAINT: 400,
    INSUFFICIENT_STOCK: 400,
    INVALID_OPERATION: 400,
    RESOURCE_LOCKED: 423,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    RATE_LIMIT_EXCEEDED: 429
  };

  return {
    code: ERROR_TYPES[type],
    message,
    details,
    statusCode: statusCodes[type],
    timestamp: new Date().toISOString(),
    context: context?.endpoint
  };
}

/**
 * Обрабатывает ошибки базы данных Supabase
 */
export function handleDatabaseError(error: any, context?: ErrorContext): ApiError {
  console.error('Database error:', error, context);

  // Обработка специфичных ошибок Supabase
  if (error.code) {
    switch (error.code) {
      case 'PGRST116': // No rows returned
        return createApiError('RECORD_NOT_FOUND', 'Запись не найдена', error, context);
      
      case '23505': // Unique constraint violation
        return createApiError('DUPLICATE_RECORD', 'Запись с такими данными уже существует', error, context);
      
      case '23503': // Foreign key constraint violation
        return createApiError('FOREIGN_KEY_CONSTRAINT', 'Нарушение связей между таблицами', error, context);
      
      case '23502': // Not null constraint violation
        return createApiError('VALIDATION_ERROR', 'Обязательное поле не заполнено', error, context);
      
      case 'PGRST204': // Column not found
        return createApiError('DATABASE_ERROR', 'Ошибка структуры базы данных', error, context);
      
      default:
        return createApiError('DATABASE_ERROR', 'Ошибка базы данных', error, context);
    }
  }

  return createApiError('DATABASE_ERROR', 'Неизвестная ошибка базы данных', error, context);
}

/**
 * Обрабатывает ошибки валидации
 */
export function handleValidationError(
  field: string,
  message: string,
  context?: ErrorContext
): ApiError {
  return createApiError('VALIDATION_ERROR', `Ошибка валидации поля "${field}": ${message}`, { field }, context);
}

/**
 * Обрабатывает ошибки аутентификации
 */
export function handleAuthError(message: string, context?: ErrorContext): ApiError {
  return createApiError('UNAUTHORIZED', message, null, context);
}

/**
 * Обрабатывает ошибки авторизации
 */
export function handlePermissionError(message: string, context?: ErrorContext): ApiError {
  return createApiError('FORBIDDEN', message, null, context);
}

/**
 * Отправляет ошибку в HTTP ответ
 */
export function sendErrorResponse(res: NextApiResponse, error: ApiError): void {
  // Логируем ошибку
  console.error(`[${error.code}] ${error.message}`, {
    statusCode: error.statusCode,
    context: error.context,
    details: error.details,
    timestamp: error.timestamp
  });

  // Отправляем ответ
  res.status(error.statusCode).json({
    error: error.message,
    code: error.code,
    details: error.details,
    timestamp: error.timestamp
  });
}

/**
 * Обрабатывает неожиданные ошибки
 */
export function handleUnexpectedError(error: any, context?: ErrorContext): ApiError {
  console.error('Unexpected error:', error, context);
  
  return createApiError('INTERNAL_ERROR', 'Внутренняя ошибка сервера', {
    originalError: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  }, context);
}

/**
 * Валидирует обязательные поля
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[],
  context?: ErrorContext
): ApiError | null {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    return createApiError(
      'MISSING_REQUIRED_FIELD',
      `Отсутствуют обязательные поля: ${missingFields.join(', ')}`,
      { missingFields },
      context
    );
  }

  return null;
}

/**
 * Валидирует числовые поля
 */
export function validateNumericFields(
  data: Record<string, any>,
  numericFields: string[],
  context?: ErrorContext
): ApiError | null {
  const invalidFields = numericFields.filter(field => {
    const value = data[field];
    return value !== undefined && value !== null && (isNaN(Number(value)) || Number(value) < 0);
  });

  if (invalidFields.length > 0) {
    return createApiError(
      'INVALID_FORMAT',
      `Некорректные числовые поля: ${invalidFields.join(', ')}`,
      { invalidFields },
      context
    );
  }

  return null;
}

/**
 * Валидирует email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Валидирует HEX-код цвета
 */
export function validateHexColor(hex: string): boolean {
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  return hexRegex.test(hex);
}

/**
 * Безопасно извлекает сообщение об ошибке
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.error) {
    return error.error;
  }
  
  return 'Неизвестная ошибка';
}
