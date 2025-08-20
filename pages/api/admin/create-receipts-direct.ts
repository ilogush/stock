import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Данные поступлений из таблицы
    const receiptsData = [
      // Блузка W008
      { product_article: "W008", color_name: "Париж", sizes: { "52": 2, "56": 1, "58": 2, "60": 1, "62": 1, "64": 2 } },
      { product_article: "W008", color_name: "Коричневый ирис", sizes: { "52": 1, "54": 1, "56": 1, "60": 1, "62": 2, "64": 1 } },
      { product_article: "W008", color_name: "Бирюзовый леопард", sizes: { "54": 1, "56": 2, "66": 1 } },
      { product_article: "W008", color_name: "Темно-серый орхидея", sizes: { "52": 1, "54": 2, "56": 1, "60": 4, "62": 1 } },
      { product_article: "W008", color_name: "Ромб синий", sizes: { "52": 3, "54": 2, "56": 3, "58": 2, "60": 2, "62": 1, "66": 3 } },
      { product_article: "W008", color_name: "Серый орхидея", sizes: { "52": 1, "54": 2, "56": 1, "60": 4, "62": 2, "64": 2 } },
      { product_article: "W008", color_name: "Бордовый ромб", sizes: { "52": 3, "54": 3, "56": 2, "58": 1, "60": 1, "62": 2, "64": 3, "66": 2 } },
      { product_article: "W008", color_name: "Зеленый ромб", sizes: { "52": 1, "54": 1, "56": 1, "60": 1, "62": 1, "64": 2, "66": 2 } },
      { product_article: "W008", color_name: "Сирень ирис", sizes: { "54": 1, "56": 2, "62": 1, "64": 1 } },
      { product_article: "W008", color_name: "Темно-серый леопард", sizes: { "52": 1, "60": 1, "62": 1, "66": 3 } },
      { product_article: "W008", color_name: "Темно-синий орхидея", sizes: { "52": 2, "54": 1, "60": 2, "62": 1 } },
      { product_article: "W008", color_name: "Ирис зеленый", sizes: { "52": 2, "54": 1, "56": 1, "60": 2, "62": 1, "64": 2, "66": 2 } },
      { product_article: "W008", color_name: "Зеленый зебра", sizes: { "52": 3, "54": 3, "56": 2, "58": 1, "60": 2, "62": 2, "64": 3, "66": 3 } },
      { product_article: "W008", color_name: "Фиолетовый орхидея", sizes: { "54": 2, "60": 2, "62": 1, "66": 1 } },
      { product_article: "W008", color_name: "Зеленый леопард", sizes: { "52": 1, "54": 1, "56": 5, "58": 1, "62": 1 } },
      { product_article: "W008", color_name: "Голубая орхидея", sizes: { "52": 1, "54": 1, "56": 3, "60": 1 } },
      { product_article: "W008", color_name: "Питон", sizes: { "52": 4, "54": 1, "56": 1 } },
      { product_article: "W008", color_name: "Сирень зебра", sizes: { "52": 2, "54": 2, "58": 2, "60": 1, "62": 2, "64": 1, "66": 1 } },
      { product_article: "W008", color_name: "Желтые ромбы", sizes: { "52": 3, "54": 1, "56": 1, "60": 1 } },
      { product_article: "W008", color_name: "Фиолетовый ирис", sizes: { "52": 2 } },

      // Блузка W009
      { product_article: "W009", color_name: "Ромбы синие", sizes: { "52": 1, "54": 1, "56": 1, "58": 1, "60": 1, "62": 1, "64": 1 } },
      { product_article: "W009", color_name: "Ромбы бордовые", sizes: { "52": 1, "54": 1, "56": 2, "60": 1, "62": 1, "66": 1 } },
      { product_article: "W009", color_name: "Сирень зебра", sizes: { "52": 3, "54": 3, "56": 2, "58": 3, "60": 3, "62": 3, "64": 2, "66": 3 } },
      { product_article: "W009", color_name: "Зеленый зебра", sizes: { "52": 2, "54": 2, "56": 1, "60": 2, "62": 1, "64": 1, "66": 1 } },
      { product_article: "W009", color_name: "Зеленый ромб", sizes: { "54": 1, "56": 1, "60": 1, "62": 1, "64": 1 } },
      { product_article: "W009", color_name: "Бирюзовый леопард", sizes: { "52": 1, "58": 1, "60": 1 } },
      { product_article: "W009", color_name: "Сирень ирис", sizes: { "52": 1, "62": 1 } },
      { product_article: "W009", color_name: "Розовый леопард", sizes: { "52": 1, "56": 1, "64": 1, "66": 1 } },
      { product_article: "W009", color_name: "Темно-серый леопард", sizes: { "52": 1, "56": 1, "60": 1 } },
      { product_article: "W009", color_name: "Зеленый леопард", sizes: { "56": 1, "58": 2, "60": 1 } },
      { product_article: "W009", color_name: "Питон", sizes: { "56": 1 } },
      { product_article: "W009", color_name: "Фиолетовый орхидея", sizes: { "56": 1 } },
      { product_article: "W009", color_name: "Темно-синий орхидея", sizes: { "62": 1 } },
      { product_article: "W009", color_name: "Голубая орхидея", sizes: { "66": 2 } },

      // Туника W010
      { product_article: "W010", color_name: "Голубая орхидея", sizes: { "52": 1, "54": 1, "60": 3, "62": 1 } },
      { product_article: "W010", color_name: "Ирис зеленый", sizes: { "52": 1 } },
      { product_article: "W010", color_name: "Темно-серый леопард", sizes: { "52": 1, "54": 1, "56": 1, "58": 1, "60": 1, "62": 1 } },
      { product_article: "W010", color_name: "Желтые ромбы", sizes: { "54": 1 } },
      { product_article: "W010", color_name: "Сирень ирис", sizes: { "54": 1, "56": 1 } },
      { product_article: "W010", color_name: "Зеленый ромб", sizes: { "56": 2, "58": 2, "60": 2, "64": 2 } }
    ];

    const createdReceipts = [];
    let totalReceipts = 0;

    for (const receiptData of receiptsData) {
      try {
        // Получаем ID цвета
        const { data: colorData, error: colorError } = await supabaseAdmin
          .from('colors')
          .select('id')
          .eq('name', receiptData.color_name)
          .single();

        if (colorError || !colorData) {
          console.error(`Цвет ${receiptData.color_name} не найден`);
          createdReceipts.push({ ...receiptData, error: `Цвет ${receiptData.color_name} не найден` });
          continue;
        }

        // Получаем товар по артикулу и цвету
        const { data: productData, error: productError } = await supabaseAdmin
          .from('products')
          .select('id, name, article')
          .eq('article', receiptData.product_article)
          .eq('color_id', colorData.id)
          .single();

        if (productError || !productData) {
          console.error(`Товар ${receiptData.product_article} ${receiptData.color_name} не найден`);
          createdReceipts.push({ ...receiptData, error: `Товар не найден` });
          continue;
        }

        // Создаем поступления для каждого размера с количеством > 0
        for (const [size, quantity] of Object.entries(receiptData.sizes)) {
          if (quantity > 0) {
            const receiptToCreate = {
              product_id: productData.id,
              size_code: size,
              qty: quantity,
              notes: `Поступление ${receiptData.product_article} ${receiptData.color_name} размер ${size}`
            };

            const { data, error } = await supabaseAdmin
              .from('receipts')
              .insert(receiptToCreate)
              .select();

            if (error) {
              console.error(`Ошибка создания поступления ${receiptData.product_article} ${receiptData.color_name} ${size}:`, error);
              createdReceipts.push({ ...receiptData, size, quantity, error: error.message });
            } else {
              console.log(`Поступление создано: ${receiptData.product_article} ${receiptData.color_name} ${size} - ${quantity} шт.`);
              totalReceipts++;
            }
          }
        }

        createdReceipts.push({ ...receiptData, success: true });

      } catch (error) {
        console.error(`Ошибка обработки ${receiptData.product_article} ${receiptData.color_name}:`, error);
        createdReceipts.push({ ...receiptData, error: error.message });
      }
    }

    return res.status(200).json({ 
      success: true, 
      receipts: createdReceipts,
      totalReceipts,
      message: 'Поступления созданы' 
    });

  } catch (error) {
    console.error('Ошибка API create-receipts-direct:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
