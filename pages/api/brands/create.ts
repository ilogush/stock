import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';

export default withPermissions(
  RoleChecks.canManageBrands,
  'Создание брендов разрешено только администраторам'
)(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { name, company_id } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Название бренда обязательно' });
      }

      const brandData: any = { name };
      if (company_id) {
        brandData.company_id = company_id;
      }

      const { data, error } = await supabaseAdmin
        .from('brands')
        .insert(brandData)
        .select()
        .single();

      if (error) {
        console.error('Ошибка при создании бренда:', error);
        const userId = getUserIdFromCookie(req);
        await logUserAction(userId, 'Создание бренда', 'error', `Ошибка: ${error.message}`);
        return res.status(500).json({ error: 'Ошибка при создании бренда' });
      }

      // Логируем успешное создание бренда
      const userId = getUserIdFromCookie(req);
      await logUserAction(userId, 'Создание бренда', 'success', `Создан бренд: ${name}`);

      return res.status(201).json(data);
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}); 