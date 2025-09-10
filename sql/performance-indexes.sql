-- 📊 ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ПРОИЗВОДИТЕЛЬНОСТИ
-- Выполняйте команды по одной в Supabase SQL Editor

-- 🔍 ПОИСКОВЫЕ ИНДЕКСЫ
-- Быстрый поиск по артикулу товара (текущая скорость: 676ms)
CREATE INDEX IF NOT EXISTS idx_products_article ON products (article);

-- Поиск по названию товара
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);

-- Фильтрация по категории и бренду (текущая скорость: 292ms)
CREATE INDEX IF NOT EXISTS idx_products_category_id_brand_id ON products (category_id, brand_id);

-- JOIN с таблицей цветов
CREATE INDEX IF NOT EXISTS idx_products_color_id ON products (color_id);

-- 📦 СКЛАДСКИЕ ОПЕРАЦИИ (КРИТИЧЕСКИ ВАЖНО)
-- Оптимизация расчета остатков на складе
CREATE INDEX IF NOT EXISTS idx_receipt_items_product_id_created_at ON receipt_items (product_id, created_at);

-- Оптимизация расчета реализованных товаров
CREATE INDEX IF NOT EXISTS idx_realization_items_product_id_created_at ON realization_items (product_id, created_at);

-- Связь поступлений по артикулу и времени (для time-based linking)
CREATE INDEX IF NOT EXISTS idx_receipt_items_article_created_at ON receipt_items (article, created_at);

-- Связь реализаций по артикулу и времени (для time-based linking)
CREATE INDEX IF NOT EXISTS idx_realization_items_article_created_at ON realization_items (article, created_at);

-- 📅 ВРЕМЕННЫЕ ИНДЕКСЫ
-- Сортировка поступлений по дате (текущая скорость: 282ms)
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts (created_at);

-- Сортировка реализаций по дате
CREATE INDEX IF NOT EXISTS idx_realization_created_at ON realization (created_at);

-- 👥 ПОЛЬЗОВАТЕЛЬСКИЕ ОПЕРАЦИИ
-- Фильтрация пользователей по роли
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);

-- Поиск задач по исполнителю и статусу (текущая скорость: 278ms)
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id_status ON tasks (assignee_id, status);

-- 🔗 СВЯЗИ
-- Связь менеджеров с брендами
CREATE INDEX IF NOT EXISTS idx_brand_managers_brand_id_user_id ON brand_managers (brand_id, user_id);

-- 💡 ДОПОЛНИТЕЛЬНЫЕ ОПТИМИЗАЦИИ

-- Индекс для чата (если используется)
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages (created_at);

-- Индекс для логов действий пользователей
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id_created_at ON user_actions (user_id, created_at);

-- Составной индекс для orders
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders (status, created_at);

-- 🚀 ПОЛНОТЕКСТОВЫЙ ПОИСК (ПРОДВИНУТЫЙ)
-- Для более быстрого поиска по товарам
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING gin(to_tsvector('russian', name || ' ' || article));

-- ✅ ПРОВЕРКА СОЗДАННЫХ ИНДЕКСОВ
-- Выполните эту команду в конце для проверки:
-- SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE tablename IN ('products', 'receipt_items', 'realization_items', 'receipts', 'realization', 'users', 'tasks') ORDER BY tablename, indexname;
