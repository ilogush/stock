/**
 * Упрощенный обработчик ошибок
 */

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  status: number;
}

// Универсальная обработка ошибок
export function handleApiError(error: any): ApiError {
  if (error instanceof Error) {
    return {
      message: error.message,
      status: 400
    };
  }
  
  if (error?.code) {
    switch (error.code) {
      case '23505': // unique_violation
        return {
          message: 'Запись с такими данными уже существует',
          code: 'DUPLICATE_ENTRY',
          status: 409
        };
      case '23503': // foreign_key_violation
        return {
          message: 'Нарушение целостности данных',
          code: 'FOREIGN_KEY_VIOLATION',
          status: 400
        };
      case '42P01': // undefined_table
        return {
          message: 'Таблица не найдена',
          code: 'TABLE_NOT_FOUND',
          status: 500
        };
      default:
        return {
          message: error.message || 'Неизвестная ошибка базы данных',
          code: error.code,
          status: 500
        };
    }
  }

  return {
    message: error?.message || 'Внутренняя ошибка сервера',
    code: 'INTERNAL_ERROR',
    status: 500
  };
}

// Логирование ошибок
export function logError(error: any, context?: string) {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const contextInfo = context ? ` [${context}]` : '';
  
  console.error(`${timestamp}${contextInfo}: ${errorMessage}`);
  
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
} 