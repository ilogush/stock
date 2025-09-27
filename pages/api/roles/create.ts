import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  const { name, display_name } = req.body;

  if (!name || !display_name) {
    return res.status(400).json({ error: 'Поле name и display_name обязательны' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .insert({ name, display_name })
      .select('*')
      .single();

    if (error) {
      const userId = getUserIdFromCookie(req);
      await logUserAction(userId, 'Создание роли', 'error', `Ошибка: ${error.message}`);
      
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Роль с таким ключом уже существует' });
      }
      console.error('Ошибка при создании роли:', error);
      return res.status(500).json({ error: 'Ошибка при создании роли' });
    }

    // Логируем успешное создание роли
    const userId = getUserIdFromCookie(req);
    await logUserAction(userId, 'Создание роли', 'success', `Создана роль: ${name}`);

    return res.status(201).json(data);
  } catch (e) {
    console.error('Ошибка сервера:', e);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
} 