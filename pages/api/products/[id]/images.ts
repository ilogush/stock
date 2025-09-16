import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin as db } from '../../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data: images, error } = await db
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Ошибка получения изображений:', error);
        return res.status(500).json({ error: 'Ошибка получения изображений' });
      }

      // Преобразуем относительные пути в полные URL
      const imagesWithFullUrls = (images || []).map((img: any) => ({
        ...img,
        image_url: img.image_url.startsWith('http') 
          ? img.image_url 
          : `https://bznpvufwcmohaedsqber.supabase.co/storage/v1/object/public/images/${img.image_url}`
      }));

      res.status(200).json({ images: imagesWithFullUrls });
    } catch (error: any) {
      console.error('Ошибка сервера:', error);
      res.status(500).json({ 
        error: 'Ошибка сервера',
        details: error.message 
      });
    }
  } else if (req.method === 'DELETE') {
    // Удаление конкретного изображения
    const { image_id } = req.body;
    
    if (!image_id) {
      return res.status(400).json({ error: 'Необходимо указать image_id' });
    }

    try {
      const imgId = parseInt(image_id, 10);

      // Находим запись, чтобы узнать путь файла
      const { data: imgRecord } = await db
        .from('product_images')
        .select('image_url')
        .eq('id', imgId)
        .single();

      const { error } = await db
        .from('product_images')
        .delete()
        .eq('id', imgId)
        .eq('product_id', id);

      // Удаляем файл из Storage (если запись удалена и url известен)
      if (!error && imgRecord?.image_url) {
        try {
          const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
          const bucketPath = imgRecord.image_url.replace(`${supaUrl}/storage/v1/object/public/images/`, '');
          // используем anon клиент, чтобы не тянуть service key в браузер
          const { createClient } = await import('@supabase/supabase-js');
          const supa = createClient(supaUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
          await supa.storage.from('images').remove([bucketPath]);
        } catch {}
      }

      res.status(200).json({ message: 'Изображение удалено' });
      try {
        const { getUserIdFromCookie } = await import('../../../../lib/actionLogger');
        const { logAction } = await import('../../../../lib/actionLogger');
        const actorId = getUserIdFromCookie(req);
        await logAction({ user_id: actorId || 0, action_name: 'Удаление изображения товара', status: 'success', details: `product_id=${id}, image_id=${imgId}` });
      } catch {}
    } catch (error: any) {
      console.error('Ошибка сервера:', error);
      try {
        const { getUserIdFromCookie } = await import('../../../../lib/actionLogger');
        const { logAction } = await import('../../../../lib/actionLogger');
        const actorId = getUserIdFromCookie(req);
        await logAction({ user_id: actorId || 0, action_name: 'Удаление изображения товара', status: 'error', details: `product_id=${id}, error=${error.message}` });
      } catch {}
      res.status(500).json({ 
        error: 'Ошибка сервера',
        details: error.message 
      });
    }
  } else {
    res.status(405).json({ error: 'Метод не поддерживается' });
  }
} 