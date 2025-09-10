import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { validateStockForItems } from '../../../lib/stockValidator';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';

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

  // Валидация позиций реализации
  for (const item of items) {
    // Проверяем существование товара
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, name, category_id, color_id')
      .eq('id', item.product_id)
      .single();

    if (!product) {
      return res.status(400).json({ 
        error: `Товар с ID ${item.product_id} не найден` 
      });
    }

    // Проверяем цвет: если color_id передан, он должен быть валидным числом
    if (item.color_id !== null && item.color_id !== undefined && item.color_id !== 0) {
      const colorId = parseInt(item.color_id);
      if (isNaN(colorId) || colorId <= 0) {
        return res.status(400).json({ 
          error: `Некорректный ID цвета: ${item.color_id}` 
        });
      }
    }

    // Проверяем детские размеры для детских товаров
    if (product.category_id === 3) { // Детская категория
      const childrenSizes = ['92', '98', '104', '110', '116', '122'];
      // Извлекаем числовую часть из размера (например, "98 - 3 года" -> "98")
      const sizeNumber = item.size_code.split(' ')[0];
      if (!childrenSizes.includes(sizeNumber)) {
        return res.status(400).json({ 
          error: `Детские товары должны иметь размеры от 92 до 122, получен: ${item.size_code}` 
        });
      }
    }
  }

  // Проверяем остатки на складе
  console.log('realization/create - items to validate:', items);
  
  // Нормализуем размеры для валидации (обрезаем до числовой части)
  const normalizedItems = items.map((item: any) => ({
    ...item,
    size_code: item.size_code.split(' ')[0] // Приводим к тому же формату, что и в БД
  }));
  
  const stockValidation = await validateStockForItems(normalizedItems);
  
  if (!stockValidation.valid) {
    console.log('realization/create - stock validation failed:', stockValidation.errors);
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

    // Сохраняем позиции в realization_items с максимальной совместимостью по схеме
    const baseRows = items.map((it: any) => ({
      product_id: parseInt(it.product_id),
      size_code: it.size_code.split(' ')[0], // Сохраняем только числовую часть размера
      color_id: it.color_id,
      qty: parseInt(it.qty) || 0,
    }));

    if (baseRows.length > 0) {
      // Добавляем временную метку для связи товаров с реализацией
      const realizationTime = new Date().toISOString();
      const itemsWithTime = baseRows.map(r => ({ 
        ...r, 
        created_at: realizationTime 
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('realization_items')
        .insert(itemsWithTime);

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
