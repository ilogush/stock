import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { validateStockForItems } from '../../../lib/stockValidator';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';
import { normalizeColorId, extractSizeNumber, normalizeSizeCode } from '../../../lib/utils/normalize';
import { CHILDREN_SIZES, CHILDREN_CATEGORY_ID } from '../../../lib/constants';

export default withPermissions(
  RoleChecks.canCreateRealization,
  'Создание реализации доступно только кладовщикам'
)(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  const { recipient_id, notes = '', items } = req.body;
  
  // Получаем ID текущего пользователя из системы
  const sender_id = getUserIdFromCookie(req);

  if (!recipient_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'recipient_id и items обязательны' });
  }

  // Валидация детских размеров для детских товаров
  for (const item of items) {
    // Получаем информацию о товаре для проверки категории
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('category_id')
      .eq('id', item.product_id)
      .single();

    if (product?.category_id === CHILDREN_CATEGORY_ID) {
      const sizeNumber = extractSizeNumber(item.size_code);
      if (!CHILDREN_SIZES.includes(sizeNumber as any)) {
        return res.status(400).json({ 
          error: `Детские товары должны иметь размеры от 92 до 164, получен: ${item.size_code}` 
        });
      }
    }
  }

  // Проверяем остатки на складе (единственная проверка)
  // Нормализуем размеры для валидации
  const normalizedItems = items.map((item: any) => ({
    ...item,
    size_code: normalizeSizeCode(item.size_code), // Нормализуем размер
    color_id: normalizeColorId(item.color_id) // Нормализуем цвет
  }));
  
  const stockValidation = await validateStockForItems(normalizedItems);
  
  if (!stockValidation.valid) {
    return res.status(400).json({
      error: 'Недостаточно товара на складе',
      details: stockValidation.errors.map(err => err.message),
      stockErrors: stockValidation.errors
    });
  }

  try {
    // Подсчитываем общее количество
    const total_items = items.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);

    // Создаём realization
    const { data: shipIns, error: insErr } = await supabaseAdmin
      .from('realization')
      .insert({ 
        recipient_id: parseInt(recipient_id),
        sender_id,
        notes, 
        total_items 
      })
      .select()
      .single();

    if (insErr) {
      console.error('Ошибка создания записи realization:', insErr);
      const userId = getUserIdFromCookie(req);
      await logUserAction(userId, 'Создание реализации', 'error', `Ошибка: ${insErr.message}`);
      throw insErr;
    }

    // Сохраняем позиции в realization_items
    const baseRows = items.map((it: any) => ({
      product_id: parseInt(it.product_id),
      size_code: normalizeSizeCode(it.size_code), // Нормализуем размер
      color_id: normalizeColorId(it.color_id), // Нормализуем цвет
      qty: parseInt(it.qty) || 0,
      realization_id: shipIns.id // Устанавливаем внешний ключ
    }));

    if (baseRows.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('realization_items')
        .insert(baseRows);

      if (itemsError) {
        console.error('Ошибка создания позиций реализации:', itemsError);
        throw itemsError;
      }
    }

    // Логируем успешное создание реализации
    const userId = getUserIdFromCookie(req);
    await logUserAction(userId, 'Создание реализации', 'success', `ID:${shipIns.id} с ${items.length} позициями`);

    return res.status(201).json({ id: shipIns.id, total_items });
  } catch (e: any) {
    console.error('Ошибка создания реализации:', e);
    return res.status(500).json({ error: 'Ошибка создания реализации: ' + (e.message || 'Неизвестная ошибка') });
  }
});
