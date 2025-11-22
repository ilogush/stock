import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { validateStockForItems } from '../../../lib/stockValidator';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';
import { normalizeColorId, extractSizeNumber, normalizeSizeCode } from '../../../lib/utils/normalize';
import { CHILDREN_SIZES, CHILDREN_CATEGORY_ID } from '../../../lib/constants';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

const handler = withPermissions(
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

  // Загружаем все товары для валидации и получения артикулов
  const productIds = items.map((item: any) => item.product_id);
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, article, category_id')
    .in('id', productIds);

  if (productsError) {
    log.error('Ошибка при получении товаров', productsError as Error, {
      endpoint: '/api/realization/create'
    });
    return res.status(500).json({ error: 'Ошибка при получении товаров' });
  }

  // Создаем мапу product_id -> product для быстрого доступа
  const productMap = new Map(products?.map((p: any) => [p.id, p]) || []);

  // Валидация детских размеров для детских товаров
  for (const item of items) {
    const product = productMap.get(item.product_id) as { category_id?: number; article?: string } | undefined;
    
    if (product && product.category_id === CHILDREN_CATEGORY_ID) {
      const sizeNumber = extractSizeNumber(item.size_code);
      if (!CHILDREN_SIZES.includes(sizeNumber as any)) {
        return res.status(400).json({ 
          error: `Детские товары должны иметь размеры от 92 до 164, получен: ${item.size_code}` 
        });
      }
    }
  }

  // Проверяем остатки на складе (единственная проверка)
  // Нормализуем размеры для валидации с учетом артикулов
  const normalizedItems = items.map((item: any) => {
    const product = productMap.get(item.product_id) as { article?: string } | undefined;
    return {
      ...item,
      size_code: normalizeSizeCode(item.size_code, product?.article), // Нормализуем размер с учетом артикула
      color_id: normalizeColorId(item.color_id) // Нормализуем цвет
    };
  });
  
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
      log.error('Ошибка создания записи realization', insErr as Error, {
        endpoint: '/api/realization/create'
      });
      const userId = getUserIdFromCookie(req);
      if (userId) {
        await logUserAction(userId, 'Создание реализации', 'error', `Ошибка: ${insErr.message}`);
      }
      throw insErr;
    }

    // Сохраняем позиции в realization_items
    const baseRows = items.map((it: any) => {
      const product = productMap.get(it.product_id) as { article?: string } | undefined;
      return {
        product_id: parseInt(it.product_id),
        size_code: normalizeSizeCode(it.size_code, product?.article), // Нормализуем размер с учетом артикула
        color_id: normalizeColorId(it.color_id), // Нормализуем цвет
        qty: parseInt(it.qty) || 0,
        realization_id: shipIns.id // Устанавливаем внешний ключ
      };
    });

    if (baseRows.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('realization_items')
        .insert(baseRows);

      if (itemsError) {
        log.error('Ошибка создания позиций реализации', itemsError as Error, {
          endpoint: '/api/realization/create',
          metadata: { realizationId: shipIns.id }
        });
        throw itemsError;
      }
    }

    // Логируем успешное создание реализации
    const userId = getUserIdFromCookie(req);
    if (userId) {
      await logUserAction(userId, 'Создание реализации', 'success', `ID:${shipIns.id} с ${items.length} позициями`);
    }

    return res.status(201).json({ id: shipIns.id, total_items });
  } catch (e: any) {
    log.error('Ошибка создания реализации', e as Error, {
      endpoint: '/api/realization/create'
    });
    return res.status(500).json({ error: 'Ошибка создания реализации: ' + (e.message || 'Неизвестная ошибка') });
  }
});

// Применяем rate limiting для модифицирующих операций
export default withRateLimit(RateLimitConfigs.WRITE)(handler as any) as typeof handler;
