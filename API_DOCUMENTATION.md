# 📚 API Документация

## 🔗 Базовый URL

```
http://localhost:3000/api
```

## 🔐 Аутентификация

Все API запросы требуют аутентификации через JWT токен в заголовке:

```http
Authorization: Bearer <jwt_token>
```

## 📊 Общие принципы

### Формат ответов

```json
{
  "data": {
    "items": [...],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Обработка ошибок

```json
{
  "error": "Описание ошибки",
  "code": "ERROR_CODE",
  "details": {...},
  "context": "context",
  "timestamp": "2025-09-16T10:30:00.000Z"
}
```

### Коды ошибок

- `400` - Ошибка валидации
- `401` - Требуется авторизация
- `403` - Недостаточно прав
- `404` - Ресурс не найден
- `409` - Конфликт данных
- `500` - Внутренняя ошибка сервера

## 🛍️ Товары

### GET /api/products

Получить список товаров

**Параметры:**
- `page` (number) - Номер страницы (по умолчанию: 1)
- `limit` (number) - Количество товаров на странице (по умолчанию: 20)
- `search` (string) - Поисковый запрос
- `category` (number) - ID категории
- `brand` (number) - ID бренда

**Пример запроса:**
```http
GET /api/products?page=1&limit=10&search=футболка&category=1
```

**Пример ответа:**
```json
{
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Футболка мужская",
        "article": "M001",
        "price": 1500,
        "old_price": 2000,
        "category_id": 1,
        "brand_id": 1,
        "color_id": 1,
        "is_popular": true,
        "is_visible": true,
        "created_at": "2025-09-16T10:30:00.000Z",
        "brandName": "Nike",
        "categoryName": "Мужская одежда",
        "colorName": "Черный",
        "images": ["image1.jpg", "image2.jpg"]
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### GET /api/products/[id]

Получить товар по ID

**Пример запроса:**
```http
GET /api/products/1
```

**Пример ответа:**
```json
{
  "data": {
    "id": 1,
    "name": "Футболка мужская",
    "article": "M001",
    "price": 1500,
    "old_price": 2000,
    "category_id": 1,
    "brand_id": 1,
    "color_id": 1,
    "is_popular": true,
    "is_visible": true,
    "created_at": "2025-09-16T10:30:00.000Z",
    "brandName": "Nike",
    "categoryName": "Мужская одежда",
    "colorName": "Черный",
    "images": ["image1.jpg", "image2.jpg"]
  }
}
```

## 🎨 Цвета

### GET /api/colors

Получить список цветов

**Параметры:**
- `page` (number) - Номер страницы
- `limit` (number) - Количество цветов на странице
- `search` (string) - Поисковый запрос

**Пример запроса:**
```http
GET /api/colors?limit=20&search=красный
```

**Пример ответа:**
```json
{
  "data": {
    "colors": [
      {
        "id": 1,
        "name": "Красный",
        "hex_code": "#FF0000",
        "created_at": "2025-09-16T10:30:00.000Z",
        "product_count": 15
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /api/colors/create

Создать новый цвет

**Тело запроса:**
```json
{
  "name": "Новый цвет",
  "hex_code": "#FF5733"
}
```

**Пример ответа:**
```json
{
  "data": {
    "id": 51,
    "name": "Новый цвет",
    "hex_code": "#FF5733",
    "created_at": "2025-09-16T10:30:00.000Z"
  }
}
```

## 👥 Пользователи

### GET /api/users

Получить список пользователей

**Параметры:**
- `page` (number) - Номер страницы
- `limit` (number) - Количество пользователей на странице
- `role` (number) - ID роли
- `search` (string) - Поисковый запрос

**Пример запроса:**
```http
GET /api/users?role=2&search=иван
```

**Пример ответа:**
```json
{
  "data": {
    "users": [
      {
        "id": 1,
        "email": "ivan@example.com",
        "first_name": "Иван",
        "last_name": "Иванов",
        "phone": "+7 900 123 45 67",
        "telegram": "@ivan_ivanov",
        "role_id": 2,
        "created_at": "2025-09-16T10:30:00.000Z",
        "avatar_url": "avatar.jpg",
        "is_deleted": false,
        "role": {
          "id": 2,
          "name": "manager",
          "display_name": "Менеджер"
        }
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 20,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## 📦 Заказы

### GET /api/orders

Получить список заказов

**Параметры:**
- `page` (number) - Номер страницы
- `limit` (number) - Количество заказов на странице
- `status` (string) - Статус заказа
- `search` (string) - Поисковый запрос

**Пример запроса:**
```http
GET /api/orders?status=pending&limit=10
```

**Пример ответа:**
```json
{
  "data": {
    "orders": [
      {
        "id": 1,
        "order_number": "ORD-001",
        "customer_name": "Иван Иванов",
        "customer_phone": "+7 900 123 45 67",
        "status": "pending",
        "total_amount": 3000,
        "created_at": "2025-09-16T10:30:00.000Z",
        "items": [
          {
            "product_id": 1,
            "quantity": 2,
            "price": 1500
          }
        ]
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## 📊 Склад

### GET /api/stock

Получить остатки на складе

**Параметры:**
- `page` (number) - Номер страницы
- `limit` (number) - Количество позиций на странице
- `category` (number) - ID категории
- `search` (string) - Поисковый запрос

**Пример запроса:**
```http
GET /api/stock?category=1&limit=20
```

**Пример ответа:**
```json
{
  "data": {
    "stock": [
      {
        "id": 1,
        "product_id": 1,
        "product_name": "Футболка мужская",
        "product_article": "M001",
        "size_code": "M",
        "color_id": 1,
        "color_name": "Черный",
        "quantity": 25,
        "reserved": 5,
        "available": 20
      }
    ],
    "pagination": {
      "total": 200,
      "page": 1,
      "limit": 20,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## 🔔 Уведомления

### GET /api/notifications

Получить уведомления пользователя

**Параметры:**
- `limit` (number) - Количество уведомлений
- `offset` (number) - Смещение
- `unread_only` (boolean) - Только непрочитанные
- `category` (string) - Категория уведомления

**Пример запроса:**
```http
GET /api/notifications?limit=10&unread_only=true
```

**Пример ответа:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "title": "Новый заказ",
      "message": "Создан новый заказ #123 от Иван Иванов",
      "type": "info",
      "category": "order",
      "is_read": false,
      "action_url": "/orders/123",
      "action_text": "Посмотреть заказ",
      "created_at": "2025-09-16T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

### POST /api/notifications

Выполнить действие с уведомлениями

**Тело запроса:**
```json
{
  "action": "mark_all_read"
}
```

**Доступные действия:**
- `mark_all_read` - Отметить все как прочитанные
- `cleanup_expired` - Очистить истекшие уведомления

## 📈 Аналитика

### GET /api/admin/performance-stats

Получить статистику производительности (только для администраторов)

**Параметры:**
- `timeWindow` (number) - Временное окно в миллисекундах

**Пример запроса:**
```http
GET /api/admin/performance-stats?timeWindow=300000
```

**Пример ответа:**
```json
{
  "timestamp": "2025-09-16T10:30:00.000Z",
  "timeWindow": 300000,
  "performance": {
    "avgResponseTime": 150,
    "totalRequests": 1000,
    "errorRate": 2.5,
    "cacheHitRate": 85.5,
    "slowestEndpoints": [
      {
        "endpoint": "GET /api/products",
        "avgTime": 300,
        "count": 50
      }
    ],
    "errorEndpoints": [
      {
        "endpoint": "POST /api/orders",
        "errorCount": 5,
        "errorRate": 10
      }
    ]
  },
  "system": {
    "currentMemory": 256.5,
    "avgMemory": 250.0,
    "currentCpu": 45.2,
    "avgCpu": 40.0,
    "cacheStats": {
      "hits": 850,
      "misses": 150,
      "size": 100,
      "hitRate": 0.85
    }
  },
  "alerts": {
    "slowEndpoints": [...],
    "errorEndpoints": [...],
    "recommendations": [
      "Среднее время ответа превышает 1 секунду. Рекомендуется оптимизировать запросы к БД."
    ]
  },
  "summary": {
    "status": "healthy",
    "healthScore": 85,
    "uptime": 86400
  }
}
```

## 🔧 Утилиты

### GET /api/version

Получить версию API

**Пример ответа:**
```json
{
  "version": "1.0.0",
  "build": "2025-09-16T10:30:00.000Z",
  "environment": "development"
}
```

## 📝 Примеры использования

### JavaScript/TypeScript

```typescript
// Получение товаров
const response = await fetch('/api/products?limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();

// Создание цвета
const newColor = await fetch('/api/colors/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Новый цвет',
    hex_code: '#FF5733'
  })
});
```

### cURL

```bash
# Получение товаров
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/products?limit=10"

# Создание цвета
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Новый цвет","hex_code":"#FF5733"}' \
     "http://localhost:3000/api/colors/create"
```

## 🚨 Ограничения

### Rate Limiting

- **Обычные пользователи:** 100 запросов в минуту
- **Администраторы:** 1000 запросов в минуту

### Размеры данных

- **Максимальный размер запроса:** 10MB
- **Максимальное количество элементов в списке:** 1000
- **Максимальная длина поискового запроса:** 100 символов

### Кэширование

- **Статические данные:** 15 минут
- **Пользовательские данные:** 5 минут
- **Динамические данные:** 2 минуты

---

**Версия API:** 1.0  
**Дата обновления:** 2025-09-16  
**Автор:** Система разработки
