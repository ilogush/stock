import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {

      const { brand_id, category_id, category, page = '1', limit = '50', search } = req.query as Record<string,string>;

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit);
      const offsetNum = (pageNum - 1) * limitNum;

      const appliedCategory = category_id || category;

      // 0) Карта цветов для маппинга code → name
      // Загружаем цвета для получения русских названий
      const { data: colorsData, error: colorsErr } = await supabaseAdmin
        .from('colors')
        .select('id,name');
      if (colorsErr) {
        console.error('Ошибка при загрузке цветов:', colorsErr);
      }
      const codeToName = new Map((colorsData||[]).map((c:any)=>[c.id.toString(), c.name] as const));

      // Получаем товары, которые реально поступили через поступления
      let query = supabaseAdmin
        .from('receipt_items')
        .select(`
          qty,
          size_code,
          color_id,
          product_id,
          product:products(
            id,
            name,
            article,
            category_id,
            brand:brands(name)
          )
        `);

      if (brand_id) {
        query = query.eq('product.brand_id', brand_id);
      }

      // 🔍 ОБЪЕДИНЕННЫЙ ПОИСК по складу
      if (search && search.trim()) {
        const searchTerm = search.trim().toLowerCase();
        let allProductIds: number[] = [];
        
        // 1. Ищем товары по артикулу
        const { data: articleProducts } = await supabaseAdmin
          .from('products')
          .select('id')
          .ilike('article', `%${searchTerm}%`);
        
        if (articleProducts && articleProducts.length > 0) {
          allProductIds.push(...articleProducts.map((p: any) => p.id));
        }
        
        // 2. Ищем товары по названию
        const { data: nameProducts } = await supabaseAdmin
          .from('products')
          .select('id')
          .ilike('name', `%${searchTerm}%`);
        
        if (nameProducts && nameProducts.length > 0) {
          allProductIds.push(...nameProducts.map((p: any) => p.id));
        }
        
        // 3. Ищем товары по бренду
        const { data: brandProducts } = await supabaseAdmin
          .from('products')
          .select('id, brand:brands(name)')
          .ilike('brand.name', `%${searchTerm}%`);
        
        if (brandProducts && brandProducts.length > 0) {
          const filteredBrandProducts = brandProducts.filter((p: any) => 
            p.brand && p.brand.name && p.brand.name.toLowerCase().includes(searchTerm)
          );
          if (filteredBrandProducts.length > 0) {
            allProductIds.push(...filteredBrandProducts.map((p: any) => p.id));
          }
        }
        
        // Убираем дубликаты и применяем фильтр
        const uniqueProductIds = Array.from(new Set(allProductIds));
        if (uniqueProductIds.length > 0) {
          query = query.in('product_id', uniqueProductIds);
        } else {
          // Если ничего не найдено, возвращаем пустой результат
          query = query.eq('product_id', -1);
        }
      }

      let categoryProductIds: number[] = [];
      if (appliedCategory && appliedCategory !== 'all') {
        const { data: catProds, error: catErr } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('category_id', appliedCategory);
        if (catErr) {
          console.error('Ошибка фильтра категории:', catErr);
        } else {
          categoryProductIds = (catProds || []).map((p: any) => p.id);
          if (categoryProductIds.length === 0) {
            return res.status(200).json({ items: [], pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 } });
          }
          query = query.in('product_id', categoryProductIds);
        }
      }

      const { data: receiptItems, error } = await query
        .order('product_id, size_code, color_id');

      if (error) {
        console.error('Ошибка при получении данных поступлений:', error);
        return res.status(500).json({ error: 'Ошибка при получении данных поступлений' });
      }

      // Агрегируем по product_id, size_code, color_id
      const itemMap: Record<string, any> = {};
      (receiptItems || []).forEach((row: any) => {
        const productId = row.product?.id || row.product_id;
        const colorId = parseInt(row.color_id) || row.color_id; // Обеспечиваем числовой тип
        const key = `${productId}_${row.size_code}_${colorId}`;
        
        if (!itemMap[key]) {
          itemMap[key] = {
            id: productId,
            name: row.product?.name || null,
            article: row.product?.article || null,
            brandName: row.product?.brand?.name || null,
            size_code: row.size_code,
            color_id: colorId,
            qty: 0
          };
        }
        
        itemMap[key].qty += row.qty || 0;
      });

      // 2) Вычитаем реализации
      let realItems: any[] = [];
      if (Object.keys(itemMap).length > 0) {
        const { data: realData } = await supabaseAdmin
          .from('realization_items')
          .select('product_id, size_code, color_id, qty');
        realItems = realData || [];
      }
      (realItems||[]).forEach((r:any)=>{
        const colorId = parseInt(r.color_id) || r.color_id; // Обеспечиваем числовой тип
        const key = `${r.product_id}_${r.size_code}_${colorId}`;
        if (itemMap[key]) {
          itemMap[key].qty -= (r.qty||0);
        }
      });

      // НОВЫЙ ФОРМАТ: Группируем по товарам, размеры как столбцы, цвета как строки
      const productMap: Record<string, any> = {};
      const allSizes = new Set<string>();
      
      Object.values(itemMap).forEach((item: any) => {
        if ((item.qty||0) <= 0) return; // не показываем нулевые остатки
        
        const productId = item.id;
        allSizes.add(item.size_code);
        
        if (!productMap[productId]) {
          productMap[productId] = {
            id: productId,
            name: item.name,
            article: item.article,
            brandName: item.brandName,
            colors: {} as Record<string, any>,
            total: 0
          };
        }
        
        const entry = productMap[productId];
        const colorId = item.color_id;
        const colorName = codeToName.get(colorId.toString()) || colorId.toString();
        
        if (!entry.colors[colorId]) {
          entry.colors[colorId] = {
            colorId: colorId,
            colorName: colorName,
            sizes: {} as Record<string, number>,
            total: 0
          };
        }
        
        entry.colors[colorId].sizes[item.size_code] = (entry.colors[colorId].sizes[item.size_code] || 0) + (item.qty || 0);
        entry.colors[colorId].total += (item.qty || 0);
        entry.total += (item.qty || 0);
      });

      // Сортируем размеры
      const sortedSizes = Array.from(allSizes).sort((a, b) => {
        // Сортируем по размеру (XS, S, M, L, XL, XXL, XXXL)
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
        const aIndex = sizeOrder.indexOf(a.toUpperCase());
        const bIndex = sizeOrder.indexOf(b.toUpperCase());
        
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

      // Преобразуем в массив для отображения
      const items = Object.values(productMap).map((product: any) => ({
        ...product,
        colors: Object.values(product.colors).map((color: any) => ({
          ...color,
          sizes: sortedSizes.map(size => color.sizes[size] || 0)
        }))
      }));

      // Загружаем изображения для всех товаров с соответствующими артикулами
      const productIds = items.map((product: any) => product.id);
      let imagesByProductId: Record<number, string[]> = {};
      let productsMap: Record<string, any> = {};
      
      if (productIds.length > 0) {
        try {
          // Получаем все артикулы товаров в складе
          const articleCodes = items.map((product: any) => product.article);
          
          // Сначала получаем все товары с нужными артикулами
          const { data: allProducts, error: productsError } = await supabaseAdmin
            .from('products')
            .select('id, article, color_id')
            .in('article', articleCodes);
            
          if (productsError) {
            console.error('Ошибка загрузки товаров:', productsError);
          } else {
            // Создаем карту товаров по артикулу и цвету
            productsMap = (allProducts || []).reduce((acc: Record<string, any>, product: any) => {
              const key = `${product.article}_${product.color_id}`;
              acc[key] = product;
              return acc;
            }, {});
            
            // Получаем ID всех товаров с нужными артикулами
            const allProductIds = (allProducts || []).map((p: any) => p.id);
            
            // Загружаем изображения для всех этих товаров
            const { data: allImages, error: imagesError } = await supabaseAdmin
              .from('product_images')
              .select('product_id,image_url,created_at')
              .in('product_id', allProductIds)
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
        } catch (error) {
          console.error('Ошибка загрузки изображений:', error);
        }
      }

      // Загружаем изображения для всех товаров с учетом цветов
      const itemsWithImages = items.map((product: any) => {
        return {
          ...product,
          colors: product.colors.map((color: any) => {
            // Ищем товар с соответствующим артикулом и цветом
            const key = `${product.article}_${color.colorId}`;
            const matchingProduct = productsMap[key] as any;
            
            // Если нашли соответствующий товар, берем его изображения
            const productImages = matchingProduct ? (imagesByProductId[matchingProduct.id] || []) : [];
            
            return {
              ...color,
              images: productImages
            };
          })
        };
      });

      // Пагинация отключена для страницы склада
      // Если есть поисковый запрос по артикулу — возвращаем все записи товара
      const totalItems = itemsWithImages.length;
      const totalPages = 1;
      const paginatedItems = itemsWithImages;

      // УБИРАЮ КЭШИРОВАНИЕ ДЛЯ ДИНАМИЧЕСКИХ ДАННЫХ СКЛАДА
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      
      return res.status(200).json({
        items: paginatedItems,
        sizes: sortedSizes,
        pagination: { total: totalItems, page: 1, limit: totalItems, totalPages: totalPages }
      });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 