-- Продолжение создания поступлений для остальных товаров

-- Блузка W009 - Ромбы синие
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W009 Ромбы синие размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы синие';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W009 Ромбы синие размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы синие';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W009 Ромбы синие размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы синие';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '58', 1, 'Поступление W009 Ромбы синие размер 58', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы синие';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W009 Ромбы синие размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы синие';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W009 Ромбы синие размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы синие';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 1, 'Поступление W009 Ромбы синие размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы синие';

-- Блузка W009 - Ромбы бордовые
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W009 Ромбы бордовые размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы бордовые';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W009 Ромбы бордовые размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы бордовые';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 2, 'Поступление W009 Ромбы бордовые размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы бордовые';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W009 Ромбы бордовые размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы бордовые';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W009 Ромбы бордовые размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы бордовые';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 1, 'Поступление W009 Ромбы бордовые размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Ромбы бордовые';

-- Блузка W009 - Сирень зебра
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 3, 'Поступление W009 Сирень зебра размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 3, 'Поступление W009 Сирень зебра размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 2, 'Поступление W009 Сирень зебра размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '58', 3, 'Поступление W009 Сирень зебра размер 58', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 3, 'Поступление W009 Сирень зебра размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 3, 'Поступление W009 Сирень зебра размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 2, 'Поступление W009 Сирень зебра размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 3, 'Поступление W009 Сирень зебра размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Сирень зебра';

-- Блузка W009 - Зеленый зебра
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 2, 'Поступление W009 Зеленый зебра размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 2, 'Поступление W009 Зеленый зебра размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W009 Зеленый зебра размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 2, 'Поступление W009 Зеленый зебра размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W009 Зеленый зебра размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 1, 'Поступление W009 Зеленый зебра размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 1, 'Поступление W009 Зеленый зебра размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый зебра';

-- Блузка W009 - Зеленый ромб
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W009 Зеленый ромб размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W009 Зеленый ромб размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W009 Зеленый ромб размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W009 Зеленый ромб размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 1, 'Поступление W009 Зеленый ромб размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый ромб';

-- Блузка W009 - Бирюзовый леопард
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W009 Бирюзовый леопард размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Бирюзовый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '58', 1, 'Поступление W009 Бирюзовый леопард размер 58', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Бирюзовый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W009 Бирюзовый леопард размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Бирюзовый леопард';

-- Блузка W009 - Сирень ирис
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W009 Сирень ирис размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Сирень ирис';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W009 Сирень ирис размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Сирень ирис';

-- Блузка W009 - Розовый леопард
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W009 Розовый леопард размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Розовый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W009 Розовый леопард размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Розовый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 1, 'Поступление W009 Розовый леопард размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Розовый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 1, 'Поступление W009 Розовый леопард размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Розовый леопард';

-- Блузка W009 - Темно-серый леопард
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W009 Темно-серый леопард размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Темно-серый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W009 Темно-серый леопард размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Темно-серый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W009 Темно-серый леопард размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Темно-серый леопард';

-- Блузка W009 - Зеленый леопард
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W009 Зеленый леопард размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '58', 2, 'Поступление W009 Зеленый леопард размер 58', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W009 Зеленый леопард размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Зеленый леопард';

-- Блузка W009 - Питон
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W009 Питон размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Питон';

-- Блузка W009 - Фиолетовый орхидея
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W009 Фиолетовый орхидея размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Фиолетовый орхидея';

-- Блузка W009 - Темно-синий орхидея
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W009 Темно-синий орхидея размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Темно-синий орхидея';

-- Блузка W009 - Голубая орхидея
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 2, 'Поступление W009 Голубая орхидея размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W009' AND c.name = 'Голубая орхидея';

-- Туника W010 - Голубая орхидея
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W010 Голубая орхидея размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Голубая орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W010 Голубая орхидея размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Голубая орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 3, 'Поступление W010 Голубая орхидея размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Голубая орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W010 Голубая орхидея размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Голубая орхидея';

-- Туника W010 - Ирис зеленый
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W010 Ирис зеленый размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Ирис зеленый';

-- Туника W010 - Темно-серый леопард
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W010 Темно-серый леопард размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Темно-серый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W010 Темно-серый леопард размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Темно-серый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W010 Темно-серый леопард размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Темно-серый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '58', 1, 'Поступление W010 Темно-серый леопард размер 58', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Темно-серый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W010 Темно-серый леопард размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Темно-серый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W010 Темно-серый леопард размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Темно-серый леопард';

-- Туника W010 - Желтые ромбы
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W010 Желтые ромбы размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Желтые ромбы';

-- Туника W010 - Сирень ирис
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W010 Сирень ирис размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Сирень ирис';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W010 Сирень ирис размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Сирень ирис';

-- Туника W010 - Зеленый ромб
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 2, 'Поступление W010 Зеленый ромб размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '58', 2, 'Поступление W010 Зеленый ромб размер 58', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 2, 'Поступление W010 Зеленый ромб размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 2, 'Поступление W010 Зеленый ромб размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W010' AND c.name = 'Зеленый ромб';
