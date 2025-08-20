import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { 
  createListResponse, 
  createErrorResponse, 
  parsePaginationParams 
} from '../../../lib/api/standardResponse';
import { handleDatabaseError, handleGenericError } from '../../../lib/api/errorHandling';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { search = '' } = req.query;
      const { page, limit, offset } = parsePaginationParams(req.query);

      // 🚀 ОПТИМИЗАЦИЯ: Загружаем цвета
      const { data: colors, error: colorsError } = await supabaseAdmin
        .from('colors')
        .select('id, name, hex_code, created_at')
        .order('name', { ascending: true });

      if (colorsError) {
        return handleDatabaseError(colorsError, res, 'colors fetch');
      }

      // 🚀 ОПТИМИЗАЦИЯ: Пакетный подсчет товаров для всех цветов одним запросом
      const colorIds = (colors || []).map((c: any) => c.id);
      let productCounts: Record<number, number> = {};
      
      if (colorIds.length > 0) {
        const { data: productCountData } = await supabaseAdmin
          .from('products')
          .select('color_id')
          .in('color_id', colorIds);
        
        // Считаем количество товаров для каждого цвета
        productCounts = (productCountData || []).reduce((acc: Record<number, number>, product: any) => {
          acc[product.color_id] = (acc[product.color_id] || 0) + 1;
          return acc;
        }, {});
      }

      // Функция для генерации HEX-кода на основе названия цвета
      const getHexFromName = (name: string): string => {
        const colorMap: { [key: string]: string } = {
          'Белый': '#FFFFFF',
          'Черный': '#000000',
          'Красный': '#FF0000',
          'Зеленый': '#00FF00',
          'Синий': '#0000FF',
          'Желтый': '#FFFF00',
          'Розовый': '#FFC0CB',
          'Оранжевый': '#FFA500',
          'Фиолетовый': '#800080',
          'Коричневый': '#A52A2A',
          'Серый': '#808080',
          'Бежевый': '#F5DEB3',
          'Бирюзовый': '#40E0D0',
          'Изумрудный': '#50C878',
          'Светло-голубой': '#87CEEB',
          'Серый меланж': '#C0C0C0',
          'Ассорти': '#FFD700',
          'Терракотовый': '#E2725B',
          'спрут': '#8B4513',
          'лоза': '#228B22',
          'Зайчики на розовом': '#FFB6C1',
          'Нежно-розовый': '#FFE4E1',
          'Ярко-розовый': '#FF69B4',
          'Пастельно-голубой': '#E0F6FF',
          'Малиновый': '#DC143C',
          'Хаки': '#78866B'
        };
        
        // Проверяем точное совпадение
        if (colorMap[name]) {
          return colorMap[name];
        }
        
        // Проверяем частичные совпадения
        const normalizedName = name.toLowerCase();
        
        // Специальные правила для розовых цветов
        if (normalizedName.includes('розов') || normalizedName.includes('pink')) {
          if (normalizedName.includes('ярко') || normalizedName.includes('bright')) {
            return '#FF69B4'; // Ярко-розовый
          } else if (normalizedName.includes('нежно') || normalizedName.includes('soft')) {
            return '#FFE4E1'; // Нежно-розовый
          } else if (normalizedName.includes('светло') || normalizedName.includes('light')) {
            return '#FFB6C1'; // Светло-розовый
          } else if (normalizedName.includes('темно') || normalizedName.includes('dark')) {
            return '#FF1493'; // Темно-розовый
          } else {
            return '#FFC0CB'; // Обычный розовый
          }
        }
        
        // Специальные правила для нежных цветов
        if (normalizedName.includes('нежно') || normalizedName.includes('soft')) {
          if (normalizedName.includes('розов') || normalizedName.includes('pink')) {
            return '#FFE4E1'; // Нежно-розовый
          }
        }
        
        // Специальные правила для ярких цветов
        if (normalizedName.includes('ярко') || normalizedName.includes('bright')) {
          if (normalizedName.includes('розов') || normalizedName.includes('pink')) {
            return '#FF69B4'; // Ярко-розовый
          }
        }
        
        // Специальные правила для светлых цветов
        if (normalizedName.includes('светло') || normalizedName.includes('light')) {
          if (normalizedName.includes('розов') || normalizedName.includes('pink')) {
            return '#FFB6C1'; // Светло-розовый
          } else if (normalizedName.includes('син') || normalizedName.includes('голуб') || normalizedName.includes('blue')) {
            return '#87CEEB'; // Светло-голубой
          } else if (normalizedName.includes('зелен') || normalizedName.includes('green')) {
            return '#90EE90'; // Светло-зеленый
          } else if (normalizedName.includes('красн') || normalizedName.includes('red')) {
            return '#FF6B6B'; // Светло-красный
          }
        }
        
        // Специальные правила для синих цветов
        if (normalizedName.includes('син') || normalizedName.includes('голуб') || normalizedName.includes('blue')) {
          if (normalizedName.includes('светло') || normalizedName.includes('light')) {
            return '#87CEEB'; // Светло-голубой
          } else if (normalizedName.includes('темно') || normalizedName.includes('dark')) {
            return '#000080'; // Темно-синий
          } else {
            return '#0000FF'; // Обычный синий
          }
        }
        
        // Специальные правила для зеленых цветов
        if (normalizedName.includes('зелен') || normalizedName.includes('green')) {
          if (normalizedName.includes('светло') || normalizedName.includes('light')) {
            return '#90EE90'; // Светло-зеленый
          } else if (normalizedName.includes('темно') || normalizedName.includes('dark')) {
            return '#006400'; // Темно-зеленый
          } else {
            return '#00FF00'; // Обычный зеленый
          }
        }
        
        // Специальные правила для красных цветов
        if (normalizedName.includes('красн') || normalizedName.includes('red')) {
          if (normalizedName.includes('светло') || normalizedName.includes('light')) {
            return '#FF6B6B'; // Светло-красный
          } else if (normalizedName.includes('темно') || normalizedName.includes('dark')) {
            return '#8B0000'; // Темно-красный
          } else {
            return '#FF0000'; // Обычный красный
          }
        }
        
        // Проверяем частичные совпадения в словаре
        for (const [colorName, hexCode] of Object.entries(colorMap)) {
          if (normalizedName.includes(colorName.toLowerCase()) || 
              colorName.toLowerCase().includes(normalizedName)) {
            return hexCode;
          }
        }
        
        // Если ничего не найдено, генерируем цвет на основе названия
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
          hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue = Math.abs(hash) % 360;
        const saturation = 70 + (Math.abs(hash) % 30); // 70-100%
        const lightness = 45 + (Math.abs(hash) % 20); // 45-65%
        
        // Конвертируем HSL в HEX
        const h = hue / 360;
        const s = saturation / 100;
        const l = lightness / 100;
        
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        
        let r, g, b;
        if (s === 0) {
          r = g = b = l;
        } else {
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }
        
        const toHex = (c: number) => {
          const hex = Math.round(c * 255).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      };

      // Преобразуем данные и удаляем дубликаты
      const processedColors = (colors || [])
        .map((color: any) => ({
          id: color.id,
          name: color.name,
          hex_code: getHexFromName(color.name),
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

      // 📊 СТАНДАРТИЗИРОВАННЫЙ ОТВЕТ
      const response = createListResponse(
        paginatedColors,
        total,
        page,
        limit,
        'colors',
        {
          search: search || null,
          uniqueColors: processedColors.length,
          totalProducts: processedColors.reduce((sum: number, c: any) => sum + (c.product_count || 0), 0)
        }
      );

      return res.status(200).json(response);

    } catch (error) {
      return handleGenericError(error, res, 'colors API');
    }
  }

  // Неподдерживаемый метод
  const errorResponse = createErrorResponse('Метод не поддерживается');
  return res.status(405).json(errorResponse);
}