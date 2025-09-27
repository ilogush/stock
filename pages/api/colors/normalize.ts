import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { normalizeColorName, getHexFromName } from '../../../lib/unifiedColorService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    console.log('🔧 Начинаем нормализацию цветов...');

    // Получаем все цвета из базы данных
    const { data: colors, error: fetchError } = await supabaseAdmin
      .from('colors')
      .select('id, name, hex_code');

    if (fetchError) {
      console.error('Ошибка при получении цветов:', fetchError);
      return res.status(500).json({ error: 'Ошибка при получении цветов' });
    }

    if (!colors || colors.length === 0) {
      return res.json({ 
        message: 'Цветов не найдено', 
        updated: 0,
        colors: []
      });
    }

    console.log(`📊 Найдено ${colors.length} цветов для нормализации`);

    const updates = [];
    const errors = [];

    // Нормализуем каждый цвет
    for (const color of colors) {
      try {
        const normalizedName = normalizeColorName(color.name);
        const normalizedHex = getHexFromName(color.name);
        
        // Проверяем, нужно ли обновление
        if (normalizedName !== color.name || normalizedHex !== color.hex_code) {
          updates.push({
            id: color.id,
            old_name: color.name,
            old_hex: color.hex_code,
            new_name: normalizedName,
            new_hex: normalizedHex
          });

          // Обновляем цвет в базе данных
          const { error: updateError } = await supabaseAdmin
            .from('colors')
            .update({
              name: normalizedName,
              hex_code: normalizedHex
            })
            .eq('id', color.id);

          if (updateError) {
            console.error(`Ошибка при обновлении цвета ${color.id}:`, updateError);
            errors.push({
              id: color.id,
              name: color.name,
              error: updateError.message
            });
          }
        }
      } catch (error) {
        console.error(`Ошибка при обработке цвета ${color.id}:`, error);
        errors.push({
          id: color.id,
          name: color.name,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        });
      }
    }

    console.log(`✅ Нормализация завершена. Обновлено: ${updates.length}, Ошибок: ${errors.length}`);

    return res.json({
      message: 'Нормализация цветов завершена',
      updated: updates.length,
      errors: errors.length,
      details: {
        updates: updates,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Ошибка при нормализации цветов:', error);
    return res.status(500).json({ 
      error: 'Ошибка при нормализации цветов',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
}

