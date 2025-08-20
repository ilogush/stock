-- Создание поступлений напрямую в БД
-- Сначала получаем ID товаров и цветов, затем создаем поступления

-- Блузка W008 - Париж
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 2, 'Поступление W008 Париж размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Париж';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W008 Париж размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Париж';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '58', 2, 'Поступление W008 Париж размер 58', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Париж';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W008 Париж размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Париж';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W008 Париж размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Париж';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 2, 'Поступление W008 Париж размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Париж';

-- Блузка W008 - Коричневый ирис
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W008 Коричневый ирис размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Коричневый ирис';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W008 Коричневый ирис размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Коричневый ирис';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W008 Коричневый ирис размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Коричневый ирис';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W008 Коричневый ирис размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Коричневый ирис';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 2, 'Поступление W008 Коричневый ирис размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Коричневый ирис';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 1, 'Поступление W008 Коричневый ирис размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Коричневый ирис';

-- Блузка W008 - Бирюзовый леопард
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W008 Бирюзовый леопард размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Бирюзовый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 2, 'Поступление W008 Бирюзовый леопард размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Бирюзовый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 1, 'Поступление W008 Бирюзовый леопард размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Бирюзовый леопард';

-- Блузка W008 - Темно-серый орхидея
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W008 Темно-серый орхидея размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-серый орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 2, 'Поступление W008 Темно-серый орхидея размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-серый орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W008 Темно-серый орхидея размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-серый орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 4, 'Поступление W008 Темно-серый орхидея размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-серый орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W008 Темно-серый орхидея размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-серый орхидея';

-- Блузка W008 - Ромб синий
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 3, 'Поступление W008 Ромб синий размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ромб синий';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 2, 'Поступление W008 Ромб синий размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ромб синий';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 3, 'Поступление W008 Ромб синий размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ромб синий';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '58', 2, 'Поступление W008 Ромб синий размер 58', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ромб синий';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 2, 'Поступление W008 Ромб синий размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ромб синий';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W008 Ромб синий размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ромб синий';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 3, 'Поступление W008 Ромб синий размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ромб синий';

-- Блузка W008 - Серый орхидея
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W008 Серый орхидея размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Серый орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 2, 'Поступление W008 Серый орхидея размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Серый орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W008 Серый орхидея размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Серый орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 4, 'Поступление W008 Серый орхидея размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Серый орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 2, 'Поступление W008 Серый орхидея размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Серый орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 2, 'Поступление W008 Серый орхидея размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Серый орхидея';

-- Блузка W008 - Бордовый ромб
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 3, 'Поступление W008 Бордовый ромб размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Бордовый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 3, 'Поступление W008 Бордовый ромб размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Бордовый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 2, 'Поступление W008 Бордовый ромб размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Бордовый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '58', 1, 'Поступление W008 Бордовый ромб размер 58', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Бордовый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W008 Бордовый ромб размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Бордовый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 2, 'Поступление W008 Бордовый ромб размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Бордовый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 3, 'Поступление W008 Бордовый ромб размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Бордовый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 2, 'Поступление W008 Бордовый ромб размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Бордовый ромб';

-- Блузка W008 - Зеленый ромб
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W008 Зеленый ромб размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W008 Зеленый ромб размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W008 Зеленый ромб размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W008 Зеленый ромб размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W008 Зеленый ромб размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 2, 'Поступление W008 Зеленый ромб размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый ромб';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 2, 'Поступление W008 Зеленый ромб размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый ромб';

-- Блузка W008 - Сирень ирис
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W008 Сирень ирис размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Сирень ирис';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 2, 'Поступление W008 Сирень ирис размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Сирень ирис';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W008 Сирень ирис размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Сирень ирис';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 1, 'Поступление W008 Сирень ирис размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Сирень ирис';

-- Блузка W008 - Темно-серый леопард
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W008 Темно-серый леопард размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-серый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W008 Темно-серый леопард размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-серый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W008 Темно-серый леопард размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-серый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 3, 'Поступление W008 Темно-серый леопард размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-серый леопард';

-- Блузка W008 - Темно-синий орхидея
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 2, 'Поступление W008 Темно-синий орхидея размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-синий орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W008 Темно-синий орхидея размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-синий орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 2, 'Поступление W008 Темно-синий орхидея размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-синий орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W008 Темно-синий орхидея размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Темно-синий орхидея';

-- Блузка W008 - Ирис зеленый
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 2, 'Поступление W008 Ирис зеленый размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ирис зеленый';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W008 Ирис зеленый размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ирис зеленый';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W008 Ирис зеленый размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ирис зеленый';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 2, 'Поступление W008 Ирис зеленый размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ирис зеленый';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W008 Ирис зеленый размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ирис зеленый';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 2, 'Поступление W008 Ирис зеленый размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ирис зеленый';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 2, 'Поступление W008 Ирис зеленый размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Ирис зеленый';

-- Блузка W008 - Зеленый зебра
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 3, 'Поступление W008 Зеленый зебра размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 3, 'Поступление W008 Зеленый зебра размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 2, 'Поступление W008 Зеленый зебра размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '58', 1, 'Поступление W008 Зеленый зебра размер 58', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 2, 'Поступление W008 Зеленый зебра размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 2, 'Поступление W008 Зеленый зебра размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 3, 'Поступление W008 Зеленый зебра размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 3, 'Поступление W008 Зеленый зебра размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый зебра';

-- Блузка W008 - Фиолетовый орхидея
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 2, 'Поступление W008 Фиолетовый орхидея размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Фиолетовый орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 2, 'Поступление W008 Фиолетовый орхидея размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Фиолетовый орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W008 Фиолетовый орхидея размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Фиолетовый орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 1, 'Поступление W008 Фиолетовый орхидея размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Фиолетовый орхидея';

-- Блузка W008 - Зеленый леопард
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W008 Зеленый леопард размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W008 Зеленый леопард размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 5, 'Поступление W008 Зеленый леопард размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '58', 1, 'Поступление W008 Зеленый леопард размер 58', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый леопард';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 1, 'Поступление W008 Зеленый леопард размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Зеленый леопард';

-- Блузка W008 - Голубая орхидея
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 1, 'Поступление W008 Голубая орхидея размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Голубая орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W008 Голубая орхидея размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Голубая орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 3, 'Поступление W008 Голубая орхидея размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Голубая орхидея';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W008 Голубая орхидея размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Голубая орхидея';

-- Блузка W008 - Питон
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 4, 'Поступление W008 Питон размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Питон';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W008 Питон размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Питон';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W008 Питон размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Питон';

-- Блузка W008 - Сирень зебра
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 2, 'Поступление W008 Сирень зебра размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 2, 'Поступление W008 Сирень зебра размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '58', 2, 'Поступление W008 Сирень зебра размер 58', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W008 Сирень зебра размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '62', 2, 'Поступление W008 Сирень зебра размер 62', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '64', 1, 'Поступление W008 Сирень зебра размер 64', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Сирень зебра';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '66', 1, 'Поступление W008 Сирень зебра размер 66', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Сирень зебра';

-- Блузка W008 - Желтые ромбы
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 3, 'Поступление W008 Желтые ромбы размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Желтые ромбы';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '54', 1, 'Поступление W008 Желтые ромбы размер 54', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Желтые ромбы';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '56', 1, 'Поступление W008 Желтые ромбы размер 56', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Желтые ромбы';

INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '60', 1, 'Поступление W008 Желтые ромбы размер 60', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Желтые ромбы';

-- Блузка W008 - Фиолетовый ирис
INSERT INTO receipts (product_id, color_id, size_code, qty, notes, created_at)
SELECT p.id, c.id, '52', 2, 'Поступление W008 Фиолетовый ирис размер 52', NOW()
FROM products p, colors c 
WHERE p.article = 'W008' AND c.name = 'Фиолетовый ирис';

-- Продолжение для остальных товаров...
-- (Добавлю остальные товары в следующей части из-за ограничения длины)
