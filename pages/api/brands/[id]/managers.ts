import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getUserIdFromCookie, logUserActionDirect as logActionGeneric } from '../../../../lib/actionLogger';
import { withPermissions, RoleChecks } from '../../../../lib/api/roleAuth';

export default withPermissions(
  RoleChecks.canManageBrands,
  'Управление менеджерами брендов разрешено только администраторам'
)(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: brandId } = req.query;

  if (req.method === 'POST') {
    // Добавление менеджера к бренду
    try {
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'user_id обязателен' });
      }

      const { data, error } = await supabaseAdmin
        .from('brand_managers')
        .insert({ brand_id: brandId, user_id })
        .select('*, user:users(id, first_name, last_name, email)')
        .single();

      if (error) {
        console.error('Ошибка при добавлении менеджера:', error);
        // Обработка ошибки дублирования
        if (error.code === '23505') {
          return res.status(409).json({ error: 'Этот пользователь уже является менеджером данного бренда' });
        }
        try {
          const actorId = getUserIdFromCookie(req);
          await logActionGeneric(actorId || 0, 'Редактирование бренда', 'error', `Ошибка добавления менеджера ${user_id} к бренду ${brandId}: ${error.message}`);
        } catch {}
        return res.status(500).json({ error: 'Ошибка при добавлении менеджера' });
      }

      try {
        const actorId = getUserIdFromCookie(req);
        await logActionGeneric(actorId || 0, 'Редактирование бренда', 'success', `Добавлен менеджер ${user_id} к бренду ${brandId}`);
      } catch {}
      return res.status(201).json(data);
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'DELETE') {
    // Удаление менеджера из бренда
    try {
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'user_id обязателен' });
      }

      const { error } = await supabaseAdmin
        .from('brand_managers')
        .delete()
        .eq('brand_id', brandId)
        .eq('user_id', user_id);

      if (error) {
        console.error('Ошибка при удалении менеджера:', error);
        try {
          const actorId = getUserIdFromCookie(req);
          await logActionGeneric(actorId || 0, 'Редактирование бренда', 'error', `Ошибка удаления менеджера ${user_id} из бренда ${brandId}: ${error.message}`);
        } catch {}
        return res.status(500).json({ error: 'Ошибка при удалении менеджера' });
      }

      try {
        const actorId = getUserIdFromCookie(req);
        await logActionGeneric(actorId || 0, 'Редактирование бренда', 'success', `Удален менеджер ${user_id} из бренда ${brandId}`);
      } catch {}
      return res.status(200).json({ message: 'Менеджер удален' });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}); 