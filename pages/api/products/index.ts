import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { cleanProductsText } from '../../../lib/textCleaner';
import { normalizeColorName } from '../../../lib/colorNormalizer';
import { 
  createListResponse, 
  createErrorResponse, 
  parsePaginationParams 
} from '../../../lib/api/standardResponse';
import { handleDatabaseError, handleGenericError } from '../../../lib/api/errorHandling';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // 🚀 КЭШИРОВАНИЕ
      // УБИРАЮ КЭШИРОВАНИЕ ДЛЯ ДИНАМИЧЕСКИХ ДАННЫХ
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

      const { category, brand, search, fields } = req.query;
      const { page, limit, offset } = parsePaginationParams(req.query);
      
      // 📊 СЕЛЕКТИВНЫЕ ПОЛЯ для оптимизации
      const selectFields = fields ? 
        (fields as string).split(',').join(',') : 
        `
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

      // 🔍 ПОСТРОЕНИЕ ЗАПРОСА
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

      // 🔍 ПОИСК по товарам (включая поиск по цвету и цене)
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = decodeURIComponent(search.trim());
        
        // Ищем подходящие цвета
        const { data: matchingColors } = await supabaseAdmin
          .from('colors')
          .select('id')
          .ilike('name', `%${searchTerm}%`);
        
        const colorIds = (matchingColors || []).map((c: any) => c.id);
        
        // Проверяем, является ли поисковый термин числом (цена) или диапазоном цен
        const isNumeric = /^\d+$/.test(searchTerm);
        const isPriceRange = /^\d+-\d+$/.test(searchTerm);
        
        let priceValue = null;
        let priceMin = null;
        let priceMax = null;
        
        if (isNumeric) {
          priceValue = parseInt(searchTerm);
        } else if (isPriceRange) {
          const [min, max] = searchTerm.split('-').map(p => parseInt(p));
          priceMin = min;
          priceMax = max;
        }
        
        // Формируем условие поиска: по названию, артикулу, цвету или цене
        let searchConditions = [
          `name.ilike.%${searchTerm}%`,
          `article.ilike.%${searchTerm}%`
        ];
        
        if (colorIds.length > 0) {
          searchConditions.push(`color_id.in.(${colorIds.join(',')})`);
        }
        
        if (priceValue !== null) {
          // Поиск по точной цене или близкой к ней (±10%)
          const searchPriceMin = Math.floor(priceValue * 0.9);
          const searchPriceMax = Math.ceil(priceValue * 1.1);
          searchConditions.push(`and(price.gte.${searchPriceMin},price.lte.${searchPriceMax})`);
        } else if (priceMin !== null && priceMax !== null) {
          // Поиск по диапазону цен (например: "1000-2000")
          searchConditions.push(`and(price.gte.${priceMin},price.lte.${priceMax})`);
        }
        
        query = query.or(searchConditions.join(','));
      }

      // Получаем общее количество
      const { count: totalCount, error: countError } = await query;
      if (countError) {
        return handleDatabaseError(countError, res, 'products count');
      }

      // Получаем данные с пагинацией
      const { data: products, error: productsError } = await query
        .range(offset, offset + limit - 1);

      if (productsError) {
        return handleDatabaseError(productsError, res, 'products fetch');
      }

      // 🚀 ПАКЕТНАЯ ЗАГРУЗКА ИЗОБРАЖЕНИЙ одним запросом
      const productIds = (products || []).map((p: any) => p.id);
      let imagesByProductId: Record<number, string[]> = {};
      
      if (productIds.length > 0) {
        const { data: allImages, error: imagesError } = await supabaseAdmin
          .from('product_images')
          .select('product_id, image_url')
          .in('product_id', productIds)
          .order('created_at', { ascending: true });

        if (imagesError) {
          console.error('Ошибка загрузки изображений:', imagesError);
        } else {
          imagesByProductId = (allImages || []).reduce((acc: Record<number, string[]>, row: any) => {
            const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';
            const path = row.image_url.startsWith('images/') ? row.image_url : `images/${row.image_url}`;
            const fullUrl = row.image_url.startsWith('http')
              ? row.image_url
              : `${base}/storage/v1/object/public/${path}`;
            
            if (!acc[row.product_id]) acc[row.product_id] = [];
            acc[row.product_id].push(fullUrl);
            return acc;
          }, {});
        }
      }

      // 🎨 ПАКЕТНАЯ ЗАГРУЗКА ЦВЕТОВ одним запросом
      const colorIds = Array.from(new Set((products || []).map((p: any) => p.color_id).filter(Boolean)));
      let colorNameByKey: Record<string, string> = {};
      
      if (colorIds.length > 0) {
        const { data: colorsData, error: colorsError } = await supabaseAdmin
          .from('colors')
          .select('id, name')
          .in('id', colorIds);

        if (colorsError) {
          console.error('Ошибка загрузки цветов:', colorsError);
        } else {
          (colorsData || []).forEach((c: any) => {
            colorNameByKey[c.id.toString()] = normalizeColorName(c.name);
          });
        }
      }

      // 📦 ОБРАБОТКА ДАННЫХ
      const processedProducts = (products || []).map((product: any) => {
        const images = imagesByProductId[product.id] || [];
        const colorKey = product.color_id ? String(product.color_id) : '';
        const colorName = colorKey ? (colorNameByKey[colorKey] || null) : null;
        
        // Нормализация text[] → строки
        const normalize = (v: any) => Array.isArray(v) ? v.join(' ') : v;
        
        const processedProduct = {
          ...product,
          images,
          brandName: product.brand?.name || null,
          categoryName: product.category?.name || null,
          colorName,
          care_instructions: normalize(product.care_instructions),
          features: normalize(product.features),
          technical_specs: normalize(product.technical_specs),
          materials_info: normalize(product.materials_info),
        };
        
        // Очистка текстовых полей
        return cleanProductsText([processedProduct])[0];
      });

      // 📊 СТАНДАРТИЗИРОВАННЫЙ ОТВЕТ
      const response = createListResponse(
        processedProducts,
        totalCount || 0,
        page,
        limit,
        'products',
        {
          search: search || null,
          category_filter: category || null,
          brand_filter: brand || null,
          total_images: Object.values(imagesByProductId).flat().length,
          unique_colors: Object.keys(colorNameByKey).length,
          fields_requested: fields || 'default'
        }
      );

      return res.status(200).json(response);

    } catch (error) {
      return handleGenericError(error, res, 'products API');
    }
  }

  // Неподдерживаемый метод
  const errorResponse = createErrorResponse('Метод не поддерживается');
  return res.status(405).json(errorResponse);
}