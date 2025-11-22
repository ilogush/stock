import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserIdFromCookie, logUserActionDirect as logActionGeneric } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

const handler = withPermissions(
  RoleChecks.canManageBrands,
  'Доступ к брендам разрешен только администраторам'
)(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data: brand, error } = await supabaseAdmin
        .from('brands')
        .select(`
          *,
          company:companies(id, name, address, phone)
        `)
        .eq('id', id)
        .single();

      if (error) {
        log.error('Ошибка при получении бренда', error as Error, {
          endpoint: '/api/brands/[id]'
        });
        return res.status(500).json({ error: 'Ошибка при получении бренда' });
      }

      // Пытаемся загрузить менеджеров (может не работать если таблица brand_managers не создана)
      let managers = [];
      try {
        const { data: managersData, error: managersError } = await supabaseAdmin
          .from('brand_managers')
          .select(`
            user_id,
            user:users(id, first_name, last_name, email, role_id, phone, role:roles(display_name))
          `)
          .eq('brand_id', id);

        if (!managersError && managersData) {
          managers = managersData.map((item: any) => ({
            id: item.user?.id,
            first_name: item.user?.first_name,
            last_name: item.user?.last_name,
            email: item.user?.email,
            role_id: item.user?.role_id,
            phone: item.user?.phone,
            role_display: item.user?.role?.display_name,
            name: `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim()
          });
        }
      } catch (managerError) {

      }

      return res.status(200).json({ brand, managers });
    } catch (error) {
      log.error('Ошибка сервера при получении бренда', error as Error, {
        endpoint: '/api/brands/[id]'
      });
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { name, company_id } = req.body;
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (company_id !== undefined) updateData.company_id = company_id;

      const { data, error } = await supabaseAdmin
        .from('brands')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        const actorId = getUserIdFromCookie(req);
        log.error('Ошибка при обновлении бренда', error as Error, {
          endpoint: '/api/brands/[id]',
          userId: actorId || undefined
        });
        try {
          await logActionGeneric(actorId || 0, 'Редактирование бренда', 'error', `Ошибка обновления бренда ID ${id}: ${error.message}`);
        } catch {}
        return res.status(500).json({ error: 'Ошибка при обновлении бренда' });
      }

      try {
        const actorId = getUserIdFromCookie(req);
        await logActionGeneric(actorId || 0, 'Редактирование бренда', 'success', `Обновлен бренд ID ${id}${name ? ` → ${name}` : ''}`);
      } catch {}
      return res.status(200).json(data);
    } catch (error) {
      log.error('Ошибка сервера при обновлении бренда', error as Error, {
        endpoint: '/api/brands/[id]'
      });
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
});

export default withRateLimit(RateLimitConfigs.API)(handler as any) as typeof handler
); 