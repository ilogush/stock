import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

const handler = withPermissions(
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
        const userId = getUserIdFromCookie(req);
        log.error('Ошибка при создании бренда', error as Error, {
          endpoint: '/api/brands/create',
          userId: userId || undefined
        });
        if (userId) {
          await logUserAction(userId, 'Создание бренда', 'error', `Ошибка: ${error.message}`);
        }
        return res.status(500).json({ error: 'Ошибка при создании бренда' });
      }

      // Логируем успешное создание бренда
      const userId = getUserIdFromCookie(req);
      if (userId) {
        await logUserAction(userId, 'Создание бренда', 'success', `Создан бренд: ${name}`);
      }

      return res.status(201).json(data);
    } catch (error) {
      log.error('Ошибка сервера при создании бренда', error as Error, {
        endpoint: '/api/brands/create'
      });
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
});

export default withRateLimit(RateLimitConfigs.WRITE)(handler as any) as typeof handler
); 