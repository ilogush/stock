import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandling } from './errorHandler';
import { sendValidationErrors } from './errorHandler';
import { validator, validationSchemas } from './validator';

/**
 * Единый API middleware для стандартизации всех роутов
 */

export interface ApiHandler {
  (req: NextApiRequest, res: NextApiResponse): Promise<void>;
}

export interface ApiConfig {
  methods: string[];
  validation?: {
    body?: Record<string, any>;
    query?: Record<string, any>;
  };
  auth?: boolean;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

/**
 * Базовый middleware для API роутов
 */
export function createApiHandler(
  config: ApiConfig,
  handler: ApiHandler
): ApiHandler {
  let wrappedHandler = handler;

  // Добавляем обработку ошибок
  wrappedHandler = withErrorHandling(wrappedHandler);


  // Возвращаем финальный обработчик
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Проверяем метод
    if (!config.methods.includes(req.method || '')) {
      res.status(405).json({
        error: `Метод ${req.method} не поддерживается`,
        allowedMethods: config.methods
      });
      return;
    }

    // Валидация query параметров
    if (config.validation?.query) {
      const queryResult = validator.validateObject(req.query, config.validation.query);
      if (!queryResult.isValid) {
        sendValidationErrors(res, queryResult.errors, 'query validation');
        return;
      }
    }

    // Валидация body
    if (config.validation?.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      const bodyResult = validator.validateObject(req.body, config.validation.body);
      if (!bodyResult.isValid) {
        sendValidationErrors(res, bodyResult.errors, 'body validation');
        return;
      }
    }

    // Выполняем основной обработчик
    await wrappedHandler(req, res);
  };
}

/**
 * Предустановленные конфигурации для разных типов API
 */
export const apiConfigs = {
  // CRUD операции для списков
  list: (cacheType: keyof typeof cacheMiddleware = 'products'): ApiConfig => ({
    methods: ['GET'],
    cache: cacheType,
    validation: {
      query: {
        page: [{ type: 'number' }],
        limit: [{ type: 'number' }],
        search: [{ type: 'string' }]
      }
    }
  }),

  // CRUD операции для отдельных записей
  item: (cacheType: keyof typeof cacheMiddleware = 'products'): ApiConfig => ({
    methods: ['GET', 'PUT', 'DELETE'],
    cache: cacheType,
    validation: {
      query: {
        id: [{ type: 'required' }, { type: 'number' }]
      }
    }
  }),

  // Создание записей
  create: (validationSchema: Record<string, any>): ApiConfig => ({
    methods: ['POST'],
    cache: 'no-cache',
    validation: {
      body: validationSchema
    }
  }),

  // Обновление записей
  update: (validationSchema: Record<string, any>): ApiConfig => ({
    methods: ['PUT', 'PATCH'],
    cache: 'no-cache',
    validation: {
      body: validationSchema
    }
  }),

  // Удаление записей
  delete: (): ApiConfig => ({
    methods: ['DELETE'],
    cache: 'no-cache'
  }),

  // Аутентификация
  auth: (): ApiConfig => ({
    methods: ['POST'],
    cache: 'no-cache'
  }),

  // Статические данные
  static: (): ApiConfig => ({
    methods: ['GET'],
    cache: 'colors' // Используем кэш для статических данных
  })
};

/**
 * Утилиты для создания стандартных API роутов
 */
export const apiUtils = {
  /**
   * Создает GET роут для списка
   */
  createListRoute: (
    handler: ApiHandler,
    cacheType: keyof typeof cacheMiddleware = 'products'
  ) => createApiHandler(apiConfigs.list(cacheType), handler),

  /**
   * Создает роут для отдельной записи
   */
  createItemRoute: (
    handler: ApiHandler,
    cacheType: keyof typeof cacheMiddleware = 'products'
  ) => createApiHandler(apiConfigs.item(cacheType), handler),

  /**
   * Создает POST роут для создания
   */
  createCreateRoute: (
    handler: ApiHandler,
    validationSchema: Record<string, any>
  ) => createApiHandler(apiConfigs.create(validationSchema), handler),

  /**
   * Создает PUT/PATCH роут для обновления
   */
  createUpdateRoute: (
    handler: ApiHandler,
    validationSchema: Record<string, any>
  ) => createApiHandler(apiConfigs.update(validationSchema), handler),

  /**
   * Создает DELETE роут
   */
  createDeleteRoute: (handler: ApiHandler) => 
    createApiHandler(apiConfigs.delete(), handler),

  /**
   * Создает роут для статических данных
   */
  createStaticRoute: (handler: ApiHandler) => 
    createApiHandler(apiConfigs.static(), handler)
};

/**
 * Middleware для логирования API запросов
 */
export function withLogging(handler: ApiHandler): ApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const start = Date.now();
    const { method, url, query, body } = req;

    console.log(`🚀 API ${method} ${url}`, {
      query: Object.keys(query).length > 0 ? query : undefined,
      body: body && Object.keys(body).length > 0 ? body : undefined
    });

    await handler(req, res);

    const duration = Date.now() - start;
    const status = res.statusCode;

    console.log(`✅ API ${method} ${url} - ${status} (${duration}ms)`);
  };
}

/**
 * Middleware для измерения производительности
 */
export function withPerformanceTracking(handler: ApiHandler): ApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const start = Date.now();
    const startMemory = process.memoryUsage();

    await handler(req, res);

    const duration = Date.now() - start;
    const endMemory = process.memoryUsage();
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Логируем медленные запросы
    if (duration > 1000) {
      console.warn(`🐌 Медленный запрос: ${req.method} ${req.url} - ${duration}ms (${memoryDelta} bytes)`);
    }

    // Добавляем заголовки производительности
    res.setHeader('X-Response-Time', `${duration}ms`);
    res.setHeader('X-Memory-Delta', `${memoryDelta} bytes`);
  };
}

/**
 * Комбинированный middleware для всех API роутов
 */
export function withApiMiddleware(
  config: ApiConfig,
  handler: ApiHandler,
  options: {
    logging?: boolean;
    performance?: boolean;
  } = {}
): ApiHandler {
  let wrappedHandler = handler;

  // Добавляем логирование
  if (options.logging !== false) {
    wrappedHandler = withLogging(wrappedHandler);
  }

  // Добавляем отслеживание производительности
  if (options.performance !== false) {
    wrappedHandler = withPerformanceTracking(wrappedHandler);
  }

  // Создаем финальный обработчик
  return createApiHandler(config, wrappedHandler);
}
