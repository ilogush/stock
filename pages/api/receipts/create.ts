import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks, AuthenticatedRequest, logAccess } from '../../../lib/api/roleAuth';
import { createItemResponse, createErrorResponse } from '../../../lib/api/standardResponse';
import { handleDatabaseError, handleGenericError } from '../../../lib/api/errorHandling';

export default withPermissions(
  RoleChecks.canCreateReceipts,
  'Создание поступлений доступно только кладовщикам'
)(async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    const errorResponse = createErrorResponse('Метод не поддерживается');
    return res.status(405).json(errorResponse);
  }

  try {
    // 🔒 Логируем доступ к созданию поступления
    logAccess(req, 'CREATE_RECEIPT');
    const { transferrer_id, notes, items, created_by } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Позиции поступления обязательны' });
    }

    if (!transferrer_id) {
      return res.status(400).json({ error: 'Поле "Принято от" обязательно' });
    }

    // Генерируем receipt_number
    const receipt_number = await generateReceiptNumber();

    // Создаём поступление
    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from('receipts')
      .insert({
        transferrer_id: transferrer_id || null,
        creator_id: created_by || null,
        notes: notes || '', // если нет такого поля — удалить эту строку
        receipt_number
      })
      .select()
      .single();

    if (receiptError) {
      console.error('Ошибка при создании поступления:', receiptError);
      const userId = getUserIdFromCookie(req);
      await logUserAction(userId, 'Создание поступления', 'error', `Ошибка: ${receiptError.message}`);
      return res.status(500).json({ error: receiptError.message || 'Ошибка при создании поступления' });
    }

    // Валидация позиций поступления
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
        if (!childrenSizes.includes(item.size_code)) {
          return res.status(400).json({ 
            error: `Детские товары должны иметь размеры от 92 до 122, получен: ${item.size_code}` 
          });
        }
      }
    }

    // Создаём позиции поступления (только существующие поля!)
    const receiptItems = items.map((item: any) => ({
      receipt_id: receipt.id,
      product_id: item.product_id,
      qty: item.quantity || item.qty || 0,
      size_code: item.size_code,
      color_id: item.color_id || null
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('receipt_items')
      .insert(receiptItems);

    if (itemsError) {
      console.error('Ошибка при создании позиций поступления:', itemsError);
      const userId = getUserIdFromCookie(req);
      await logUserAction(userId, 'Создание поступления', 'error', `Ошибка позиций: ${itemsError.message}`);
      await supabaseAdmin.from('receipts').delete().eq('id', receipt.id);
      return res.status(500).json({ error: itemsError.message || 'Ошибка при создании позиций поступления' });
    }

    // Остатки теперь рассчитываются на лету из receipt_items - realization_items
    // Нет необходимости обновлять отдельную таблицу stock

    // Логируем успешное создание поступления
    const userId = req.user!.id;
    await logUserAction(userId, 'Создание поступления', 'success', `№${receipt_number} с ${items.length} позициями`);

    // 📊 Стандартизированный ответ
    const response = createItemResponse(receipt, 'receipt', {
      created_by: req.user!.id,
      user_role: req.user!.role_id,
      items_count: items.length
    });

    return res.status(201).json(response);
  } catch (error: any) {
    return handleGenericError(error, res, 'receipt creation');
  }
});

async function generateReceiptNumber(): Promise<string> {
  const { data: latest } = await supabaseAdmin
    .from('receipts')
    .select('receipt_number')
    .order('receipt_number', { ascending: false })
    .limit(1)
    .single();
  let nextNum = 1;
  if (latest?.receipt_number) {
    const parsed = parseInt(latest.receipt_number.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed)) nextNum = parsed + 1;
  }
  return String(nextNum).padStart(5, '0');
}