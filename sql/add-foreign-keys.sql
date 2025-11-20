-- Добавление внешних ключей для связывания товаров с поступлениями и реализациями
-- Выполните эти команды в Supabase SQL Editor

-- 1. Добавляем колонку receipt_id в receipt_items
ALTER TABLE receipt_items 
ADD COLUMN IF NOT EXISTS receipt_id INTEGER;

-- 2. Создаем индекс для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id 
ON receipt_items(receipt_id);

-- 3. Добавляем внешний ключ (опционально, можно добавить позже)
-- ALTER TABLE receipt_items 
-- ADD CONSTRAINT receipt_items_receipt_id_fkey 
-- FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE;

-- 4. Добавляем колонку realization_id в realization_items
ALTER TABLE realization_items 
ADD COLUMN IF NOT EXISTS realization_id INTEGER;

-- 5. Создаем индекс для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_realization_items_realization_id 
ON realization_items(realization_id);

-- 6. Добавляем внешний ключ (опционально, можно добавить позже)
-- ALTER TABLE realization_items 
-- ADD CONSTRAINT realization_items_realization_id_fkey 
-- FOREIGN KEY (realization_id) REFERENCES realization(id) ON DELETE CASCADE;

-- После выполнения этих команд запустите скрипт:
-- node scripts/add-foreign-keys.js

