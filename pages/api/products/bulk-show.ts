import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth } from '../../../lib/middleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Включаем отображение на сайте для всех товаров
    const { error } = await supabaseAdmin
      .from('products')
      .update({ is_visible: true, updated_at: new Date().toISOString() })
      .neq('is_visible', true);

    if (error) {
      console.error('Ошибка массового обновления is_visible:', error);
      return res.status(500).json({ error: 'Ошибка обновления' });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Ошибка API bulk-show:', e);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export default withAuth(handler);


