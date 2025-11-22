import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks, AuthenticatedRequest } from '../../../lib/api/roleAuth';
import { withCsrfProtection } from '../../../lib/csrf';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const rawId = String(id);
      const isNumeric = /^\d+$/.test(rawId);
      let colorRow: any | null = null;

      const { data, error } = await supabaseAdmin
        .from('colors')
        .select('id, name, hex_code, created_at')
        .eq('id', parseInt(rawId, 10))
        .limit(1);
      if (error) throw error;
      colorRow = data && data.length ? data[0] : null;

      if (!colorRow) {
        return res.status(404).json({ error: 'Цвет не найден' });
      }

      const color = colorRow;

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

      // Получаем количество товаров для этого цвета
      // Количество товаров теперь считаем по products (stock не используется)
      const { count: productCount } = await supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('color_id', color.id);

        return res.status(200).json({ 
    ...color, 
    product_count: productCount || 0 
  });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'PUT') {
    try {
      // Проверяем права доступа для редактирования
      if (!RoleChecks.canEditColors(req.user?.role_id || 0)) {
        return res.status(403).json({ error: 'Редактирование цветов доступно только администраторам и менеджерам' });
      }

      const { name, hex_code } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Название цвета обязательно' });
      }

      // Валидация HEX-кода, если он передан
      if (hex_code !== undefined && hex_code !== null) {
        const hexRegex = /^#[0-9A-Fa-f]{6}$/;
        if (!hexRegex.test(hex_code)) {
          return res.status(400).json({ error: 'HEX-код должен быть в формате #RRGGBB' });
        }
      }

      // Проверяем, существует ли уже цвет с таким названием (исключая текущий)
      const { data: existingColorByName, error: errorByName } = await supabaseAdmin
        .from('colors')
        .select('name')
        .eq('name', name.trim())
        .neq('id', parseInt(id as string)) // Исключаем текущий цвет
        .limit(1)
        .order('id');

      if (errorByName) {
        log.error('Ошибка проверки названия цвета', errorByName as Error, {
          endpoint: '/api/colors/[id]'
        });
        return res.status(500).json({ error: 'Ошибка проверки названия цвета' });
      }

      if (existingColorByName && existingColorByName.length > 0) {
        return res.status(409).json({ error: 'Цвет с таким названием уже существует' });
      }

      const updateData: any = { name: name.trim() };
      if (hex_code !== undefined) {
        updateData.hex_code = hex_code;
      }

      const { data, error } = await supabaseAdmin
        .from('colors')
        .update(updateData)
        .eq('id', parseInt(id as string))
        .select()
        .limit(1)
        .order('id');

      if (error) {
        const userId = getUserIdFromCookie(req);
        log.error('Ошибка обновления цвета', error as Error, {
          endpoint: '/api/colors/[id]',
          userId: userId || undefined
        });
        if (userId) {
          await logUserAction(userId, 'Редактирование цвета', 'error', `Ошибка: ${error.message}`);
        }
        return res.status(500).json({ error: 'Ошибка обновления цвета' });
      }

      if (!data || data.length === 0) {
        const userId = getUserIdFromCookie(req);
        if (userId) {
          await logUserAction(userId, 'Редактирование цвета', 'error', 'Цвет не найден');
        }
        return res.status(404).json({ error: 'Цвет не найден' });
      }

      // Логируем успешное обновление
      const updateUserId = getUserIdFromCookie(req);
      if (updateUserId) {
        await logUserAction(updateUserId, 'Редактирование цвета', 'success', `${name}`);
      }

      // Возвращаем данные с HEX-кодом из БД
      return res.status(200).json(data[0]);
    } catch (error) {
      log.error('Ошибка сервера при обновлении цвета', error as Error, {
        endpoint: '/api/colors/[id]'
      });
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Проверяем права доступа для удаления
      if (!RoleChecks.canEditColors(req.user?.role_id || 0)) {
        return res.status(403).json({ error: 'Удаление цветов доступно только администраторам и менеджерам' });
      }

      // Проверяем, используется ли цвет в товарах (products)
      const { count: productCount } = await supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('color_id', parseInt(id as string));
      const totalCount = (productCount || 0);

      if (totalCount > 0) {
        const deleteUserId = getUserIdFromCookie(req);
        if (deleteUserId) {
          await logUserAction(deleteUserId, 'Удаление цвета', 'error', `Цвет используется в ${totalCount} товаре(ах)`);
        }
        return res.status(400).json({ 
          error: `Нельзя удалить цвет. Он используется в ${totalCount} товаре(ах)` 
        });
      }

      const { error } = await supabaseAdmin
        .from('colors')
        .delete()
        .eq('id', parseInt(id as string));

      if (error) {
        const deleteErrorUserId = getUserIdFromCookie(req);
        log.error('Ошибка удаления цвета', error as Error, {
          endpoint: '/api/colors/[id]',
          userId: deleteErrorUserId || undefined
        });
        if (deleteErrorUserId) {
          await logUserAction(deleteErrorUserId, 'Удаление цвета', 'error', `Ошибка: ${error.message}`);
        }
        return res.status(500).json({ error: 'Ошибка удаления цвета' });
      }

      // Логируем успешное удаление
      const deleteSuccessUserId = getUserIdFromCookie(req);
      if (deleteSuccessUserId) {
        await logUserAction(deleteSuccessUserId, 'Удаление цвета', 'success', `ID: ${id}`);
      }

      return res.status(200).json({ message: 'Цвет успешно удалён' });
    } catch (error) {
      log.error('Ошибка сервера при удалении цвета', error as Error, {
        endpoint: '/api/colors/[id]'
      });
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не разрешен' });
}

const handlerWithAuth = withPermissions(
  RoleChecks.canCreateColors, // Минимальные права для просмотра
  'Доступ к цветам ограничен'
)(handler);

// Применяем CSRF защиту для PUT/DELETE и rate limiting для всех методов
export default withCsrfProtection(
  withRateLimit(RateLimitConfigs.API)(handlerWithAuth as any) as typeof handlerWithAuth
); 