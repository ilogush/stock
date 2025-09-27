import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID товара обязателен' });
      }

      // Получаем артикул товара
      const { data: productData, error: productError } = await supabaseAdmin
        .from('products')
        .select('article')
        .eq('id', id)
        .single();

      if (productError) {
        console.error('Ошибка при получении товара:', productError);
        return res.status(500).json({ error: 'Ошибка при получении товара' });
      }

      if (!productData || !productData.article) {
        return res.status(200).json({ colors: [] });
      }

      // Получаем все товары с этим артикулом
      const { data: productsWithColors, error: colorsError } = await supabaseAdmin
        .from('products')
        .select('color_id')
        .eq('article', productData.article);

      if (colorsError) {
        console.error('Ошибка при получении товаров:', colorsError);
        return res.status(500).json({ error: 'Ошибка при получении товаров' });
      }

      // Получаем уникальные color_id, фильтруем только числовые значения
      const colorIds = (productsWithColors || [])
        .map((p: any) => p.color_id)
        .filter((value: any) => {
          // Фильтруем только числовые значения
          if (value === null || value === undefined) return false;
          const numValue = parseInt(value);
          return !isNaN(numValue) && numValue > 0;
        })
        .map((value: any) => parseInt(value))
        .filter((value: any, index: number, self: any[]) => self.indexOf(value) === index);

      if (colorIds.length === 0) {
        return res.status(200).json({ colors: [] });
      }

      // Получаем информацию о цветах
      const { data: colorsData, error: colorsInfoError } = await supabaseAdmin
        .from('colors')
        .select('id, name')
        .in('id', colorIds);

      if (colorsInfoError) {
        console.error('Ошибка при получении информации о цветах:', colorsInfoError);
        return res.status(500).json({ error: 'Ошибка при получении информации о цветах' });
      }

      res.status(200).json({ colors: colorsData || [] });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  } else {
    res.status(405).json({ error: 'Метод не поддерживается' });
  }
}
