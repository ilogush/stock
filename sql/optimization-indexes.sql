-- Оптимизация индексов для улучшения производительности
-- Создано: 2025-09-16

-- ==============================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ PRODUCTS
-- ==============================================

-- Индекс для поиска по артикулу (часто используется)
CREATE INDEX IF NOT EXISTS idx_products_article ON products(article);

-- Индекс для поиска по названию (часто используется)
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('russian', name));

-- Индекс для фильтрации по категории
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Индекс для фильтрации по бренду
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);

-- Индекс для фильтрации по цвету
CREATE INDEX IF NOT EXISTS idx_products_color_id ON products(color_id);

-- Индекс для фильтрации по видимости
CREATE INDEX IF NOT EXISTS idx_products_is_visible ON products(is_visible);

-- Индекс для фильтрации по популярности
CREATE INDEX IF NOT EXISTS idx_products_is_popular ON products(is_popular);

-- Составной индекс для частых запросов
CREATE INDEX IF NOT EXISTS idx_products_category_brand ON products(category_id, brand_id);

-- Составной индекс для поиска с фильтрацией
CREATE INDEX IF NOT EXISTS idx_products_visible_category ON products(is_visible, category_id);

-- Индекс для сортировки по дате создания
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- ==============================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ COLORS
-- ==============================================

-- Индекс для поиска по названию цвета
CREATE INDEX IF NOT EXISTS idx_colors_name ON colors USING gin(to_tsvector('russian', name));

-- Индекс для поиска по HEX коду
CREATE INDEX IF NOT EXISTS idx_colors_hex_code ON colors(hex_code);

-- ==============================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ USERS
-- ==============================================

-- Индекс для поиска по email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Индекс для фильтрации по роли
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- Индекс для фильтрации по статусу удаления
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);

-- Составной индекс для активных пользователей
CREATE INDEX IF NOT EXISTS idx_users_active_role ON users(is_deleted, role_id);

-- ==============================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ ORDERS
-- ==============================================

-- Индекс для поиска по номеру заказа
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Индекс для фильтрации по статусу
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Индекс для сортировки по дате создания
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Составной индекс для поиска по клиенту
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_name, customer_phone);

-- ==============================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ STOCK
-- ==============================================

-- Индекс для поиска по товару
CREATE INDEX IF NOT EXISTS idx_stock_product_id ON stock(product_id);

-- Индекс для поиска по размеру
CREATE INDEX IF NOT EXISTS idx_stock_size_code ON stock(size_code);

-- Индекс для поиска по цвету
CREATE INDEX IF NOT EXISTS idx_stock_color_id ON stock(color_id);

-- Составной индекс для уникальности
CREATE INDEX IF NOT EXISTS idx_stock_unique ON stock(product_id, size_code, color_id);

-- Индекс для фильтрации по количеству
CREATE INDEX IF NOT EXISTS idx_stock_quantity ON stock(quantity);

-- ==============================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ RECEIPTS
-- ==============================================

-- Индекс для сортировки по дате
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);

-- Индекс для фильтрации по поставщику
CREATE INDEX IF NOT EXISTS idx_receipts_supplier_id ON receipts(supplier_id);

-- ==============================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ REALIZATION
-- ==============================================

-- Индекс для сортировки по дате
CREATE INDEX IF NOT EXISTS idx_realization_created_at ON realization(created_at DESC);

-- Индекс для фильтрации по получателю
CREATE INDEX IF NOT EXISTS idx_realization_recipient_id ON realization(recipient_id);

-- Индекс для фильтрации по отправителю
CREATE INDEX IF NOT EXISTS idx_realization_sender_id ON realization(sender_id);

-- ==============================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ TASKS
-- ==============================================

-- Индекс для фильтрации по исполнителю
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

-- Индекс для фильтрации по автору
CREATE INDEX IF NOT EXISTS idx_tasks_author_id ON tasks(author_id);

-- Индекс для фильтрации по статусу
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Индекс для сортировки по дате создания
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Составной индекс для задач пользователя
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(assignee_id, status);

-- ==============================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ PRODUCT_IMAGES
-- ==============================================

-- Индекс для поиска изображений товара
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Индекс для сортировки по дате создания
CREATE INDEX IF NOT EXISTS idx_product_images_created_at ON product_images(created_at);

-- ==============================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ USER_ACTIONS
-- ==============================================

-- Индекс для поиска действий пользователя
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id);

-- Индекс для фильтрации по типу действия
CREATE INDEX IF NOT EXISTS idx_user_actions_action_name ON user_actions(action_name);

-- Индекс для сортировки по дате
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON user_actions(created_at DESC);

-- Составной индекс для статистики
CREATE INDEX IF NOT EXISTS idx_user_actions_user_date ON user_actions(user_id, created_at);

-- ==============================================
-- ПАРЦИАЛЬНЫЕ ИНДЕКСЫ (для экономии места)
-- ==============================================

-- Индекс только для видимых товаров
CREATE INDEX IF NOT EXISTS idx_products_visible_partial ON products(category_id, brand_id) 
WHERE is_visible = true;

-- Индекс только для активных пользователей
CREATE INDEX IF NOT EXISTS idx_users_active_partial ON users(role_id, created_at) 
WHERE is_deleted = false;

-- Индекс только для активных задач
CREATE INDEX IF NOT EXISTS idx_tasks_active_partial ON tasks(assignee_id, created_at) 
WHERE status IN ('new', 'in_progress');

-- ==============================================
-- ИНДЕКСЫ ДЛЯ ПОЛНОТЕКСТОВОГО ПОИСКА
-- ==============================================

-- Полнотекстовый поиск по товарам
CREATE INDEX IF NOT EXISTS idx_products_search ON products 
USING gin(to_tsvector('russian', name || ' ' || article));

-- Полнотекстовый поиск по цветам
CREATE INDEX IF NOT EXISTS idx_colors_search ON colors 
USING gin(to_tsvector('russian', name));

-- Полнотекстовый поиск по пользователям
CREATE INDEX IF NOT EXISTS idx_users_search ON users 
USING gin(to_tsvector('russian', first_name || ' ' || last_name || ' ' || email));

-- ==============================================
-- СТАТИСТИКА И АНАЛИЗ
-- ==============================================

-- Обновляем статистику таблиц
ANALYZE products;
ANALYZE colors;
ANALYZE users;
ANALYZE orders;
ANALYZE stock;
ANALYZE receipts;
ANALYZE realization;
ANALYZE tasks;
ANALYZE product_images;
ANALYZE user_actions;

-- ==============================================
-- КОММЕНТАРИИ К ИНДЕКСАМ
-- ==============================================

COMMENT ON INDEX idx_products_article IS 'Быстрый поиск товаров по артикулу';
COMMENT ON INDEX idx_products_name IS 'Полнотекстовый поиск по названию товара';
COMMENT ON INDEX idx_products_category_brand IS 'Фильтрация по категории и бренду';
COMMENT ON INDEX idx_colors_name IS 'Полнотекстовый поиск по названию цвета';
COMMENT ON INDEX idx_users_email IS 'Быстрый поиск пользователей по email';
COMMENT ON INDEX idx_orders_status IS 'Фильтрация заказов по статусу';
COMMENT ON INDEX idx_stock_unique IS 'Уникальность позиций на складе';
COMMENT ON INDEX idx_tasks_user_status IS 'Задачи пользователя по статусу';
