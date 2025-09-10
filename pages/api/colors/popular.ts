import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Получаем цвета с количеством товаров
      const { data: colorsWithCount, error } = await supabaseAdmin
        .from('colors')
        .select(`
          id,
          name,
          hex_value,
          created_at,
          products!products_color_id_fkey(count)
        `)
        .order('products!products_color_id_fkey(count)', { ascending: false });

      if (error) {
        console.error('Ошибка при получении цветов с количеством товаров:', error);
        return res.status(500).json({ error: 'Ошибка при получении цветов' });
      }

      // Преобразуем данные для удобства использования
      const colorsWithPopularity = (colorsWithCount || []).map((color: any) => ({
        id: color.id,
        name: color.name,
        hex_value: color.hex_value,
        created_at: color.created_at,
        product_count: color.products?.[0]?.count || 0
      }));
      
      return res.status(200).json({ colors: colorsWithPopularity });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 