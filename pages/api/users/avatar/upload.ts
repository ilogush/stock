import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin as db } from '../../../../lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  // Получаем user_id из query
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id обязателен' });
  }

  try {
    // Проверяем что пользователь существует
    const { data: existingUser, error: userError } = await db
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();

    if (userError || !existingUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Парсим файл
    const form = formidable({
      maxFileSize: 20 * 1024 * 1024, // 20MB
      maxFiles: 1,
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.avatar) ? files.avatar[0] : files.avatar;

    if (!file) {
      return res.status(400).json({ error: 'Файл аватара обязателен' });
    }

    // Генерируем уникальное имя
    const ext = path.extname(file.originalFilename || '.jpg');
    const fileName = `avatar_${user_id}_${Date.now()}${ext}`;
    const filePath = `avatars/${fileName}`;

    // Читаем файл
    const buffer = fs.readFileSync(file.filepath);

    // Загружаем в Storage
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, buffer, {
        contentType: file.mimetype || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Ошибка загрузки в Storage:', uploadError);
      return res.status(500).json({ error: 'Ошибка загрузки файла' });
    }

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    // Обновляем пользователя
    const { error: updateError } = await db
      .from('users')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user_id);

    if (updateError) {
      console.error('Ошибка обновления пользователя:', updateError);
      return res.status(500).json({ error: 'Ошибка сохранения в базе данных' });
    }

    return res.status(200).json({ message: 'Аватар загружен', avatar: { url: urlData.publicUrl } });
  } catch (error: any) {
    console.error('Ошибка загрузки аватара:', error);
    return res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
} 