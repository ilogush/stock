
import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { 
  parsePaginationParams 
} from '../../../lib/api/standardResponse';
import { handleDatabaseError, handleGenericError } from '../../../lib/api/errorHandling';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Кэширование для статических данных
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');

      const { category, brand, search, fields } = req.query;
      const { page, limit, offset } = parsePaginationParams(req.query);
      
      // Оптимизированные поля
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

      // Базовый запрос
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

      // 🚀 ОПТИМИЗИРОВАННЫЙ ПОИСК - один запрос вместо множественных
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = search.trim();
        
        // Сначала ищем товары по артикулу и названию
        const { data: directProducts } = await supabaseAdmin
          .from('products')
          .select('id')
          .or(`article.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
        
        // Ищем товары по бренду
        const { data: brandProducts } = await supabaseAdmin
          .from('products')
          .select('id, brand:brands!products_brand_id_fkey(name)')
          .ilike('brand.name', `%${searchTerm}%`);
        
        // Ищем товары по цвету
        const { data: colorProducts } = await supabaseAdmin
          .from('products')
          .select('id, color:colors!products_color_id_fkey(name)')
          .ilike('color.name', `%${searchTerm}%`);
        
        // Объединяем все найденные ID
        const allProductIds = new Set<number>();
        if (directProducts) directProducts.forEach((p: any) => allProductIds.add(p.id));
        if (brandProducts) brandProducts.forEach((p: any) => allProductIds.add(p.id));
        if (colorProducts) colorProducts.forEach((p: any) => allProductIds.add(p.id));
        
        // Применяем фильтр по найденным ID
        if (allProductIds.size > 0) {
          query = query.in('id', Array.from(allProductIds));
        } else {
          // Если ничего не найдено, возвращаем пустой результат
          return res.status(200).json({
            products: [],
            pagination: { total: 0, page, limit, totalPages: 0 }
          });
        }
      }

      // Применяем пагинацию
      query = query.range(offset, offset + limit - 1);

      const { data: products, error, count } = await query;

      if (error) {
        return handleDatabaseError(error, res);
      }

      return res.status(200).json({
        products: products || [],
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        }
      });

    } catch (error) {
      return handleGenericError(error, res);
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
};
