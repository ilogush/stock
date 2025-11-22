import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';
import { withCsrfProtection } from '../../../lib/csrf';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

const handler = withPermissions(
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
        const userId = getUserIdFromCookie(req);
        log.error('Ошибка при создании компании', error as Error, {
          endpoint: '/api/companies/create',
          userId: userId || undefined
        });
        if (userId) {
          await logUserAction(userId, 'Создание компании', 'error', `Ошибка: ${error.message}`);
        }
        return res.status(500).json({ error: 'Ошибка при создании компании' });
      }

      // Логируем успешное создание компании
      const userId = getUserIdFromCookie(req);
      if (userId) {
        await logUserAction(userId, 'Создание компании', 'success', `Создана компания: ${name.trim()}`);
      }

      return res.status(201).json(data);
    } catch (error) {
      log.error('Ошибка сервера при создании компании', error as Error, {
        endpoint: '/api/companies/create'
      });
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
});

// Применяем CSRF защиту и rate limiting для модифицирующих операций
export default withCsrfProtection(
  withRateLimit(RateLimitConfigs.WRITE)(handler as any) as typeof handler
); 