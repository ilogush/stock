import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

/**
 * API для получения всех размеров одежды
 * 
 * РАЗМЕРЫ В БАЗЕ ДАННЫХ УЖЕ СОДЕРЖАТ ВОЗРАСТ:
 * - Детские: "92 (2 года)", "98 (3 года)", "104 (4 года)", "110 (5 лет)", "116 (6 лет)", "122 (7 лет)"
 * - Взрослые: "XS", "S", "M", "L", "XL", "XXL", "XXXL"
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ - данные загружаются в реальном времени
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      
      const { data: sizes, error } = await supabaseAdmin
        .from('sizes')
        .select('code, created_at')
        .order('code', { ascending: true });

      if (error) {
        console.error('Ошибка при получении размеров:', error);
        return res.status(500).json({ error: 'Ошибка при получении размеров' });
      }

      return res.status(200).json({ sizes: sizes || [] });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 