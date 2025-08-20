import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Получаем структуру таблицы receipts
    const { data: receiptsStructure, error: receiptsError } = await supabaseAdmin
      .from('receipts')
      .select('*')
      .limit(1);

    // Получаем структуру таблицы products
    const { data: productsStructure, error: productsError } = await supabaseAdmin
      .from('products')
      .select('*')
      .limit(1);

    // Получаем структуру таблицы colors
    const { data: colorsStructure, error: colorsError } = await supabaseAdmin
      .from('colors')
      .select('*')
      .limit(1);

    return res.status(200).json({ 
      success: true, 
      receipts: {
        structure: receiptsStructure,
        error: receiptsError?.message
      },
      products: {
        structure: productsStructure,
        error: productsError?.message
      },
      colors: {
        structure: colorsStructure,
        error: colorsError?.message
      }
    });

  } catch (error) {
    console.error('Ошибка API check-table-structure:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
