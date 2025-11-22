import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

/**
 * API endpoint для получения отчета по поступлениям
 * Поддерживает фильтрацию по датам и пользователю
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { startDate, endDate, userId, articleSearch } = req.query;

    // Базовый запрос для получения поступлений (без JOIN)
    let receiptQuery = supabaseAdmin
      .from('receipts')
      .select(`
        id,
        created_at,
        transferrer_id
      `)
      .order('created_at', { ascending: false });

    // Применяем фильтр по датам, если указаны
    if (startDate && typeof startDate === 'string') {
      receiptQuery = receiptQuery.gte('created_at', startDate);
    }
    if (endDate && typeof endDate === 'string') {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      receiptQuery = receiptQuery.lte('created_at', endDateTime.toISOString());
    }

    // Применяем фильтр по пользователю, если указан
    if (userId && typeof userId === 'string') {
      const userIdNum = parseInt(userId);
      if (!isNaN(userIdNum)) {
        receiptQuery = receiptQuery.eq('transferrer_id', userIdNum);
      }
    }

    const { data: receipts, error: receiptsError } = await receiptQuery;

    if (receiptsError) {
      log.error('Ошибка при получении поступлений', receiptsError as Error, {
        endpoint: '/api/reports/receipts'
      });
      return res.status(500).json({ error: 'Ошибка при получении данных о поступлениях' });
    }

    if (!receipts || receipts.length === 0) {
      return res.status(200).json({
        data: {
          totalReceipts: 0,
          totalItems: 0,
          totalQuantity: 0,
          receipts: []
        }
      });
    }

    const receiptIds = receipts.map((r: any) => r.id);

    // Получаем пользователей
    const userIds = new Set<number>();
    receipts.forEach((r: any) => {
      if (r.transferrer_id) userIds.add(r.transferrer_id);
    });
    
    const userMap: Record<number, { first_name?: string; last_name?: string; email: string }> = {};
    if (userIds.size > 0) {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', Array.from(userIds));

      if (!usersError && users) {
        users.forEach((u: any) => {
          userMap[u.id] = { first_name: u.first_name, last_name: u.last_name, email: u.email };
        });
      }
    }

    // Получаем товары из поступлений по receipt_id
    const { data: receiptItems, error: itemsError } = await supabaseAdmin
      .from('receipt_items')
      .select(`
        id,
        receipt_id,
        product_id,
        size_code,
        color_id,
        qty,
        created_at
      `)
      .in('receipt_id', receiptIds);
    
      if (itemsError) {
        log.error('Ошибка при получении товаров по receipt_id', itemsError as Error, {
          endpoint: '/api/reports/receipts'
        });
        return res.status(500).json({ error: 'Ошибка при получении товаров поступлений' });
      }

    // Если указан поиск по артикулу, фильтруем товары
    let filteredReceiptItems = receiptItems || [];
    if (articleSearch && typeof articleSearch === 'string' && articleSearch.trim()) {
      const searchTerm = articleSearch.trim().toLowerCase();
      // Получаем product_id для товаров, артикулы которых содержат поисковый запрос
      const { data: productsByArticle } = await supabaseAdmin
        .from('products')
        .select('id')
        .ilike('article', `%${searchTerm}%`);
      
      if (productsByArticle && productsByArticle.length > 0) {
        const productIds = productsByArticle.map((p: any) => p.id);
        filteredReceiptItems = (receiptItems || []).filter(
          (item: any) => productIds.includes(item.product_id)
        );
      } else {
        filteredReceiptItems = [];
      }
    }

    // Получаем товары отдельно
    const productIds = new Set<number>();
    const colorIds = new Set<number | null>();
    
    filteredReceiptItems.forEach((item: any) => {
      if (item.product_id) productIds.add(item.product_id);
      if (item.color_id) colorIds.add(item.color_id);
    });

    const productMap: Record<number, { id: number; name: string; article: string; brand_id: number | null; category_id: number | null }> = {};
    if (productIds.size > 0) {
      const productIdsArray = Array.from(productIds);
      // Загружаем порциями по 100 товаров
      for (let i = 0; i < productIdsArray.length; i += 100) {
        const batch = productIdsArray.slice(i, i + 100);
        const { data: products, error: productsError } = await supabaseAdmin
          .from('products')
          .select('id, name, article, brand_id, category_id')
          .in('id', batch);

        if (productsError) {
          log.error('Ошибка при получении товаров', productsError as Error, {
            endpoint: '/api/reports/receipts'
          });
        } else if (products) {
          products.forEach((p: any) => {
            productMap[p.id] = p;
          });
        }
      }
    }

    // Получаем бренды
    const brandIds = new Set<number>();
    Object.values(productMap).forEach(p => {
      if (p.brand_id) brandIds.add(p.brand_id);
    });
    const brandMap: Record<number, string> = {};
    if (brandIds.size > 0) {
      const { data: brands, error: brandsError } = await supabaseAdmin
        .from('brands')
        .select('id, name')
        .in('id', Array.from(brandIds));

      if (!brandsError && brands) {
        brands.forEach((b: any) => {
          brandMap[b.id] = b.name;
        });
      }
    }

    // Получаем цвета
    const colorMap: Record<number, string> = {};
    if (colorIds.size > 0) {
      const colorIdsArray = Array.from(colorIds).filter(id => id !== null) as number[];
      if (colorIdsArray.length > 0) {
        const { data: colors, error: colorsError } = await supabaseAdmin
          .from('colors')
          .select('id, name')
          .in('id', colorIdsArray);

        if (!colorsError && colors) {
          colors.forEach((c: any) => {
            colorMap[c.id] = c.name;
          });
        }
      }
    }

    // Группируем данные по поступлениям
    const reportData = receipts.map((receipt: any) => {
      const items = filteredReceiptItems.filter(
        (item: any) => item.receipt_id === receipt.id
      );

      const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);

      const transferrer = receipt.transferrer_id ? userMap[receipt.transferrer_id] : null;
      const transferrerName = transferrer
        ? `${transferrer.first_name || ''} ${transferrer.last_name || ''}`.trim() || transferrer.email
        : 'Не указан';

      return {
        id: receipt.id,
        date: receipt.created_at,
        transferrer: transferrerName,
        itemsCount: items.length,
        totalQuantity,
        items: items.map((item: any) => {
          const product = productMap[item.product_id];
          return {
            product_id: item.product_id,
            product_name: product?.name || 'Неизвестный товар',
            article: product?.article || '',
            brand: product?.brand_id ? (brandMap[product.brand_id] || '') : '',
            category_id: product?.category_id || null,
            size_code: item.size_code,
            color: item.color_id ? (colorMap[item.color_id] || 'Не указан') : 'Не указан',
            color_id: item.color_id,
            qty: item.qty || 0
          };
        })
      };
    });

    const totalReceipts = reportData.length;
    const totalItems = filteredReceiptItems.length;
    const totalQuantity = reportData.reduce((sum: number, r: any) => sum + r.totalQuantity, 0);

    return res.status(200).json({
      data: {
        totalReceipts,
        totalItems,
        totalQuantity,
        receipts: reportData
      }
    });
  } catch (error: any) {
    log.error('Ошибка при формировании отчета по поступлениям', error as Error, {
      endpoint: '/api/reports/receipts'
    });
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// Применяем rate limiting для GET запросов
export default withRateLimit(RateLimitConfigs.READ)(handler);

