import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserIdFromCookie } from '../../../lib/actionLogger';
import { logAction, ActionTypes } from '../../../lib/actionLogger';

type PriceUpdate = { prefix: string; price: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { updates } = req.body as { updates: PriceUpdate[] };
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Передайте updates: [{ prefix, price }]' });
    }

    // Валидация входных данных
    for (const u of updates) {
      if (!u?.prefix || typeof u.prefix !== 'string') {
        return res.status(400).json({ error: 'prefix обязателен и должен быть строкой' });
      }
      if (typeof u.price !== 'number' || !(u.price > 0)) {
        return res.status(400).json({ error: `Неверная цена для ${u.prefix}` });
      }
    }

    const actorId = getUserIdFromCookie(req) || 0;
    const results: Record<string, number> = {};

    for (const { prefix, price } of updates) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .update({ price, updated_at: new Date().toISOString() })
        .ilike('article', `${prefix}%`)
        .select('id');

      if (error) {
        await logAction({ user_id: actorId, action_name: ActionTypes.PRODUCT_UPDATE, status: 'error', details: `Ошибка обновления цен для ${prefix}: ${error.message}` });
        return res.status(500).json({ error: `Ошибка обновления для префикса ${prefix}` });
      }
      results[prefix] = (data || []).length;
    }

    await logAction({ user_id: actorId, action_name: ActionTypes.PRODUCT_UPDATE, status: 'success', details: `Массовое обновление цен: ${JSON.stringify(results)}` });

    return res.status(200).json({ success: true, updated: results });
  } catch (e: any) {
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}


