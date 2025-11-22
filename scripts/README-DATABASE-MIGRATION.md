# Миграция базы данных: Добавление колонок receipt_id и realization_id

## Описание

Для корректной работы системы без временной связки необходимо добавить колонки `receipt_id` и `realization_id` в соответствующие таблицы.

## Шаги миграции

### 1. Выполните SQL в Supabase SQL Editor

Откройте Supabase Dashboard → SQL Editor и выполните следующий SQL:

```sql
-- 1. Добавляем колонку receipt_id в receipt_items
ALTER TABLE receipt_items 
ADD COLUMN IF NOT EXISTS receipt_id INTEGER;

-- 2. Создаем индекс для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id 
ON receipt_items(receipt_id);

-- 3. Добавляем колонку realization_id в realization_items
ALTER TABLE realization_items 
ADD COLUMN IF NOT EXISTS realization_id INTEGER;

-- 4. Создаем индекс для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_realization_items_realization_id 
ON realization_items(realization_id);
```

### 2. Заполните существующие данные

После добавления колонок, заполните их для существующих записей:

```bash
node scripts/add-receipt-ids-column.js
```

Этот скрипт заполнит `receipt_id` и `realization_id` для всех существующих поступлений и реализаций на основе временной связи (за 5 минут до/после создания).

### 3. Проверьте работу

Запустите тестовый скрипт для проверки:

```bash
node scripts/test-receipt-creation.js
```

## Важно

- **Новые записи** автоматически получат `receipt_id` и `realization_id` при создании через API
- **Старые записи** будут заполнены скриптом `add-receipt-ids-column.js`
- Если колонки отсутствуют, система будет работать в режиме fallback (временная связка)

## Файлы SQL

- `sql/add-receipt-realization-ids.sql` - SQL миграция для добавления колонок
