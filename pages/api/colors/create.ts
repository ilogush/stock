import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';

// Функция для генерации HEX-кода на основе названия цвета
function getHexFromName(name: string): string {
  const colorMap: { [key: string]: string } = {
    // Основные цвета
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
    
    // Дополнительные цвета и вариации
    'Розово': '#FFC0CB',
    'Розов': '#FFC0CB',
    'Зайчики на розовом': '#FFB6C1',
    'Зайчики': '#FFB6C1',
    'Розовое': '#FFC0CB',
    'Розовая': '#FFC0CB',
    
    // Оттенки розового
    'Светло-розовый': '#FFB6C1',
    'Темно-розовый': '#FF1493',
    'Нежно-розовый': '#FFE4E1',
    'Ярко-розовый': '#FF69B4',
    
    // Оттенки синего
    'Голубой': '#87CEEB',
    'Небесно-голубой': '#87CEEB',
    'Темно-синий': '#000080',
    'Светло-синий': '#ADD8E6',
    
    // Оттенки зеленого
    'Салатовый': '#7FFF00',
    'Темно-зеленый': '#006400',
    'Светло-зеленый': '#90EE90',
    'Лаймовый': '#32CD32',
    
    // Оттенки красного
    'Бордовый': '#800020',
    'Малиновый': '#DC143C',
    'Темно-красный': '#8B0000',
    'Светло-красный': '#FF6B6B',
    
    // Металлические цвета
    'Золотой': '#FFD700',
    'Серебряный': '#C0C0C0',
    'Бронзовый': '#CD7F32',
    
    // Пастельные цвета
    'Пастельно-розовый': '#FFE4E1',
    'Пастельно-голубой': '#E0F6FF',
    'Пастельно-зеленый': '#E0F8E0',
    'Пастельно-желтый': '#FFFACD'
  };
  
  // Проверяем точное совпадение
  if (colorMap[name]) {
    return colorMap[name];
  }
  
  // Проверяем частичные совпадения
  const normalizedName = name.toLowerCase();
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
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { name, hex_code } = req.body;

      // Нормализуем данные
      const normalizedName = name.trim();
      
      // Генерируем HEX-код автоматически, если не передан
      const generatedHexCode = hex_code || getHexFromName(normalizedName);

      // Проверяем, существует ли уже цвет с таким названием
      const { data: existingColorByName } = await supabaseAdmin
        .from('colors')
        .select('*')
        .eq('name', normalizedName)
        .single();

      if (existingColorByName) {
        return res.status(400).json({ error: 'Цвет с таким названием уже существует' });
      }

      // Создаем новый цвет с hex_code
      const { data, error } = await supabaseAdmin
        .from('colors')
        .insert({
          name: normalizedName,
          hex_code: generatedHexCode
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка создания цвета:', error);
        const userId = getUserIdFromCookie(req);
        if (userId > 0) {
          await logUserAction(userId, 'Создание цвета', 'error', `Ошибка: ${error.message}`);
        }
        return res.status(500).json({ error: 'Ошибка создания цвета' });
      }

      // Логируем успешное создание цвета
      const userId = getUserIdFromCookie(req);
      if (userId > 0) {
        await logUserAction(userId, 'Создание цвета', 'success', `${normalizedName} (${generatedHexCode})`);
      }

      // Возвращаем данные с сгенерированным HEX-кодом
      return res.status(201).json({
        ...data,
        hex_code: generatedHexCode
      });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не разрешен' });
} 