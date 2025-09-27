/**
 * Единая система для всего проекта
 * Экспортирует все унифицированные модули
 */

// Обработка ошибок
export {
  createApiError,
  handleDatabaseError,
  handleValidationError,
  handleAuthError,
  handleAuthzError,
  sendErrorResponse,
  sendValidationErrors,
  handleAndSendError,
  withErrorHandling,
  logError,
  ERROR_TYPES,
  type ApiError,
  type ValidationError,
  type ErrorResponse
} from './errorHandler';

// Валидация
export {
  UnifiedValidator,
  validator,
  validationSchemas,
  quickValidators,
  type ValidationResult,
  type ValidationRule,
  type ValidationRuleConfig
} from './validator';


// API Middleware
export {
  createApiHandler,
  apiConfigs,
  apiUtils,
  withLogging,
  withPerformanceTracking,
  withApiMiddleware,
  type ApiHandler,
  type ApiConfig
} from './apiMiddleware';
