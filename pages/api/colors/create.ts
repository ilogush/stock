import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { getHexFromName } from '../../../lib/colorService';
import { withCsrfProtection } from '../../../lib/csrf';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { name, hex_code } = req.body;

      // Нормализуем данные
      const normalizedName = name.trim();
      
      // Генерируем HEX-код автоматически, если не передан
      const generatedHexCode = hex_code || getHexFromName(normalizedName);

      // Проверяем, существует ли уже цвет с таким названием
      const { data: existingColorByName } = await supabaseAdmin
        .from('colors')
        .select('*')
        .eq('name', normalizedName)
        .single();

      if (existingColorByName) {
        return res.status(400).json({ error: 'Цвет с таким названием уже существует' });
      }

      // Создаем новый цвет с hex_code
      const { data, error } = await supabaseAdmin
        .from('colors')
        .insert({
          name: normalizedName,
          hex_code: generatedHexCode
        })
        .select()
        .single();

      if (error) {
        const userId = getUserIdFromCookie(req);
        log.error('Ошибка создания цвета', error as Error, {
          endpoint: '/api/colors/create',
          userId: userId && userId > 0 ? userId : undefined
        });
        if (userId && userId > 0) {
          await logUserAction(userId, 'Создание цвета', 'error', `Ошибка: ${error.message}`);
        }
        return res.status(500).json({ error: 'Ошибка создания цвета' });
      }

      // Логируем успешное создание цвета
      const userId = getUserIdFromCookie(req);
      if (userId && userId > 0) {
        await logUserAction(userId, 'Создание цвета', 'success', `${normalizedName} (${generatedHexCode})`);
      }

      // Возвращаем данные с сгенерированным HEX-кодом
      return res.status(201).json(data);
    } catch (error) {
      log.error('Ошибка сервера при создании цвета', error as Error, {
        endpoint: '/api/colors/create'
      });
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}

// Применяем CSRF защиту и rate limiting для модифицирующих операций
export default withCsrfProtection(
  withRateLimit(RateLimitConfigs.WRITE)(handler)
);