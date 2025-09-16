# 🚀 Руководство разработчика

## 📋 Содержание

1. [Обзор архитектуры](#обзор-архитектуры)
2. [Унифицированная система](#унифицированная-система)
3. [API разработка](#api-разработка)
4. [Мониторинг и аналитика](#мониторинг-и-аналитика)
5. [Оптимизация производительности](#оптимизация-производительности)
6. [Лучшие практики](#лучшие-практики)
7. [Отладка и тестирование](#отладка-и-тестирование)

## 🏗️ Обзор архитектуры

### Структура проекта

```
stock/
├── lib/                          # Библиотеки и утилиты
│   ├── unified/                  # Унифицированная система
│   │   ├── errorHandler.ts       # Обработка ошибок
│   │   ├── validator.ts          # Валидация данных
│   │   ├── cache.ts             # Кэширование
│   │   ├── apiMiddleware.ts     # API middleware
│   │   └── index.ts             # Главный экспорт
│   ├── monitoring/              # Мониторинг
│   │   └── performanceMonitor.ts
│   ├── optimization/            # Оптимизация
│   │   └── queryOptimizer.ts
│   ├── features/                # Новые функции
│   │   ├── notifications.ts     # Система уведомлений
│   │   └── analytics.ts         # Аналитика
│   └── ...                      # Остальные утилиты
├── pages/                       # Next.js страницы
│   ├── api/                     # API роуты
│   │   ├── admin/               # Административные API
│   │   ├── notifications/       # API уведомлений
│   │   └── ...                  # Остальные API
│   └── ...                      # Страницы приложения
├── components/                  # React компоненты
├── sql/                         # SQL скрипты
└── scripts/                     # Утилиты и скрипты
```

### Принципы архитектуры

1. **Единообразие** - все API роуты используют единую систему
2. **Производительность** - кэширование и оптимизация запросов
3. **Мониторинг** - отслеживание производительности и ошибок
4. **Расширяемость** - легко добавлять новые функции
5. **Надежность** - обработка ошибок и валидация данных

## 🔧 Унифицированная система

### Обработка ошибок

```typescript
import { handleDatabaseError, sendErrorResponse } from '../../../lib/unified';

// В API роуте
try {
  const { data, error } = await supabaseAdmin.from('table').select('*');
  if (error) {
    const apiError = handleDatabaseError(error, 'context');
    return sendErrorResponse(res, apiError);
  }
} catch (error) {
  const apiError = handleDatabaseError(error, 'context');
  return sendErrorResponse(res, apiError);
}
```

### Валидация данных

```typescript
import { validator, validationSchemas } from '../../../lib/unified';

// Валидация объекта
const result = validator.validateObject(req.body, validationSchemas.product);
if (!result.isValid) {
  sendValidationErrors(res, result.errors);
  return;
}
```

### Кэширование

```typescript
import { cache, cacheKeys } from '../../../lib/unified';

// Получение из кэша
const cacheKey = cacheKeys.products(page, limit, search);
const cachedData = cache.getOnly(cacheKey);
if (cachedData) {
  return res.json(cachedData);
}

// Сохранение в кэш
cache.set(cacheKey, responseData);
```

### API Middleware

```typescript
import { withApiMiddleware, apiConfigs } from '../../../lib/unified';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Логика обработчика
}

export default withApiMiddleware(
  apiConfigs.list('products'),
  handler,
  { logging: true, performance: true }
);
```

## 🌐 API разработка

### Создание нового API роута

1. **Создайте файл** в `pages/api/your-endpoint/index.ts`
2. **Используйте унифицированную систему**:

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { withApiMiddleware, apiConfigs } from '../../../lib/unified';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Логика GET запроса
  }
  
  if (req.method === 'POST') {
    // Логика POST запроса
  }
  
  return res.status(405).json({ error: 'Метод не поддерживается' });
}

export default withApiMiddleware(
  apiConfigs.list('your-endpoint'),
  handler
);
```

### Конфигурации API

```typescript
// Для списков
apiConfigs.list('cacheType')

// Для отдельных записей
apiConfigs.item('cacheType')

// Для создания
apiConfigs.create(validationSchema)

// Для обновления
apiConfigs.update(validationSchema)

// Для удаления
apiConfigs.delete()

// Для статических данных
apiConfigs.static()
```

### Валидация API

```typescript
// Схемы валидации
const productSchema = {
  name: [
    { type: 'required' },
    { type: 'string' },
    { type: 'minLength', min: 2 }
  ],
  price: [
    { type: 'required' },
    { type: 'number' },
    { type: 'positive' }
  ]
};

// Использование
const result = validator.validateObject(data, productSchema);
```

## 📊 Мониторинг и аналитика

### Мониторинг производительности

```typescript
import { performanceMonitor } from '../../../lib/monitoring/performanceMonitor';

// Автоматический мониторинг
export default withPerformanceMonitoring(handler);

// Ручная запись метрик
performanceMonitor.recordApiCall({
  endpoint: '/api/products',
  method: 'GET',
  duration: 150,
  statusCode: 200,
  memoryUsage: { heapUsed: 1024, heapTotal: 2048, external: 512 },
  cacheHit: true
});
```

### Аналитика

```typescript
import { trackEvent, trackBusinessEvent } from '../../../lib/features/analytics';

// Трекинг событий
trackEvent('user_login', { userId: 123 });
trackBusinessEvent('order_created', { orderId: 456, amount: 1000 });

// Получение статистики
const stats = await analyticsService.getDashboardStats();
```

### Уведомления

```typescript
import { notificationService } from '../../../lib/features/notifications';

// Создание уведомления
await notificationService.createNotification(
  userId,
  'order_created',
  { order_id: 123, customer_name: 'Иван Иванов' }
);

// Массовые уведомления
await notificationService.createBulkNotification(
  [1, 2, 3],
  'system_maintenance',
  { start_time: '2025-09-16 02:00', end_time: '2025-09-16 04:00' }
);
```

## ⚡ Оптимизация производительности

### Оптимизация запросов

```typescript
import { queryOptimizer, createOptimizedQuery } from '../../../lib/optimization/queryOptimizer';

// Оптимизированный запрос
const result = await createOptimizedQuery('products', {
  select: 'id, name, price',
  filters: { category_id: 1 },
  orderBy: 'created_at desc',
  limit: 20,
  enableCache: true,
  ttl: 300000
});

// Пакетные запросы
const batchResults = await queryOptimizer.executeBatchQueries([
  { table: 'products', select: 'id, name' },
  { table: 'categories', select: 'id, name' }
]);
```

### Кэширование

```typescript
// Настройка кэша
const CACHE_CONFIGS = {
  STATIC_DATA: { ttl: 15 * 60 * 1000 }, // 15 минут
  USER_DATA: { ttl: 5 * 60 * 1000 },    // 5 минут
  DYNAMIC_DATA: { ttl: 2 * 60 * 1000 }  // 2 минуты
};

// Использование
cache.set(key, data, CACHE_CONFIGS.STATIC_DATA);
```

### Индексы базы данных

```sql
-- Основные индексы
CREATE INDEX idx_products_article ON products(article);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('russian', name));
CREATE INDEX idx_products_category_brand ON products(category_id, brand_id);

-- Полнотекстовый поиск
CREATE INDEX idx_products_search ON products 
USING gin(to_tsvector('russian', name || ' ' || article));
```

## 🎯 Лучшие практики

### Код

1. **Используйте TypeScript** - строгая типизация
2. **Следуйте единому стилю** - ESLint + Prettier
3. **Документируйте код** - JSDoc комментарии
4. **Обрабатывайте ошибки** - используйте унифицированную систему
5. **Валидируйте данные** - на входе и выходе

### API

1. **Используйте RESTful принципы** - правильные HTTP методы
2. **Версионируйте API** - `/api/v1/endpoint`
3. **Используйте пагинацию** - для больших списков
4. **Кэшируйте ответы** - для статических данных
5. **Логируйте запросы** - для отладки

### База данных

1. **Используйте индексы** - для часто запрашиваемых полей
2. **Оптимизируйте запросы** - избегайте N+1 проблем
3. **Используйте транзакции** - для критических операций
4. **Регулярно анализируйте** - статистику и производительность
5. **Очищайте данные** - удаляйте устаревшие записи

### Безопасность

1. **Валидируйте входные данные** - на всех уровнях
2. **Используйте авторизацию** - проверяйте права доступа
3. **Логируйте действия** - для аудита
4. **Ограничивайте запросы** - rate limiting
5. **Шифруйте чувствительные данные** - пароли, токены

## 🐛 Отладка и тестирование

### Отладка

```typescript
// Логирование
console.log('Debug info:', { userId, action, data });

// Мониторинг производительности
const start = Date.now();
// ... код ...
console.log(`Execution time: ${Date.now() - start}ms`);

// Проверка кэша
const cacheStats = cache.getStats();
console.log('Cache stats:', cacheStats);
```

### Тестирование

```typescript
// Тест API
const response = await fetch('/api/products?limit=5');
const data = await response.json();
expect(data.data.products).toHaveLength(5);

// Тест производительности
const start = Date.now();
await fetch('/api/products');
const duration = Date.now() - start;
expect(duration).toBeLessThan(1000);
```

### Мониторинг

```typescript
// Проверка статистики
const stats = await performanceMonitor.getPerformanceStats();
console.log('Performance stats:', stats);

// Проверка системных ресурсов
const systemStats = performanceMonitor.getSystemStats();
console.log('System stats:', systemStats);
```

## 📚 Полезные ресурсы

### Документация

- [Next.js](https://nextjs.org/docs) - фреймворк
- [Supabase](https://supabase.com/docs) - база данных
- [TypeScript](https://www.typescriptlang.org/docs) - язык
- [Tailwind CSS](https://tailwindcss.com/docs) - стили

### Инструменты

- [ESLint](https://eslint.org/docs) - линтер
- [Prettier](https://prettier.io/docs) - форматтер
- [Jest](https://jestjs.io/docs) - тестирование
- [PostgreSQL](https://www.postgresql.org/docs) - база данных

### Мониторинг

- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance) - веб-производительность
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling) - производительность Node.js
- [PostgreSQL Monitoring](https://www.postgresql.org/docs/current/monitoring.html) - мониторинг БД

---

**Версия документации:** 1.0  
**Дата обновления:** 2025-09-16  
**Автор:** Система разработки
