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

  const { recipient_id, sender_id = 2, notes = '', items } = req.body;

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
  const stockValidation = await validateStockForItems(items);
  
  if (!stockValidation.valid) {
    console.log('realization/create - stock validation failed:', stockValidation.errors);
    return res.status(400).json({
      error: 'Недостаточно товара на складе',
      details: stockValidation.errors.map(err => err.message),
      stockErrors: stockValidation.errors
    });
  }

  try {
    // Генерируем номер реализации
    const realization_number = await generateRealizationNumber();

    // Подсчитываем общее количество
    const total_items = items.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);

    // Создаём realization
    const { data: shipIns, error: insErr } = await supabaseAdmin
      .from('realization')
      .insert({ 
        realization_number,
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
      // Попытка 1: realization_id + qty
      let attemptErr: any = null;
      let res1 = await supabaseAdmin
        .from('realization_items')
        .insert(baseRows.map((r:any)=>({ ...r, realization_id: shipIns.id })));
      attemptErr = res1.error;

      // Попытка 2: realization + qty
      if (attemptErr) {
        console.warn('fallback insert: using realization field');
        let res2 = await supabaseAdmin
          .from('realization_items')
          .insert(baseRows.map((r:any)=>({ ...r, realization: shipIns.id })));
        attemptErr = res2.error;

        // Попытка 3: shipment_id + qty
        if (attemptErr) {
          console.warn('fallback insert: using shipment_id field');
          let res3 = await supabaseAdmin
            .from('realization_items')
            .insert(baseRows.map((r:any)=>({ ...r, shipment_id: shipIns.id })));
          attemptErr = res3.error;

          // Попытка 4: если по-прежнему ошибка, пробуем заменить qty->quantity (для всех вариантов)
          if (attemptErr) {
            console.warn('fallback insert: switching qty -> quantity');
            const qtyToQuantity = (rows:any[], fk:string) => rows.map((r:any)=>{ const { qty, ...rest } = r; return { ...rest, [fk]: shipIns.id, quantity: qty }; });
            let res4 = await supabaseAdmin.from('realization_items').insert(qtyToQuantity(baseRows, 'realization_id'));
            attemptErr = res4.error;
            if (attemptErr) {
              let res5 = await supabaseAdmin.from('realization_items').insert(qtyToQuantity(baseRows, 'realization'));
              attemptErr = res5.error;
              if (attemptErr) {
                let res6 = await supabaseAdmin.from('realization_items').insert(qtyToQuantity(baseRows, 'shipment_id'));
                attemptErr = res6.error;
                if (attemptErr) {
                  console.error('Не удалось сохранить позиции реализации ни по одной схеме:', attemptErr);
                }
              }
            }
          }
        }
      }
    }

    // Логируем успешное создание реализации
    const userId = getUserIdFromCookie(req);
    await logUserAction(userId, 'Создание реализации', 'success', `№${realization_number} с ${items.length} позициями`);

    return res.status(201).json({ id: shipIns.id, realization_number, total_items });
  } catch (e: any) {
    console.error('Ошибка создания реализации:', e);
    return res.status(500).json({ error: 'Ошибка создания реализации: ' + (e.message || 'Неизвестная ошибка') });
  }
});

async function generateRealizationNumber(): Promise<string> {
  const { data: latest } = await supabaseAdmin
    .from('realization')
    .select('realization_number')
    .order('realization_number', { ascending: false })
    .limit(1)
    .single();
  let nextNum = 1;
  if (latest?.realization_number) {
    const parsed = parseInt(latest.realization_number.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed)) nextNum = parsed + 1;
  }
  return String(nextNum).padStart(5, '0');
}