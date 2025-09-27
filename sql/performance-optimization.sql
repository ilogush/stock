-- Оптимизация производительности базы данных
-- Создание индексов для ускорения запросов

-- Индексы для таблицы receipt_items
CREATE INDEX IF NOT EXISTS idx_receipt_items_created_at ON receipt_items(created_at);
CREATE INDEX IF NOT EXISTS idx_receipt_items_product_id ON receipt_items(product_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_color_id ON receipt_items(color_id);

-- Индексы для таблицы realization_items
CREATE INDEX IF NOT EXISTS idx_realization_items_created_at ON realization_items(created_at);
CREATE INDEX IF NOT EXISTS idx_realization_items_product_id ON realization_items(product_id);
CREATE INDEX IF NOT EXISTS idx_realization_items_color_id ON realization_items(color_id);

-- Индексы для таблицы products
CREATE INDEX IF NOT EXISTS idx_products_article ON products(article);
CREATE INDEX IF NOT EXISTS idx_products_color_id ON products(color_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Индексы для таблицы colors
CREATE INDEX IF NOT EXISTS idx_colors_name ON colors(name);

-- Индексы для таблицы receipts
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_receipts_creator_id ON receipts(creator_id);

-- Индексы для таблицы realization
CREATE INDEX IF NOT EXISTS idx_realization_created_at ON realization(created_at);
CREATE INDEX IF NOT EXISTS idx_realization_sender_id ON realization(sender_id);
CREATE INDEX IF NOT EXISTS idx_realization_recipient_id ON realization(recipient_id);

-- Композитные индексы для сложных запросов
CREATE INDEX IF NOT EXISTS idx_receipt_items_date_product ON receipt_items(created_at, product_id);
CREATE INDEX IF NOT EXISTS idx_realization_items_date_product ON realization_items(created_at, product_id);

-- Статистика для оптимизатора запросов
ANALYZE receipt_items;
ANALYZE realization_items;
ANALYZE products;
ANALYZE colors;
ANALYZE receipts;
ANALYZE realization;




