import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { user_id, action_name, status = 'success', details = null } = req.body;

    if (!user_id || !action_name) {
      return res.status(400).json({ error: 'Необходимы user_id и action_name' });
    }

    const { data, error } = await supabaseAdmin
      .from('user_actions')
      .insert({
        user_id,
        action_name,
        status,
        details,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      log.error('Ошибка создания действия', error as Error, {
        endpoint: '/api/actions/create'
      });
      return res.status(500).json({ error: 'Ошибка создания действия' });
    }

    res.status(201).json({ action: data });

  } catch (error) {
    log.error('Ошибка API создания действия', error as Error, {
      endpoint: '/api/actions/create'
    });
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export default withRateLimit(RateLimitConfigs.WRITE)(handler); 