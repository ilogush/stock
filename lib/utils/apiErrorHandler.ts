/**
 * Утилита для обработки API ошибок
 * Устраняет дублирование showToast вызовов в 60+ местах
 */

export interface ToastFunction {
  (message: string, type: 'success' | 'error' | 'info'): void;
}

export interface ApiError {
  message?: string;
  error?: string;
  details?: string;
  status?: number;
}

/**
 * Обрабатывает API ошибки и показывает toast уведомления
 */
export const handleApiError = (
  error: ApiError | Error | any, 
  showToast: ToastFunction, 
  defaultMessage = 'Произошла ошибка'
): void => {
  let message = defaultMessage;
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'object' && error !== null) {
    message = error.message || error.error || error.details || defaultMessage;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  // Логируем ошибку для отладки
  console.error('API Error:', error);
  
  // Показываем toast уведомление
  showToast(message, 'error');
};

/**
 * Обрабатывает успешные API ответы
 */
export const handleApiSuccess = (
  message: string,
  showToast: ToastFunction,
  type: 'success' | 'info' = 'success'
): void => {
  showToast(message, type);
};

/**
 * Создает обработчик для API операций с автоматическим показом toast
 */
export const createApiHandler = (showToast: ToastFunction) => {
  return {
    /**
     * Обрабатывает ошибку API
     */
    handleError: (error: ApiError | Error | any, defaultMessage?: string) => 
      handleApiError(error, showToast, defaultMessage),
    
    /**
     * Обрабатывает успешный ответ API
     */
    handleSuccess: (message: string, type?: 'success' | 'info') => 
      handleApiSuccess(message, showToast, type),
    
    /**
     * Выполняет API операцию с автоматической обработкой ошибок
     */
    async execute<T>(
      operation: () => Promise<T>,
      successMessage?: string,
      errorMessage?: string
    ): Promise<T | null> {
      try {
        const result = await operation();
        
        if (successMessage) {
          this.handleSuccess(successMessage);
        }
        
        return result;
      } catch (error) {
        this.handleError(error, errorMessage);
        return null;
      }
    }
  };
};

/**
 * Стандартные сообщения об ошибках
 */
export const ERROR_MESSAGES = {
  NETWORK: 'Ошибка сети. Проверьте подключение к интернету.',
  TIMEOUT: 'Запрос превысил время ожидания.',
  UNAUTHORIZED: 'Необходима авторизация.',
  FORBIDDEN: 'Доступ запрещен.',
  NOT_FOUND: 'Ресурс не найден.',
  VALIDATION: 'Ошибка валидации данных.',
  SERVER: 'Ошибка сервера. Попробуйте позже.',
  UNKNOWN: 'Неизвестная ошибка.',
} as const;

/**
 * Стандартные сообщения об успехе
 */
export const SUCCESS_MESSAGES = {
  CREATED: 'Запись успешно создана',
  UPDATED: 'Запись успешно обновлена',
  DELETED: 'Запись успешно удалена',
  SAVED: 'Изменения сохранены',
  UPLOADED: 'Файл успешно загружен',
} as const;
