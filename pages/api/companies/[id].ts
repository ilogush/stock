import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserIdFromCookie } from '../../../lib/actionLogger';
import { logAction, ActionTypes } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

const handler = withPermissions(
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
        log.error('Ошибка при получении компании', error as Error, {
          endpoint: '/api/companies/[id]'
        });
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
      log.error('Ошибка сервера при получении компании', error as Error, {
        endpoint: '/api/companies/[id]'
      });
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
        const actorId = getUserIdFromCookie(req);
        log.error('Ошибка при обновлении компании', error as Error, {
          endpoint: '/api/companies/[id]',
          userId: actorId || undefined
        });
        try {
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
      log.error('Ошибка сервера при обновлении компании', error as Error, {
        endpoint: '/api/companies/[id]'
      });
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Проверяем есть ли связанные данные
      const { data: receipts } = await supabaseAdmin
        .from('receipts')
        .select('id')
        .eq('company_id', id)
        .limit(1);

      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('company_id', id)
        .limit(1);

      const { data: brands } = await supabaseAdmin
        .from('brands')
        .select('id')
        .eq('company_id', id)
        .limit(1);

      if (receipts && receipts.length > 0) {
        return res.status(400).json({ 
          error: 'Нельзя удалить компанию. Есть связанные поступления.',
          hasReceipts: true
        });
      }

      if (orders && orders.length > 0) {
        return res.status(400).json({ 
          error: 'Нельзя удалить компанию. Есть связанные заказы.',
          hasOrders: true
        });
      }

      if (brands && brands.length > 0) {
        return res.status(400).json({ 
          error: 'Нельзя удалить компанию. Есть связанные бренды.',
          hasBrands: true
        });
      }

      // Удаляем компанию
      const { error } = await supabaseAdmin
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) {
        const actorId = getUserIdFromCookie(req);
        log.error('Ошибка при удалении компании', error as Error, {
          endpoint: '/api/companies/[id]',
          userId: actorId || undefined
        });
        try {
          await logAction({ user_id: actorId || 0, action_name: ActionTypes.COMPANY_DELETE, status: 'error', details: `Ошибка удаления компании ID ${id}: ${error.message}` });
        } catch {}
        return res.status(500).json({ error: `Ошибка при удалении компании: ${error.message}` });
      }

      try {
        const actorId = getUserIdFromCookie(req);
        await logAction({ user_id: actorId || 0, action_name: ActionTypes.COMPANY_DELETE, status: 'success', details: `Удалена компания ID ${id}` });
      } catch {}

      return res.status(200).json({ message: 'Компания успешно удалена' });
    } catch (error) {
      log.error('Ошибка сервера при удалении компании', error as Error, {
        endpoint: '/api/companies/[id]'
      });
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
});

export default withRateLimit(RateLimitConfigs.API)(handler as any) as typeof handler
); 