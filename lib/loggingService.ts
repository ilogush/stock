/**
 * Централизованный сервис логирования
 * Обеспечивает единообразное логирование во всем приложении
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  userId?: number;
  endpoint?: string;
  action?: string;
  resource?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
}

/**
 * Сервис логирования
 */
export class LoggingService {
  private static instance: LoggingService;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Логирует ошибку
   */
  public error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Логирует предупреждение
   */
  public warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Логирует информационное сообщение
   */
  public info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Логирует отладочную информацию
   */
  public debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  /**
   * Логирует API запрос
   */
  public logApiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 400 ? LogLevel.ERROR : 
                  statusCode >= 300 ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, `${method} ${endpoint} - ${statusCode}`, {
      ...context,
      endpoint,
      duration
    });
  }

  /**
   * Логирует действие пользователя
   */
  public logUserAction(
    action: string,
    resource: string,
    success: boolean,
    context?: LogContext
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `User action: ${action} on ${resource} - ${success ? 'SUCCESS' : 'FAILED'}`;
    
    this.log(level, message, {
      ...context,
      action,
      resource
    });
  }

  /**
   * Логирует производительность
   */
  public logPerformance(
    operation: string,
    duration: number,
    context?: LogContext
  ): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
    const message = `Performance: ${operation} took ${duration}ms`;
    
    this.log(level, message, {
      ...context,
      duration
    });
  }

  /**
   * Логирует безопасность
   */
  public logSecurity(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext
  ): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR :
                  severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, `Security: ${event} (${severity})`, context);
  }

  /**
   * Основной метод логирования
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      } : undefined
    };

    // Форматируем лог для консоли
    const formattedLog = this.formatLog(logEntry);
    
    // Выводим в консоль
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedLog);
        break;
    }

    // В продакшене можно добавить отправку в внешние сервисы логирования
    if (!this.isDevelopment && level === LogLevel.ERROR) {
      this.sendToExternalLogger(logEntry);
    }
  }

  /**
   * Форматирует лог для вывода
   */
  private formatLog(logEntry: LogEntry): string {
    const { level, message, timestamp, context, error } = logEntry;
    
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (context) {
      const contextParts = [];
      if (context.userId) contextParts.push(`user:${context.userId}`);
      if (context.endpoint) contextParts.push(`endpoint:${context.endpoint}`);
      if (context.action) contextParts.push(`action:${context.action}`);
      if (context.resource) contextParts.push(`resource:${context.resource}`);
      if (context.duration) contextParts.push(`duration:${context.duration}ms`);
      
      if (contextParts.length > 0) {
        formatted += ` | ${contextParts.join(' ')}`;
      }
    }
    
    if (error) {
      formatted += `\nError: ${error.name}: ${error.message}`;
      if (error.stack && this.isDevelopment) {
        formatted += `\nStack: ${error.stack}`;
      }
    }
    
    return formatted;
  }

  /**
   * Отправляет критичные ошибки во внешние сервисы
   */
  private sendToExternalLogger(logEntry: LogEntry): void {
    // Здесь можно добавить интеграцию с внешними сервисами логирования
    // Например: Sentry, LogRocket, DataDog и т.д.
    
    // Пока просто логируем в файл или отправляем уведомление
    console.log('CRITICAL ERROR - should be sent to external logger:', logEntry);
  }
}

// Экспортируем singleton instance
export const logger = LoggingService.getInstance();

/**
 * Утилиты для быстрого логирования
 */
export const log = {
  error: (message: string, error?: Error, context?: LogContext) => 
    logger.error(message, error, context),
  
  warn: (message: string, context?: LogContext) => 
    logger.warn(message, context),
  
  info: (message: string, context?: LogContext) => 
    logger.info(message, context),
  
  debug: (message: string, context?: LogContext) => 
    logger.debug(message, context),
  
  api: (method: string, endpoint: string, statusCode: number, duration: number, context?: LogContext) =>
    logger.logApiRequest(method, endpoint, statusCode, duration, context),
  
  user: (action: string, resource: string, success: boolean, context?: LogContext) =>
    logger.logUserAction(action, resource, success, context),
  
  performance: (operation: string, duration: number, context?: LogContext) =>
    logger.logPerformance(operation, duration, context),
  
  security: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext) =>
    logger.logSecurity(event, severity, context)
};
