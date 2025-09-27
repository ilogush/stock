import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    console.log('🔍 Анализ несоответствий в цветах...');

    // 1. Получаем все уникальные цвета из склада
    console.log('📦 Анализируем цвета на складе...');
    
    // Загружаем цвета для получения русских названий
    const { data: colorsData, error: colorsErr } = await supabaseAdmin
      .from('colors')
      .select('id,name');
    if (colorsErr) {
      console.error('Ошибка при загрузке цветов:', colorsErr);
      return res.status(500).json({ error: 'Ошибка при загрузке цветов' });
    }
    const codeToName = new Map((colorsData||[]).map((c:any)=>[c.id.toString(), c.name] as const));

    // Получаем данные из поступлений
    const { data: receiptItems, error: receiptError } = await supabaseAdmin
      .from('receipt_items')
      .select(`product_id,size_code,qty,color_id`)
      .order('product_id, size_code');
    if (receiptError) {
      console.error('Ошибка при получении данных поступлений:', receiptError);
      return res.status(500).json({ error: 'Ошибка при получении данных поступлений' });
    }

    const stockColorNames = new Set();
    const stockColorIds = new Set();
    
    (receiptItems || []).forEach(item => {
      if (item.color_id && codeToName.has(item.color_id.toString())) {
        const colorName = codeToName.get(item.color_id.toString());
        if (colorName) {
          stockColorNames.add(colorName);
          stockColorIds.add(item.color_id);
        }
      }
    });

    // 2. Получаем все уникальные цвета из реализаций
    console.log('📤 Анализируем цвета в реализациях...');
    const { data: realizationItems, error: realizationError } = await supabaseAdmin
      .from('realization_items')
      .select(`product_id,size_code,qty,color_id`);

    if (realizationError) {
      console.error('Ошибка при получении данных реализаций:', realizationError);
      return res.status(500).json({ error: 'Ошибка при получении данных реализаций' });
    }

    const realizationColorNames = new Set();
    const realizationColorIds = new Set();
    
    (realizationItems || []).forEach(item => {
      if (item.color_id && codeToName.has(item.color_id.toString())) {
        const colorName = codeToName.get(item.color_id.toString());
        if (colorName) {
          realizationColorNames.add(colorName);
          realizationColorIds.add(item.color_id);
        }
      }
    });

    // 3. Получаем полную информацию о цветах
    const { data: allColors, error: allColorsError } = await supabaseAdmin
      .from('colors')
      .select('id, name, hex_code')
      .order('id');

    if (allColorsError) {
      console.error('Ошибка при получении всех цветов:', allColorsError);
      return res.status(500).json({ error: 'Ошибка при получении всех цветов' });
    }

    // 4. Анализируем несоответствия
    const stockOnlyColors = Array.from(stockColorNames).filter(color => 
      !realizationColorNames.has(color)
    );
    
    const realizationOnlyColors = Array.from(realizationColorNames).filter(color => 
      !stockColorNames.has(color)
    );

    // 5. Создаем детальную информацию о каждом цвете
    const colorDetails = allColors.map(color => {
      const usedIn = [];
      if (stockColorIds.has(color.id)) usedIn.push('склад');
      if (realizationColorIds.has(color.id)) usedIn.push('реализации');
      
      return {
        id: color.id,
        name: color.name,
        hex_code: color.hex_code,
        used_in: usedIn,
        is_mismatched: usedIn.length === 1 && usedIn[0] === 'склад'
      };
    });

    // 6. Находим проблемные цвета (есть на складе, но нет в реализациях)
    const problematicColors = colorDetails.filter(color => color.is_mismatched);

    console.log(`✅ Анализ завершен. Найдено ${problematicColors.length} проблемных цветов`);

    return res.json({
      summary: {
        total_colors: allColors.length,
        stock_colors: stockColorNames.size,
        realization_colors: realizationColorNames.size,
        stock_only_colors: stockOnlyColors.length,
        realization_only_colors: realizationOnlyColors.length,
        problematic_colors: problematicColors.length
      },
      mismatches: {
        stock_only: stockOnlyColors,
        realization_only: realizationOnlyColors
      },
      problematic_colors: problematicColors,
      all_colors: colorDetails
    });

  } catch (error) {
    console.error('Ошибка при анализе цветов:', error);
    return res.status(500).json({ 
      error: 'Ошибка при анализе цветов',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
}
