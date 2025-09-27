/**
 * Единый сервис для работы с цветами во всей системе
 * Централизует всю логику работы с цветами и обеспечивает консистентность
 */

// Единый словарь цветов с их HEX кодами (основной источник истины)
const UNIFIED_COLOR_DICTIONARY: Record<string, string> = {
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
  'Спрут': '#8B4513',
  'Лоза': '#228B22',
  
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
  'Пастельно-желтый': '#FFFACD',
  
  // Дополнительные цвета
  'Хаки': '#78866B',
  'Коралловый': '#FF7F50',
  'Лососевый': '#FA8072',
  'Кремовый': '#FFF8DC',
  'Слоновая кость': '#FFFFF0',
  'Медный': '#B87333',
  'Оливковый': '#808000',
  'Пурпурный': '#800080',
  'Индиго': '#4B0082',
  'Лавандовый': '#E6E6FA',
  'Мятный': '#98FB98',
  'Фисташковый': '#C0D72F',
  'Персиковый': '#FFDAB9',
  'Сливовый': '#DDA0DD',
  'Туманный': '#D3D3D3'
};

// Карта нормализации названий (для приведения к единому стандарту)
const COLOR_NORMALIZATION_MAP: Record<string, string> = {
  // Разные варианты написания
  'спрут': 'Спрут',
  'лоза': 'Лоза',
  'розово': 'Розово',
  'розов': 'Розов',
  'зайчики на розовом': 'Зайчики на розовом',
  'зайчики': 'Зайчики',
  'розовое': 'Розовое',
  'розовая': 'Розовая',
  'светло-розовый': 'Светло-розовый',
  'темно-розовый': 'Темно-розовый',
  'нежно-розовый': 'Нежно-розовый',
  'ярко-розовый': 'Ярко-розовый',
  'голубой': 'Голубой',
  'небесно-голубой': 'Небесно-голубой',
  'темно-синий': 'Темно-синий',
  'светло-синий': 'Светло-синий',
  'салатовый': 'Салатовый',
  'темно-зеленый': 'Темно-зеленый',
  'светло-зеленый': 'Светло-зеленый',
  'лаймовый': 'Лаймовый',
  'бордовый': 'Бордовый',
  'малиновый': 'Малиновый',
  'темно-красный': 'Темно-красный',
  'светло-красный': 'Светло-красный',
  'золотой': 'Золотой',
  'серебряный': 'Серебряный',
  'бронзовый': 'Бронзовый',
  'пастельно-розовый': 'Пастельно-розовый',
  'пастельно-голубой': 'Пастельно-голубой',
  'пастельно-зеленый': 'Пастельно-зеленый',
  'пастельно-желтый': 'Пастельно-желтый',
  'хаки': 'Хаки',
  'коралловый': 'Коралловый',
  'лососевый': 'Лососевый',
  'кремовый': 'Кремовый',
  'слоновая кость': 'Слоновая кость',
  'медный': 'Медный',
  'оливковый': 'Оливковый',
  'пурпурный': 'Пурпурный',
  'индиго': 'Индиго',
  'лавандовый': 'Лавандовый',
  'мятный': 'Мятный',
  'фисташковый': 'Фисташковый',
  'персиковый': 'Персиковый',
  'сливовый': 'Сливовый',
  'туманный': 'Туманный'
};

/**
 * Нормализует название цвета к единому стандарту
 */
export function normalizeColorName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'Неизвестный';
  }

  // Приводим к правильному регистру
  const normalized = COLOR_NORMALIZATION_MAP[name.toLowerCase()] || name;
  
  // Если есть в основном словаре - возвращаем как есть
  if (UNIFIED_COLOR_DICTIONARY[normalized]) {
    return normalized;
  }

  // Иначе возвращаем с заглавной буквы
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

/**
 * Получает HEX-код цвета по названию
 */
export function getHexFromName(name: string): string {
  const normalizedName = normalizeColorName(name);
  
  // Проверяем точное совпадение
  if (UNIFIED_COLOR_DICTIONARY[normalizedName]) {
    return UNIFIED_COLOR_DICTIONARY[normalizedName];
  }
  
  // Проверяем частичные совпадения
  const searchName = normalizedName.toLowerCase();
  
  // Специальные правила для розовых цветов
  if (searchName.includes('розов')) {
    if (searchName.includes('ярко')) {
      return '#FF69B4'; // Ярко-розовый
    } else if (searchName.includes('нежно')) {
      return '#FFE4E1'; // Нежно-розовый
    } else if (searchName.includes('светло')) {
      return '#FFB6C1'; // Светло-розовый
    } else if (searchName.includes('темно')) {
      return '#FF1493'; // Темно-розовый
    } else {
      return '#FFC0CB'; // Обычный розовый
    }
  }
  
  // Специальные правила для синих цветов
  if (searchName.includes('синий') || searchName.includes('голубой')) {
    if (searchName.includes('темно')) {
      return '#000080'; // Темно-синий
    } else if (searchName.includes('светло')) {
      return '#ADD8E6'; // Светло-синий
    } else if (searchName.includes('небесно')) {
      return '#87CEEB'; // Небесно-голубой
    } else {
      return '#0000FF'; // Обычный синий
    }
  }
  
  // Специальные правила для зеленых цветов
  if (searchName.includes('зеленый') || searchName.includes('салатовый') || searchName.includes('лаймовый')) {
    if (searchName.includes('темно')) {
      return '#006400'; // Темно-зеленый
    } else if (searchName.includes('светло')) {
      return '#90EE90'; // Светло-зеленый
    } else if (searchName.includes('салатовый') || searchName.includes('лаймовый')) {
      return '#32CD32'; // Лаймовый
    } else {
      return '#00FF00'; // Обычный зеленый
    }
  }
  
  // Если ничего не найдено, генерируем цвет на основе названия
  return generateColorFromName(normalizedName);
}

/**
 * Генерирует HEX-код на основе названия цвета
 */
function generateColorFromName(name: string): string {
  const normalizedNameForHash = name.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalizedNameForHash.length; i++) {
    hash = normalizedNameForHash.charCodeAt(i) + ((hash << 5) - hash);
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
 * Получает все доступные цвета
 */
export function getAllColors(): Record<string, string> {
  return { ...UNIFIED_COLOR_DICTIONARY };
}

/**
 * Проверяет, существует ли цвет с таким названием
 */
export function colorExists(name: string): boolean {
  const normalizedName = normalizeColorName(name);
  return !!UNIFIED_COLOR_DICTIONARY[normalizedName];
}

/**
 * Получает цвет по HEX-коду
 */
export function getColorNameByHex(hex: string): string | null {
  for (const [name, colorHex] of Object.entries(UNIFIED_COLOR_DICTIONARY)) {
    if (colorHex.toLowerCase() === hex.toLowerCase()) {
      return name;
    }
  }
  return null;
}

/**
 * Сравнивает два цвета (по названию или HEX-коду)
 */
export function compareColors(color1: string, color2: string): boolean {
  if (!color1 || !color2) return false;
  
  // Если это HEX-коды
  if (color1.startsWith('#') && color2.startsWith('#')) {
    return color1.toLowerCase() === color2.toLowerCase();
  }
  
  // Если это названия
  const normalized1 = normalizeColorName(color1);
  const normalized2 = normalizeColorName(color2);
  
  return normalized1 === normalized2;
}

const unifiedColorService = {
  normalizeColorName,
  getHexFromName,
  getAllColors,
  colorExists,
  getColorNameByHex,
  compareColors
};

export default unifiedColorService;

