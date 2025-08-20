-- Создание поступлений для пижам W006

-- Пижама W006 - Зайчики на розовом
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'XS', 11, 'Поступление W006 Зайчики на розовом размер XS', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Зайчики на розовом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'S', 15, 'Поступление W006 Зайчики на розовом размер S', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Зайчики на розовом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'M', 15, 'Поступление W006 Зайчики на розовом размер M', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Зайчики на розовом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'L', 12, 'Поступление W006 Зайчики на розовом размер L', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Зайчики на розовом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'XL', 11, 'Поступление W006 Зайчики на розовом размер XL', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Зайчики на розовом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'XXL', 15, 'Поступление W006 Зайчики на розовом размер XXL', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Зайчики на розовом';

-- Пижама W006 - Шарики на голубом
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'XS', 3, 'Поступление W006 Шарики на голубом размер XS', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Шарики на голубом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'S', 4, 'Поступление W006 Шарики на голубом размер S', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Шарики на голубом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'M', 4, 'Поступление W006 Шарики на голубом размер M', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Шарики на голубом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'L', 3, 'Поступление W006 Шарики на голубом размер L', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Шарики на голубом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'XL', 3, 'Поступление W006 Шарики на голубом размер XL', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Шарики на голубом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'XXL', 4, 'Поступление W006 Шарики на голубом размер XXL', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Шарики на голубом';

-- Пижама W006 - Сиренивые сердечки
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'XS', 15, 'Поступление W006 Сиренивые сердечки размер XS', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Сиренивые сердечки';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'S', 10, 'Поступление W006 Сиренивые сердечки размер S', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Сиренивые сердечки';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'M', 10, 'Поступление W006 Сиренивые сердечки размер M', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Сиренивые сердечки';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'L', 15, 'Поступление W006 Сиренивые сердечки размер L', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Сиренивые сердечки';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'XL', 15, 'Поступление W006 Сиренивые сердечки размер XL', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Сиренивые сердечки';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'XXL', 10, 'Поступление W006 Сиренивые сердечки размер XXL', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Сиренивые сердечки';

-- Пижама W006 - Белые цветы на голубом
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'XS', 3, 'Поступление W006 Белые цветы на голубом размер XS', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Белые цветы на голубом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'S', 4, 'Поступление W006 Белые цветы на голубом размер S', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Белые цветы на голубом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'M', 4, 'Поступление W006 Белые цветы на голубом размер M', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Белые цветы на голубом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'L', 3, 'Поступление W006 Белые цветы на голубом размер L', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Белые цветы на голубом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'XL', 3, 'Поступление W006 Белые цветы на голубом размер XL', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Белые цветы на голубом';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, 'XXL', 3, 'Поступление W006 Белые цветы на голубом размер XXL', NOW()
FROM products p, colors c 
WHERE p.article = 'W006' AND c.name = 'Белые цветы на голубом';

-- Пижама W006 - Белые цветы на брусничном (0 шт - пропускаем)
-- Нет поступлений для этого цвета
