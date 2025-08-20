import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // Получаем основную информацию о реализации
      const { data: realization, error: realizationError } = await supabaseAdmin
      .from('realization')
      .select(`
        *,
        sender:users!realization_sender_id_fkey(id, first_name, last_name, email),
        recipient:users!realization_recipient_id_fkey(id, first_name, last_name, email)
      `)
      .eq('id', id)
      .single();

      if (realizationError) {
        console.error('Ошибка получения реализации:', realizationError);
        return res.status(404).json({ error: 'Реализация не найдена' });
      }

      // Получаем позиции реализации с информацией о товарах
      const { data: items, error: itemsError } = await supabaseAdmin
        .from('realization_items')
        .select(`
          *,
          product:products!realization_items_product_id_fkey(
            id, 
            name, 
            article,
            brand:brands!products_brand_id_fkey(name),
            category:categories!products_category_id_fkey(name)
          )
        `)
        .eq('realization_id', id)
        .order('created_at');

      if (itemsError) {
        console.error('Ошибка получения позиций реализации:', itemsError);
        return res.status(500).json({ error: 'Ошибка получения позиций реализации' });
      }

      // Получаем справочники цветов и размеров
      const [colorsRes, sizesRes] = await Promise.all([
        supabaseAdmin.from('colors').select('id, name'),
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sizes`).then(r => r.json())
      ]);

      const colorsMap: Record<string, string> = {};
      const sizesMap: Record<string, string> = {};

              if (colorsRes.data) {
          colorsRes.data.forEach((color: any) => {
            colorsMap[color.id.toString()] = color.name;
          });
        }

      if (sizesRes.sizes) {
        sizesRes.sizes.forEach((size: any) => {
          sizesMap[size.code] = size.code; // Теперь в БД уже хранится возраст
        });
      }

      // Формируем ответ
      const realizationWithItems = {
        ...realization,
        sender_name: realization.sender ? 
          `${realization.sender.first_name || ''} ${realization.sender.last_name || ''}`.trim() || realization.sender.email : 
          'Не указан',
        recipient_name: realization.recipient ? 
          `${realization.recipient.first_name || ''} ${realization.recipient.last_name || ''}`.trim() || realization.recipient.email : 
          'Не указан',
        items: items?.map((item: any) => ({
          ...item,
          product_name: item.product?.name || 'Товар не найден',
          article: item.product?.article || '',
          brand_name: item.product?.brand?.name || '',
          category_name: item.product?.category?.name || '',
          size_name: sizesMap[item.size_code] || item.size_code,
          color_name: colorsMap[item.color_id.toString()] || item.color_id
        })) || []
      };

      return res.status(200).json(realizationWithItems);
    } catch (error) {
      console.error('Серверная ошибка:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  res.status(405).json({ error: 'Метод не поддерживается' });
} 