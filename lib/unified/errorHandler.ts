import { NextApiResponse } from 'next';

/**
 * Единая система обработки ошибок для всего проекта
 */

export interface ApiError {
  message: string;
  code?: string;
  status: number;
  details?: any;
  context?: string;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
  context?: string;
  timestamp: string;
  validationErrors?: ValidationError[];
}

/**
 * Типы ошибок
 */
export const ERROR_TYPES = {
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400 },
  AUTHENTICATION_ERROR: { code: 'AUTH_ERROR', status: 401 },
  AUTHORIZATION_ERROR: { code: 'AUTHZ_ERROR', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  CONFLICT: { code: 'CONFLICT', status: 409 },
  DATABASE_ERROR: { code: 'DB_ERROR', status: 500 },
  EXTERNAL_SERVICE_ERROR: { code: 'EXTERNAL_ERROR', status: 502 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 },
  RATE_LIMIT_ERROR: { code: 'RATE_LIMIT', status: 429 }
} as const;

/**
 * Создает стандартизированную ошибку API
 */
export function createApiError(
  type: keyof typeof ERROR_TYPES,
  message: string,
  details?: any,
  context?: string
): ApiError {
  const errorType = ERROR_TYPES[type];
  
  return {
    message,
    code: errorType.code,
    status: errorType.status,
    details,
    context,
    timestamp: new Date().toISOString()
  };
}

/**
 * Обрабатывает ошибки базы данных Supabase
 */
export function handleDatabaseError(error: any, context?: string): ApiError {
  console.error('Database error:', error, context);

  if (error.code) {
    switch (error.code) {
      case 'PGRST116': // No rows returned
        return createApiError('NOT_FOUND', 'Запись не найдена', error, context);
      
      case '23505': // Unique constraint violation
        return createApiError('CONFLICT', 'Запись с такими данными уже существует', error, context);
      
      case '23503': // Foreign key constraint violation
        return createApiError('VALIDATION_ERROR', 'Нарушение связей между таблицами', error, context);
      
      case '23502': // Not null constraint violation
        return createApiError('VALIDATION_ERROR', 'Обязательное поле не заполнено', error, context);
      
      case 'PGRST204': // Column not found
        return createApiError('DATABASE_ERROR', 'Ошибка структуры базы данных', error, context);
      
      case 'PGRST200': // Relationship not found
        return createApiError('DATABASE_ERROR', 'Ошибка связей в базе данных', error, context);
      
      case 'PGRST100': // SQL syntax error
        return createApiError('DATABASE_ERROR', 'Ошибка SQL запроса', error, context);
      
      case '22P02': // Invalid input syntax
        return createApiError('VALIDATION_ERROR', 'Некорректный формат данных', error, context);
      
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
  value?: any,
  context?: string
): ApiError {
  return createApiError('VALIDATION_ERROR', message, { field, value }, context);
}

/**
 * Обрабатывает ошибки аутентификации
 */
export function handleAuthError(message: string = 'Требуется авторизация', context?: string): ApiError {
  return createApiError('AUTHENTICATION_ERROR', message, undefined, context);
}

/**
 * Обрабатывает ошибки авторизации
 */
export function handleAuthzError(message: string = 'Недостаточно прав', context?: string): ApiError {
  return createApiError('AUTHORIZATION_ERROR', message, undefined, context);
}

/**
 * Отправляет ошибку в HTTP ответе
 */
export function sendErrorResponse(res: NextApiResponse, error: ApiError): void {
  const errorResponse: ErrorResponse = {
    error: error.message,
    code: error.code,
    details: error.details,
    context: error.context,
    timestamp: error.timestamp
  };

  res.status(error.status).json(errorResponse);
}

/**
 * Отправляет ошибки валидации
 */
export function sendValidationErrors(
  res: NextApiResponse, 
  errors: ValidationError[], 
  context?: string
): void {
  const errorResponse: ErrorResponse = {
    error: errors.length === 1 
      ? errors[0].message 
      : `Ошибки валидации: ${errors.length} полей`,
    code: ERROR_TYPES.VALIDATION_ERROR.code,
    details: errors,
    context,
    timestamp: new Date().toISOString(),
    validationErrors: errors
  };

  res.status(ERROR_TYPES.VALIDATION_ERROR.status).json(errorResponse);
}

/**
 * Обрабатывает и отправляет любую ошибку
 */
export function handleAndSendError(
  res: NextApiResponse, 
  error: any, 
  context?: string
): void {
  let apiError: ApiError;

  if (error.code && typeof error.status === 'number') {
    // Уже обработанная ошибка API
    apiError = error;
  } else if (error.code) {
    // Ошибка базы данных
    apiError = handleDatabaseError(error, context);
  } else if (error instanceof Error) {
    // Обычная ошибка JavaScript
    apiError = createApiError('INTERNAL_ERROR', error.message, error.stack, context);
  } else {
    // Неизвестная ошибка
    apiError = createApiError('INTERNAL_ERROR', 'Внутренняя ошибка сервера', error, context);
  }

  sendErrorResponse(res, apiError);
}

/**
 * Middleware для обработки ошибок в API роутах
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<void>
) {
  return async (req: any, res: NextApiResponse, ...args: any[]): Promise<void> => {
    try {
      await handler(req, res, ...args);
    } catch (error) {
      handleAndSendError(res, error, `${req.method} ${req.url}`);
    }
  };
}

/**
 * Логирует ошибку для отладки
 */
export function logError(error: any, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error
  };

  console.error('🚨 API Error:', JSON.stringify(errorInfo, null, 2));
}
