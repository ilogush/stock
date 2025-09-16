import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin as db } from '../../../../lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { getUserIdFromCookie } from '../../../../lib/actionLogger';
import { logAction } from '../../../../lib/actionLogger';

// Отключаем default body parser для файлов
export const config = {
  api: {
    bodyParser: false,
  },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  console.log('=== НАЧАЛО ЗАГРУЗКИ ИЗОБРАЖЕНИЯ ===');

  try {
    const form = formidable({
      maxFileSize: 20 * 1024 * 1024, // 20MB
      maxFiles: 1,
    });

    // В некоторых версиях типов formidable возвращает кортеж [fields, files],
    // в других — объект {fields, files}. Приводим к универсальному виду.
    const parsed: any = await form.parse(req);
    const fields = parsed.fields ?? parsed[0];
    const files = parsed.files ?? parsed[1];
    
    // Извлекаем данные из полей/файлов
    const productIdRaw = (Array.isArray(fields.product_id) ? fields.product_id[0] : fields.product_id) as string | undefined;
    const productId = productIdRaw ? parseInt(productIdRaw, 10) : undefined;

    const uploaded = files.file as any;
    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;

    console.log('Данные запроса:', { productId, file: file ? { name: file.originalFilename, size: file.size, mimetype: file.mimetype } : null });

    if (!productId || !file) {
      console.log('Ошибка: отсутствуют product_id или файл');
      return res.status(400).json({ error: 'Необходимо указать product_id и файл' });
    }

    // Проверяем существование товара
    const { data: product, error: productError } = await db
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    // Генерируем уникальное имя файла
    const fileExtension = path.extname(file.originalFilename || '');
    const fileName = `product_${productId}_${Date.now()}${fileExtension}`;
    const filePath = `products/${fileName}`;

    // Читаем файл
    const fileBuffer = fs.readFileSync(file.filepath);

    // Загружаем в Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, fileBuffer, {
        contentType: file.mimetype || 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Ошибка загрузки в Storage:', uploadError);
      try {
        const actorId = getUserIdFromCookie(req);
        await logAction({ user_id: actorId || 0, action_name: 'Загрузка изображения товара', status: 'error', details: `Ошибка Storage: ${uploadError.message}` });
      } catch {}
      return res.status(500).json({ error: 'Ошибка загрузки файла' });
    }

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    // Сохраняем запись в БД
    console.log('Сохраняем в БД:', { product_id: productId, image_url: urlData.publicUrl });
    
    const { data: imageRecord, error: dbError } = await db
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: urlData.publicUrl
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('Ошибка сохранения в БД:', dbError);
      try {
        const actorId = getUserIdFromCookie(req);
        await logAction({ user_id: actorId || 0, action_name: 'Загрузка изображения товара', status: 'error', details: `Ошибка БД: ${dbError.message}` });
      } catch {}
      return res.status(500).json({ error: 'Ошибка сохранения в базе данных' });
    }

    console.log('Запись успешно сохранена в БД:', imageRecord);

    console.log('=== ЗАГРУЗКА ИЗОБРАЖЕНИЯ ЗАВЕРШЕНА УСПЕШНО ===');
    
    res.status(200).json({
      message: 'Изображение успешно загружено',
      image: imageRecord
    });
    try {
      const actorId = getUserIdFromCookie(req);
      await logAction({ user_id: actorId || 0, action_name: 'Загрузка изображения товара', status: 'success', details: `Товар ${productId}, файл ${fileName}` });
    } catch {}

  } catch (error: any) {
    console.error('Ошибка загрузки изображения:', error);
    try {
      const actorId = getUserIdFromCookie(req);
      await logAction({ user_id: actorId || 0, action_name: 'Загрузка изображения товара', status: 'error', details: `Ошибка: ${error.message}` });
    } catch {}
    res.status(500).json({
      error: 'Ошибка сервера',
      details: error.message
    });
  }
} 