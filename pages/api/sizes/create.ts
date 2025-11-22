import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';
import { withCsrfProtection } from '../../../lib/csrf';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

const handler = withPermissions(
  RoleChecks.canManageProducts,
  'Управление размерами доступно только администраторам и менеджерам'
)(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { sizes } = req.body;

      if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
        return res.status(400).json({ error: 'Массив размеров обязателен' });
      }

      // Проверяем, какие размеры уже существуют
      const { data: existingSizes, error: checkError } = await supabaseAdmin
        .from('sizes')
        .select('code')
        .in('code', sizes);

      if (checkError) {
        log.error('Ошибка при проверке существующих размеров', checkError as Error, {
          endpoint: '/api/sizes/create'
        });
        return res.status(500).json({ error: 'Ошибка при проверке размеров' });
      }

      const existingCodes = (existingSizes || []).map((s: any) => s.code);
      const newSizes = sizes.filter(size => !existingCodes.includes(size));

      if (newSizes.length === 0) {
        return res.status(200).json({ 
          message: 'Все размеры уже существуют',
          added: 0,
          existing: existingCodes.length
        });
      }

      // Добавляем новые размеры
      const { data: insertedSizes, error: insertError } = await supabaseAdmin
        .from('sizes')
        .insert(newSizes.map(code => ({ code })))
        .select();

      if (insertError) {
        log.error('Ошибка при добавлении размеров', insertError as Error, {
          endpoint: '/api/sizes/create'
        });
        return res.status(500).json({ error: 'Ошибка при добавлении размеров' });
      }

      return res.status(201).json({
        message: `Добавлено ${newSizes.length} новых размеров`,
        added: newSizes.length,
        existing: existingCodes.length,
        sizes: insertedSizes
      });

    } catch (error: any) {
      log.error('Ошибка сервера при создании размеров', error as Error, {
        endpoint: '/api/sizes/create'
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
