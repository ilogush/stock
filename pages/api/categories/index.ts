import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

type Category = {
  id: number;
  name: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ - данные загружаются в реальном времени
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      
      // Загружаем все категории
      const { data: categories, error } = await supabaseAdmin
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Ошибка загрузки категорий:', error);
        return res.status(500).json({ error: 'Ошибка загрузки категорий' });
      }

      return res.status(200).json(categories || []);
    } catch (error) {
      console.error('Ошибка:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 