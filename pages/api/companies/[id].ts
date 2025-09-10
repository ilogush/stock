import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserIdFromCookie } from '../../../lib/actionLogger';
import { logAction, ActionTypes } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';

export default withPermissions(
  RoleChecks.canManageCompanies,
  'Доступ к компаниям разрешен только администраторам'
)(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data: company, error } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Ошибка при получении компании:', error);
        return res.status(500).json({ error: 'Ошибка при получении компании' });
      }

      // Получаем бренды компании (если есть связь)
      const { data: brands } = await supabaseAdmin
        .from('brands')
        .select('id, name')
        .eq('company_id', id);

      return res.status(200).json({ 
        company, 
        brands: brands || [] 
      });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
  
      const { name, address, phone } = req.body;

      // Валидация
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Название компании обязательно' });
      }

      const updateData = { 
        name: name.trim(), 
        address: address?.trim() || null,
        phone: phone?.trim() || null
      };

      

      const { data, error } = await supabaseAdmin
        .from('companies')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Ошибка при обновлении компании:', error);
        try {
          const actorId = getUserIdFromCookie(req);
          await logAction({ user_id: actorId || 0, action_name: ActionTypes.COMPANY_UPDATE, status: 'error', details: `Ошибка обновления компании ID ${id}: ${error.message}` });
        } catch {}
        return res.status(500).json({ error: `Ошибка при обновлении компании: ${error.message}` });
      }

      try {
        const actorId = getUserIdFromCookie(req);
        await logAction({ user_id: actorId || 0, action_name: ActionTypes.COMPANY_UPDATE, status: 'success', details: `Обновлена компания ID ${id} → ${name}` });
      } catch {}
      return res.status(200).json(data);
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}); 