import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAdminOnly } from '../../../lib/api/roleAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // Получаем основную информацию о реализации
      const { data: realization, error: realizationError } = await supabaseAdmin
      .from('realization')
      .select('*, sender:users!sender_id(id, first_name, last_name, email), recipient:users!recipient_id(id, first_name, last_name, email)')
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
            color_id,
            brand:brands!products_brand_id_fkey(name),
            category:categories!products_category_id_fkey(name)
          )
        `)
        .gte('created_at', new Date(new Date(realization.created_at).getTime() - 60000).toISOString())
        .lte('created_at', new Date(new Date(realization.created_at).getTime() + 60000).toISOString())
        .order('created_at');

      if (itemsError) {
        console.error('Ошибка получения позиций реализации:', itemsError);
        return res.status(500).json({ error: 'Ошибка получения позиций реализации' });
      }

      // Оптимизированная загрузка цветов одним запросом
      const colorIds = Array.from(new Set(
        items?.map((item: any) => item.color_id).filter(Boolean) || []
      ));
      
      let colorsMap: Record<string, string> = {};
      if (colorIds.length > 0) {
        const { data: colors } = await supabaseAdmin
          .from('colors')
          .select('id, name')
          .in('id', colorIds);
        
        colorsMap = Object.fromEntries(
          (colors || []).map((c: any) => [c.id.toString(), c.name])
        );
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
          size_name: item.size_code, // Размер уже в правильном формате
          color_name: colorsMap[item.color_id?.toString()] || item.color_id || '—'
        })) || []
      };

      // Добавляем заголовки для предотвращения кэширования
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      return res.status(200).json(realizationWithItems);
    } catch (error) {
      console.error('Серверная ошибка:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'DELETE') {
    return withAdminOnly(async (req, res) => {
      try {
        const realizationId = parseInt(id as string);
        
        if (isNaN(realizationId)) {
          return res.status(400).json({ error: 'Неверный ID реализации' });
        }

        // Проверяем, существует ли реализация
        const { data: existingRealization, error: checkError } = await supabaseAdmin
          .from('realization')
          .select('id')
          .eq('id', realizationId)
          .single();

        if (checkError || !existingRealization) {
          return res.status(404).json({ error: 'Реализация не найдена' });
        }

        // Получаем время создания реализации для поиска связанных позиций
        const { data: realizationData, error: realizationDataError } = await supabaseAdmin
          .from('realization')
          .select('created_at')
          .eq('id', realizationId)
          .single();

        if (realizationDataError || !realizationData) {
          console.error('Ошибка получения данных реализации:', realizationDataError);
          return res.status(500).json({ error: 'Ошибка получения данных реализации' });
        }

        // Удаляем позиции реализации по времени создания (в пределах 1 минуты)
        const realizationTime = new Date(realizationData.created_at);
        const timeStart = new Date(realizationTime.getTime() - 60000).toISOString();
        const timeEnd = new Date(realizationTime.getTime() + 60000).toISOString();

        const { error: itemsError } = await supabaseAdmin
          .from('realization_items')
          .delete()
          .gte('created_at', timeStart)
          .lte('created_at', timeEnd);

        if (itemsError) {
          console.error('Ошибка удаления позиций реализации:', itemsError);
          return res.status(500).json({ error: 'Ошибка удаления позиций реализации' });
        }

        // Удаляем саму реализацию
        const { error: realizationError } = await supabaseAdmin
          .from('realization')
          .delete()
          .eq('id', realizationId);

        if (realizationError) {
          console.error('Ошибка удаления реализации:', realizationError);
          return res.status(500).json({ error: 'Ошибка удаления реализации' });
        }

        return res.status(200).json({ message: 'Реализация успешно удалена' });
      } catch (error) {
        console.error('Серверная ошибка при удалении реализации:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    })(req, res);
  }

  res.status(405).json({ error: 'Метод не поддерживается' });
} 