import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { hashPassword } from '../../../lib/auth';
import { getUserIdFromCookie } from '../../../lib/actionLogger';
import { logUserAction as actionLogger } from '../../../lib/actionLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Ошибка при получении пользователя:', error);
        return res.status(500).json({ error: 'Ошибка при получении пользователя' });
      }

      // Убираем пароль из ответа
      const { password_hash: _, ...userWithoutPassword } = user;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { email, role_id, first_name, last_name, phone, telegram, avatar_url, password, is_blocked } = req.body;
      
      const updateData: any = { email, role_id, first_name, last_name, phone, telegram, avatar_url };
      
      if (password) {
        updateData.password_hash = await hashPassword(password);
      }

      if (typeof is_blocked !== 'undefined') updateData.is_blocked = !!is_blocked;

      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Ошибка при обновлении пользователя:', error);
        // Логируем ошибку редактирования
        try {
          const actorId = getUserIdFromCookie(req);
          await actionLogger.userUpdate(actorId || 0, `Ошибка при обновлении пользователя ID ${id}: ${error.message}`);
        } catch {}
        return res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
      }

      // Убираем пароль из ответа
      const { password_hash: _, ...userWithoutPassword } = data;
      // Логируем успешное редактирование
      try {
        const actorId = getUserIdFromCookie(req);
        await actionLogger.userUpdate(actorId || 0, `Обновлен пользователь ID ${id} (${userWithoutPassword.email})`);
      } catch {}
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Проверяем, есть ли у пользователя заказы
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('user_id', id)
        .limit(1);

      if (ordersError) {
        console.error('Ошибка проверки заказов пользователя:', ordersError);
        return res.status(500).json({ error: 'Ошибка проверки заказов пользователя' });
      }

      if ((orders || []).length > 0) {
        return res.status(400).json({ error: 'Нельзя удалить пользователя: у него есть заказы' });
      }

      // Мягкое удаление: помечаем is_deleted = true
      const { error } = await supabaseAdmin
        .from('users')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) {
        console.error('Ошибка при удалении пользователя:', error);
        try {
          const actorId = getUserIdFromCookie(req);
          await actionLogger.userDelete(actorId || 0, `Ошибка удаления пользователя ID ${id}: ${error.message}`);
        } catch {}
        return res.status(500).json({ error: 'Ошибка при удалении пользователя' });
      }

      try {
        const actorId = getUserIdFromCookie(req);
        await actionLogger.userDelete(actorId || 0, `Удален пользователь ID ${id}`);
      } catch {}
      return res.status(200).json({ message: 'Пользователь помечен как удаленный' });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 