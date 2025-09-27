import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import {
  withApiMiddleware,
  apiConfigs,
  handleDatabaseError,
  sendErrorResponse
} from '../../../lib/unified';
import { getHexFromName } from '../../../lib/colorService';
import {
  createListResponse,
  createPagination,
  parsePaginationParams
} from '../../../lib/api/standardResponse';

/**
 * API роут для работы с цветами
 * Использует унифицированную систему обработки ошибок, валидации и кэширования
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { search = '' } = req.query;
    const { page, limit, offset } = parsePaginationParams(req.query);

    try {
      // Загружаем цвета из базы данных
      const { data: colors, error: colorsError } = await supabaseAdmin
        .from('colors')
        .select('id, name, hex_code, created_at')
        .order('name', { ascending: true });

      if (colorsError) {
        const apiError = handleDatabaseError(colorsError, 'colors fetch');
        return sendErrorResponse(res, apiError);
      }

      // Пакетный подсчет товаров для всех цветов
      const colorIds = (colors || []).map((c: any) => c.id);
      let productCounts: Record<number, number> = {};

      if (colorIds.length > 0) {
        const { data: productCountData } = await supabaseAdmin
          .from('products')
          .select('color_id')
          .in('color_id', colorIds);
        
        productCounts = (productCountData || []).reduce((acc: Record<number, number>, product: any) => {
          acc[product.color_id] = (acc[product.color_id] || 0) + 1;
          return acc;
        }, {});
      }

      // Обрабатываем данные цветов
      const processedColors = (colors || [])
        .map((color: any) => ({
          id: color.id,
          name: color.name,
          hex_code: color.hex_code || getHexFromName(color.name),
          created_at: color.created_at,
          product_count: productCounts[color.id] || 0
        }))
        .reduce((acc: any[], color: any) => {
          // Удаляем дубликаты по названию, оставляя с большим количеством товаров
          const existingColor = acc.find(c => c.name === color.name);
          if (!existingColor) {
            acc.push(color);
          } else if (color.product_count > existingColor.product_count) {
            const index = acc.findIndex(c => c.name === color.name);
            acc[index] = color;
          }
          return acc;
        }, []);

      // Фильтрация по поисковому запросу
      let filteredColors = processedColors;
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = decodeURIComponent(search.trim()).toLowerCase();
        filteredColors = processedColors.filter((color: any) => {
          return (
            (color.name && color.name.toLowerCase().includes(searchTerm)) ||
            (color.id && String(color.id).includes(searchTerm))
          );
        });
      }

      // Применяем пагинацию
      const total = filteredColors.length;
      const paginatedColors = filteredColors.slice(offset, offset + limit);
      const pagination = createPagination(total, page, limit);
      const response = createListResponse(paginatedColors, pagination.total, page, limit, 'colors');

      return res.status(200).json(response);

    } catch (error) {
      const apiError = handleDatabaseError(error, 'colors list');
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
  apiConfigs.static(), // Используем кэш для статических данных
  handler,
  {
    logging: true,
    performance: true
  }
);
