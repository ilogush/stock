import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { role } = req.query;

      if (!role) {
        return res.status(400).json({ error: 'Параметр role обязателен' });
      }

      // Получаем роль по названию
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('name', role)
        .single();

      if (roleError || !roleData) {
        return res.status(404).json({ error: 'Роль не найдена' });
      }

      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('role_id', roleData.id)
        .order('id');

      if (error) {
        console.error('Ошибка при получении пользователей по роли:', error);
        return res.status(500).json({ error: 'Ошибка при получении пользователей' });
      }

      return res.status(200).json(users || []);
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 