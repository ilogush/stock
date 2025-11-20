import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

/**
 * API для получения размеров по категории товара
 * 
 * РАЗМЕРЫ В БАЗЕ ДАННЫХ УЖЕ СОДЕРЖАТ ВОЗРАСТ:
 * - Детские (category_id: 3): "92 - 2 года", "98 - 3 года", "104 - 4 года", "110 - 5 лет", "116 - 6 лет", "122 - 7 лет", "134 - 8 лет", "140 - 9 лет", "146 - 10 лет", "152 - 11 лет", "158 - 12 лет", "164 - 13 лет"
 * - Мужские/Женские (category_id: 1,2): "XS", "S", "M", "L", "XL", "XXL", "XXXL"
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ - данные загружаются в реальном времени
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      
      const { category_id } = req.query;

      if (!category_id) {
        return res.status(400).json({ error: 'category_id обязателен' });
      }

      let sizes;

      // Если это детская категория (category_id = 3), показываем только детские размеры
      if (category_id === '3') {
        const { data, error } = await supabaseAdmin
          .from('sizes')
          .select('code, created_at')
          .in('code', [
            '92 - 2 года', '98 - 3 года', '104 - 4 года', '110 - 5 лет', '116 - 6 лет', '122 - 7 лет',
            '134 - 8 лет', '140 - 9 лет', '146 - 10 лет', '152 - 11 лет', '158 - 12 лет', '164 - 13 лет'
          ])
          .order('code', { ascending: true });

        if (error) {
          console.error('Ошибка при получении детских размеров:', error);
          return res.status(500).json({ error: 'Ошибка при получении детских размеров' });
        }

        sizes = data || [];
      } else {
        // Для мужских/женских категорий показываем взрослые размеры (исключаем детские)
        const { data, error } = await supabaseAdmin
          .from('sizes')
          .select('code, created_at')
          .not('code', 'in', '("92 - 2 года","98 - 3 года","104 - 4 года","110 - 5 лет","116 - 6 лет","122 - 7 лет","134 - 8 лет","140 - 9 лет","146 - 10 лет","152 - 11 лет","158 - 12 лет","164 - 13 лет")')
          .order('code', { ascending: true });

        if (error) {
          console.error('Ошибка при получении размеров:', error);
          return res.status(500).json({ error: 'Ошибка при получении размеров' });
        }

        sizes = data || [];
      }

      return res.status(200).json({ sizes });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}