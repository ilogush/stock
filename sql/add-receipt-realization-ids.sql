-- Добавление колонок receipt_id и realization_id для связи товаров с поступлениями и реализациями
-- Выполните эти команды в Supabase SQL Editor

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

-- После выполнения этих команд запустите:
-- node scripts/add-receipt-ids-column.js

