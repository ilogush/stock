/**
 * Единый сервис для работы с цветами
 * Централизует всю логику генерации HEX-кодов и работы с цветами
 */

// Единый словарь цветов с их HEX кодами
const COLOR_DICTIONARY: Record<string, string> = {
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
  
  // Дополнительные цвета
  'Хаки': '#78866B',
  'Малиновый': '#DC143C',
  'Пастельно-голубой': '#E0F6FF'
};

/**
 * Генерирует HEX-код на основе названия цвета
 * Единая функция для всех API endpoints
 */
export function getHexFromName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '#808080'; // Серый по умолчанию
  }

  // Проверяем точное совпадение
  if (COLOR_DICTIONARY[name]) {
    return COLOR_DICTIONARY[name];
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
  for (const [colorName, hexCode] of Object.entries(COLOR_DICTIONARY)) {
    if (normalizedName.includes(colorName.toLowerCase()) || 
        colorName.toLowerCase().includes(normalizedName)) {
      return hexCode;
    }
  }
  
  // Если ничего не найдено, генерируем цвет на основе названия
  return generateColorFromName(name);
}

/**
 * Генерирует цвет на основе названия (fallback)
 */
function generateColorFromName(name: string): string {
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

/**
 * Получает все доступные цвета из словаря
 */
export function getAllColors(): Array<{ name: string; hex: string }> {
  return Object.entries(COLOR_DICTIONARY).map(([name, hex]) => ({
    name,
    hex
  }));
}

/**
 * Проверяет, существует ли цвет в словаре
 */
export function colorExists(name: string): boolean {
  return COLOR_DICTIONARY[name] !== undefined;
}

/**
 * Нормализует название цвета (приводит к стандартному виду)
 */
export function normalizeColorName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'Неизвестный';
  }
  
  // Ищем точное совпадение
  if (COLOR_DICTIONARY[name]) {
    return name;
  }
  
  // Ищем частичное совпадение
  const normalizedName = name.toLowerCase();
  for (const colorName of Object.keys(COLOR_DICTIONARY)) {
    if (normalizedName.includes(colorName.toLowerCase()) || 
        colorName.toLowerCase().includes(normalizedName)) {
      return colorName;
    }
  }
  
  return name; // Возвращаем оригинальное название, если не найдено
}
