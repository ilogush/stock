import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { cleanProductsText } from '../../../lib/textCleaner';
import { 
  withApiMiddleware, 
  apiConfigs, 
  handleDatabaseError,
  sendErrorResponse
} from '../../../lib/unified';

/**
 * API роут для работы с товарами
 * Использует унифицированную систему обработки ошибок, валидации и кэширования
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { category, brand, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Генерируем ключ кэша
    const cacheKey = cacheKeys.products(pageNum, limitNum, category as string, brand as string, search as string);

    try {
      // Пытаемся получить данные из кэша
      const cachedData = cache.getOnly(cacheKey);
      if (cachedData) {
        return res.status(200).json(cachedData);
      }

      // Строим запрос к базе данных
      const selectFields = `
        id,
        name,
        article,
        price,
        old_price,
        category_id,
        brand_id,
        color_id,
        is_popular,
        is_visible,
        created_at,
        brand:brands!products_brand_id_fkey (id, name),
        category:categories!products_category_id_fkey (id, name)
      `;

      let query = supabaseAdmin
        .from('products')
        .select(selectFields, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Фильтрация по категории
      if (category) {
        query = query.eq('category_id', category);
      }

      // Фильтрация по бренду
      if (brand) {
        query = query.eq('brand_id', brand);
      }

      // Поиск по товарам
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = `*${search.trim()}*`;
        query = query.or(`name.ilike.${searchTerm},article.ilike.${searchTerm}`);
      }

      // Выполняем запрос с пагинацией
      const { data: products, error, count } = await query
        .range(offset, offset + limitNum - 1);

      if (error) {
        console.error('Database error in products API:', error);
        const apiError = handleDatabaseError(error, 'products fetch');
        return sendErrorResponse(res, apiError);
      }

      // Получаем цвета для всех товаров
      const colorIds = Array.from(new Set((products || []).map((p: any) => parseInt(p.color_id)).filter(Boolean)));
      let colorsMap: Record<number, any> = {};
      
      if (colorIds.length > 0) {
        const { data: colors } = await supabaseAdmin
          .from('colors')
          .select('id, name')
          .in('id', colorIds);
        
        colorsMap = (colors || []).reduce((acc: Record<number, any>, color: any) => {
          acc[color.id] = color;
          return acc;
        }, {});
      }

      // Обрабатываем данные товаров
      const processedProducts = (products || []).map((product: any) => ({
        id: product.id,
        name: cleanProductsText(product.name),
        article: product.article,
        price: product.price,
        old_price: product.old_price,
        category_id: product.category_id,
        brand_id: product.brand_id,
        color_id: product.color_id,
        is_popular: product.is_popular,
        is_visible: product.is_visible,
        created_at: product.created_at,
        brandName: product.brand?.name || null,
        categoryName: product.category?.name || null,
        colorName: colorsMap[product.color_id]?.name || null,
        images: [] // Пока пустой массив, можно добавить загрузку изображений
      }));

      const totalPages = Math.ceil((count || 0) / limitNum);

      const responseData = {
        data: {
          products: processedProducts,
          pagination: {
            total: count || 0,
            page: pageNum,
            limit: limitNum,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        }
      };

      // Сохраняем в кэш
      cache.set(cacheKey, responseData);

      return res.status(200).json(responseData);

    } catch (error) {
      const apiError = handleDatabaseError(error, 'products list');
      return sendErrorResponse(res, apiError);
    }
  }

  return res.status(405).json({
    error: 'Метод не поддерживается',
    allowedMethods: ['GET']
  });
}

// Экспортируем обработчик с унифицированным middleware
export default withApiMiddleware(
  apiConfigs.list('products'), // Используем кэш для товаров
  handler,
  {
    logging: true,
    performance: true
  }
);
