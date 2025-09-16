import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';

export default withPermissions(
  RoleChecks.canManageCompanies,
  'Создание компаний разрешено только администраторам'
)(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { name, address, phone } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Название компании обязательно' });
      }

      const { data, error } = await supabaseAdmin
        .from('companies')
        .insert({ 
          name: name.trim(), 
          address: address?.trim() || null,
          phone: phone?.trim() || null
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка при создании компании:', error);
        const userId = getUserIdFromCookie(req);
        await logUserAction(userId, 'Создание компании', 'error', `Ошибка: ${error.message}`);
        return res.status(500).json({ error: 'Ошибка при создании компании' });
      }

      // Логируем успешное создание компании
      const userId = getUserIdFromCookie(req);
      await logUserAction(userId, 'Создание компании', 'success', `Создана компания: ${name.trim()}`);

      return res.status(201).json(data);
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}); 