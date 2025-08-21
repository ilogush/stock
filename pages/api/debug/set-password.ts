import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { hashPassword } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { user_id, password } = req.body;

    if (!user_id || !password) {
      return res.status(400).json({ error: 'user_id и password обязательны' });
    }

    // Проверяем минимальную длину пароля
    if (password.length < 4) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 4 символа' });
    }

    const hashedPassword = await hashPassword(password);

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', user_id)
      .select('id, first_name, last_name, email')
      .single();

    if (error) {
      console.error('Ошибка при установке пароля:', error);
      return res.status(500).json({ error: `Ошибка при установке пароля: ${error.message}` });
    }

    return res.status(200).json({
      success: true,
      message: 'Пароль успешно установлен',
      user: data
    });

  } catch (error) {
    console.error('Ошибка при установке пароля:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
