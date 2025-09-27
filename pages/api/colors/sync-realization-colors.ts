import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    console.log('🔄 Синхронизация цветов для реализаций...');

    // 1. Получаем все цвета из склада (receipt_items)
    const { data: colorsData, error: colorsErr } = await supabaseAdmin
      .from('colors')
      .select('id,name');
    if (colorsErr) {
      console.error('Ошибка при загрузке цветов:', colorsErr);
      return res.status(500).json({ error: 'Ошибка при загрузке цветов' });
    }
    const codeToName = new Map((colorsData||[]).map((c:any)=>[c.id.toString(), c.name] as const));

    // Получаем цвета, используемые на складе
    const { data: receiptItems, error: receiptError } = await supabaseAdmin
      .from('receipt_items')
      .select(`color_id`)
      .not('color_id', 'is', null);
    if (receiptError) {
      console.error('Ошибка при получении данных склада:', receiptError);
      return res.status(500).json({ error: 'Ошибка при получении данных склада' });
    }

    const stockColorIds = new Set();
    (receiptItems || []).forEach(item => {
      if (item.color_id) {
        stockColorIds.add(item.color_id);
      }
    });

    // 2. Получаем цвета, уже используемые в реализациях
    const { data: realizationItems, error: realizationError } = await supabaseAdmin
      .from('realization_items')
      .select(`color_id`)
      .not('color_id', 'is', null);
    if (realizationError) {
      console.error('Ошибка при получении данных реализаций:', realizationError);
      return res.status(500).json({ error: 'Ошибка при получении данных реализаций' });
    }

    const realizationColorIds = new Set();
    (realizationItems || []).forEach(item => {
      if (item.color_id) {
        realizationColorIds.add(item.color_id);
      }
    });

    // 3. Находим цвета, которые есть на складе, но нет в реализациях
    const missingColorIds = Array.from(stockColorIds).filter(colorId => 
      !realizationColorIds.has(colorId)
    );

    console.log(`📊 Найдено ${missingColorIds.length} цветов для добавления в реализации`);

    if (missingColorIds.length === 0) {
      return res.json({
        message: 'Все цвета уже синхронизированы',
        added: 0,
        colors: []
      });
    }

    // 4. Создаем тестовые записи в realization_items для каждого недостающего цвета
    const addedColors = [];
    
    for (const colorId of missingColorIds) {
      try {
        // Находим первый товар с этим цветом на складе для создания тестовой записи
        const { data: sampleItem, error: sampleError } = await supabaseAdmin
          .from('receipt_items')
          .select('product_id, size_code')
          .eq('color_id', colorId)
          .limit(1)
          .single();

        if (sampleError || !sampleItem) {
          console.warn(`Не удалось найти товар для цвета ID ${colorId}`);
          continue;
        }

        // Создаем тестовую запись в realization_items (количество = 0)
        const { error: insertError } = await supabaseAdmin
          .from('realization_items')
          .insert({
            product_id: sampleItem.product_id,
            size_code: sampleItem.size_code,
            color_id: colorId,
            qty: 0, // Тестовое количество
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error(`Ошибка при добавлении цвета ${colorId} в реализации:`, insertError);
        } else {
          const colorName = codeToName.get(colorId.toString()) || `Цвет ID ${colorId}`;
          addedColors.push({
            id: colorId,
            name: colorName
          });
          console.log(`✅ Добавлен цвет: ${colorName} (ID: ${colorId})`);
        }
      } catch (error) {
        console.error(`Ошибка при обработке цвета ${colorId}:`, error);
      }
    }

    console.log(`✅ Синхронизация завершена. Добавлено ${addedColors.length} цветов`);

    return res.json({
      message: 'Синхронизация цветов завершена',
      added: addedColors.length,
      total_missing: missingColorIds.length,
      colors: addedColors,
      details: {
        stock_colors: stockColorIds.size,
        realization_colors_before: realizationColorIds.size,
        missing_colors: missingColorIds.length,
        added_colors: addedColors.length
      }
    });

  } catch (error) {
    console.error('Ошибка при синхронизации цветов:', error);
    return res.status(500).json({ 
      error: 'Ошибка при синхронизации цветов',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
}

