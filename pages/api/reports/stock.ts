import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { normalizeColorId } from '../../../lib/utils/normalize';

/**
 * API endpoint для получения отчета по остаткам товаров на складе
 * Показывает текущие остатки (поступления - реализации)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { articleSearch } = req.query;
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;
    let receiptItems: any[] = [];

    // Получаем все поступления с пагинацией (без JOIN, чтобы избежать ошибок)
    while (hasMore) {
      const { data: batch, error: receiptError } = await supabaseAdmin
        .from('receipt_items')
        .select(`
          product_id,
          size_code,
          color_id,
          qty,
          created_at
        `)
        .range(from, from + pageSize - 1);

      if (receiptError) {
        console.error('Ошибка при получении данных поступлений:', receiptError);
        return res.status(500).json({ error: 'Ошибка при получении данных поступлений' });
      }

      if (batch && batch.length > 0) {
        receiptItems = receiptItems.concat(batch);
        from += pageSize;
        hasMore = batch.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    // Получаем все реализации с пагинацией
    from = 0;
    hasMore = true;
    let realizationItems: any[] = [];

    while (hasMore) {
      const { data: batch, error: realizationError } = await supabaseAdmin
        .from('realization_items')
        .select(`product_id, size_code, qty, color_id`)
        .range(from, from + pageSize - 1);

      if (realizationError) {
        console.error('Ошибка при получении данных реализаций:', realizationError);
        return res.status(500).json({ error: 'Ошибка при получении данных реализаций' });
      }

      if (batch && batch.length > 0) {
        realizationItems = realizationItems.concat(batch);
        from += pageSize;
        hasMore = batch.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    // Получаем уникальные ID товаров и цветов
    const productIds = new Set<number>();
    const colorIds = new Set<number | null>();
    
    (receiptItems || []).forEach((row: any) => {
      if (row.product_id) productIds.add(row.product_id);
      if (row.color_id) colorIds.add(normalizeColorId(row.color_id));
    });

    // Загружаем товары отдельно
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
          console.error('Ошибка при получении товаров:', productsError);
        } else if (products) {
          products.forEach((p: any) => {
            productMap[p.id] = p;
          });
        }
      }
    }

    // Загружаем бренды
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

    // Загружаем категории
    const categoryIds = new Set<number>();
    Object.values(productMap).forEach(p => {
      if (p.category_id) categoryIds.add(p.category_id);
    });
    const categoryMap: Record<number, string> = {};
    if (categoryIds.size > 0) {
      const { data: categories, error: categoriesError } = await supabaseAdmin
        .from('categories')
        .select('id, name')
        .in('id', Array.from(categoryIds));

      if (!categoriesError && categories) {
        categories.forEach((c: any) => {
          categoryMap[c.id] = c.name;
        });
      }
    }

    // Загружаем цвета
    const colorMap: Record<number | string, string> = {};
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

    // Агрегируем поступления
    const aggregated: Record<string, {
      product_id: number;
      name: string;
      article: string;
      brand: string;
      category: string;
      size_code: string;
      color_id: number | null;
      color_name: string;
      qty: number;
      last_receipt_date: string;
    }> = {};

    (receiptItems || []).forEach((row: any) => {
      if (!row.product_id || !row.size_code) {
        return;
      }

      const product = productMap[row.product_id];
      if (!product) {
        return; // Пропускаем товары, которых нет в базе
      }

      const colorId = normalizeColorId(row.color_id);
      const key = `${row.product_id}_${row.size_code}_${colorId || 'null'}`;

      if (!aggregated[key]) {
        aggregated[key] = {
          product_id: row.product_id,
          name: product.name || 'Неизвестный товар',
          article: product.article || '',
          brand: product.brand_id ? (brandMap[product.brand_id] || '') : '',
          category: product.category_id ? (categoryMap[product.category_id] || '') : '',
          size_code: row.size_code,
          color_id: colorId,
          color_name: colorId ? (colorMap[colorId] || 'Не указан') : 'Не указан',
          qty: 0,
          last_receipt_date: row.created_at
        };
      }

      aggregated[key].qty += (row.qty || 0);

      // Обновляем дату последнего поступления, если текущая запись новее
      if (new Date(row.created_at) > new Date(aggregated[key].last_receipt_date)) {
        aggregated[key].last_receipt_date = row.created_at;
      }
    });

    // Вычитаем реализации
    (realizationItems || []).forEach((r: any) => {
      const colorId = normalizeColorId(r.color_id);
      const key = `${r.product_id}_${r.size_code}_${colorId || 'null'}`;

      if (aggregated[key] !== undefined) {
        aggregated[key].qty = Math.max(0, aggregated[key].qty - (r.qty || 0));
      }
    });

    // Фильтруем только положительные остатки и преобразуем в массив
    let stockReport = Object.values(aggregated)
      .filter(item => item.qty > 0)
      .map(item => ({
        product_id: item.product_id,
        product_name: item.name,
        article: item.article,
        brand: item.brand,
        category: item.category,
        size_code: item.size_code,
        color_id: item.color_id,
        color_name: item.color_name,
        qty: item.qty,
        last_receipt_date: item.last_receipt_date
      }))
      .sort((a, b) => {
        // Сортируем по артикулу, затем по размеру
        if (a.article !== b.article) {
          return a.article.localeCompare(b.article);
        }
        return a.size_code.localeCompare(b.size_code);
      });

    // Если указан поиск по артикулу, фильтруем результаты
    if (articleSearch && typeof articleSearch === 'string' && articleSearch.trim()) {
      const searchTerm = articleSearch.trim().toLowerCase();
      stockReport = stockReport.filter(item => 
        item.article && item.article.toLowerCase().includes(searchTerm)
      );
    }

    // Подсчитываем статистику
    const totalProducts = new Set(stockReport.map(item => item.product_id)).size;
    const totalItems = stockReport.length;
    const totalQuantity = stockReport.reduce((sum, item) => sum + item.qty, 0);

    return res.status(200).json({
      data: {
        totalProducts,
        totalItems,
        totalQuantity,
        stock: stockReport
      }
    });
  } catch (error: any) {
    console.error('Ошибка при формировании отчета по остаткам:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

