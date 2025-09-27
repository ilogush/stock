import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Генерация уникальных текстов на основе данных товара
function buildCareInstructions(name: string, article: string) {
  return `Рекомендации по уходу за изделием: деликатная стирка при 30°C, без отбеливателей, сушка на горизонтальной поверхности, глажка на низкой температуре. Модель: ${name}. Артикул: ${article}.`;
}

function buildFeatures(name: string, category?: string | null, color?: string | null, article?: string) {
  const parts: string[] = [];
  parts.push(`Ключевые особенности модели: ${name}`);
  if (category) parts.push(`Категория: ${category}`);
  if (color) parts.push(`Цвет: ${color}`);
  if (article) parts.push(`Артикул: ${article}`);
  return parts.join('. ') + '.';
}

function buildTechSpecs(composition?: string | null, article?: string) {
  const base = composition ? `Состав: ${composition}` : 'Состав: уточняется';
  const today = new Date().toISOString().slice(0, 10);
  return `ТТХ: ${base}. Плотность трикотажа — оптимальная для повседневной носки. Посадка — базовая. Дата обновления: ${today}. Артикул: ${article ?? '—'}.`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Загружаем необходимые поля всех товаров
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select(`id, name, article, composition, 
               brand:brands!products_brand_id_fkey(name),
               category:categories!products_category_id_fkey(name),
               color_id`) // имя цвета достанем отдельно по необходимости
      .order('id');

    if (error) {
      console.error('Ошибка загрузки товаров для обогащения:', error);
      return res.status(500).json({ error: 'Ошибка загрузки товаров' });
    }

    const ids = (products || []).map((p: any) => p.id);
    if (ids.length === 0) {
      return res.status(200).json({ success: true, updated: 0 });
    }

    // Загружаем карту названий цветов (если есть color_id, мог быть code/id)
    const colorIdsRaw = (products || []).map((p: any) => p.color_id).filter(Boolean);
    const numericColorIds = colorIdsRaw.filter((cid: any) => !isNaN(Number(cid))).map((cid: any) => Number(cid));
          const colorIds = colorIdsRaw.map((cid: any) => Number(cid)).filter((cid: any) => !isNaN(cid));
    const colorNameByKey: Record<string, string> = {};

    if (numericColorIds.length > 0) {
      const { data: colorsById } = await supabaseAdmin.from('colors').select('id,name').in('id', Array.from(new Set(numericColorIds)));
      (colorsById || []).forEach((c: any) => { colorNameByKey[String(c.id)] = c.name; });
    }
          if (colorIds.length > 0) {
        const { data: colorsById } = await supabaseAdmin.from('colors').select('id,name').in('id', Array.from(new Set(colorIds)));
        (colorsById || []).forEach((c: any) => { colorNameByKey[String(c.id)] = c.name; });
      }

    let updated = 0;
    const errors: Array<{ id: number; message: string }> = [];
    // Обновляем построчно (разные тексты для каждой записи)
    for (const p of products as any[]) {
      const colorName = p.color_id ? colorNameByKey[String(p.color_id)] : undefined;
      const care_instructions = buildCareInstructions(p.name, p.article);
      const features = buildFeatures(p.name, p.category?.name, colorName, p.article);
      const technical_specs = buildTechSpecs(p.composition, p.article);

      // Обновляем только нужные поля
      const { error: updError } = await supabaseAdmin
        .from('products')
        .update({
          care_instructions, // как простой text
          features: [features],
          technical_specs: [technical_specs],
          updated_at: new Date().toISOString()
        })
        .eq('id', p.id);

      if (!updError) {
        updated += 1;
      } else {
        errors.push({ id: p.id, message: updError.message });
      }
    }

    return res.status(200).json({ success: true, updated, errorsCount: errors.length, errors });
  } catch (e) {
    console.error('Ошибка массового обогащения товаров:', e);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}


