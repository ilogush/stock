import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';

export default withPermissions(
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
        console.error('Ошибка при проверке существующих размеров:', checkError);
        return res.status(500).json({ error: 'Ошибка при проверке размеров' });
      }

      const existingCodes = (existingSizes || []).map(s => s.code);
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
        console.error('Ошибка при добавлении размеров:', insertError);
        return res.status(500).json({ error: 'Ошибка при добавлении размеров' });
      }

      return res.status(201).json({
        message: `Добавлено ${newSizes.length} новых размеров`,
        added: newSizes.length,
        existing: existingCodes.length,
        sizes: insertedSizes
      });

    } catch (error: any) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
});
