/**
 * Функции для нормализации названий цветов
 * Обеспечивает вывод цветов только на русском языке
 */

/**
 * Карта английских названий цветов на русские
 */
const COLOR_TRANSLATIONS: Record<string, string> = {
  // Основные цвета
  'red': 'Красный',
  'blue': 'Синий',
  'green': 'Зеленый',
  'yellow': 'Желтый',
  'black': 'Черный',
  'white': 'Белый',
  'gray': 'Серый',
  'grey': 'Серый',
  'brown': 'Коричневый',
  'orange': 'Оранжевый',
  'purple': 'Фиолетовый',
  'pink': 'Розовый',
  
  // Оттенки
  'light': 'Светлый',
  'dark': 'Темный',
  'bright': 'Яркий',
  'pale': 'Бледный',
  'deep': 'Глубокий',
  'soft': 'Мягкий',
  'vivid': 'Яркий',
  'muted': 'Приглушенный',
  
  // Специфические цвета
  'navy': 'Темно-синий',
  'maroon': 'Темно-красный',
  'olive': 'Оливковый',
  'lime': 'Лаймовый',
  'teal': 'Бирюзовый',
  'cyan': 'Голубой',
  'magenta': 'Пурпурный',
  'indigo': 'Индиго',
  'violet': 'Фиолетовый',
  'coral': 'Коралловый',
  'salmon': 'Лососевый',
  'beige': 'Бежевый',
  'cream': 'Кремовый',
  'ivory': 'Слоновая кость',
  'gold': 'Золотой',
  'silver': 'Серебряный',
  'bronze': 'Бронзовый',
  'copper': 'Медный',
  
  // Специальные названия
  'assorted': 'Ассорти',
  'multicolor': 'Многоцветный',
  'rainbow': 'Радужный',
  'neutral': 'Нейтральный',
  'natural': 'Натуральный',
  'classic': 'Классический',
  'modern': 'Современный',
  'vintage': 'Винтажный'
};

/**
 * Нормализует название цвета на русский язык
 */
export function normalizeColorName(colorName: string): string {
  if (!colorName) return '';
  
  const normalized = colorName.trim().toLowerCase();
  
  // Если название уже на русском, возвращаем как есть
  if (/[а-яё]/i.test(colorName)) {
    return colorName;
  }
  
  // Проверяем точное совпадение
  if (COLOR_TRANSLATIONS[normalized]) {
    return COLOR_TRANSLATIONS[normalized];
  }
  
  // Проверяем составные названия (например, "light blue")
  const words = normalized.split(/\s+/);
  if (words.length === 2) {
    const modifier = COLOR_TRANSLATIONS[words[0]];
    const color = COLOR_TRANSLATIONS[words[1]];
    
    if (modifier && color) {
      return `${modifier} ${color}`;
    }
  }
  
  // Если не нашли перевод, возвращаем оригинальное название
  return colorName;
}

/**
 * Нормализует массив цветов
 */
export function normalizeColors(colors: Array<{ id: string | number; name: string }>): Array<{ id: string | number; name: string }> {
  return colors.map(color => ({
    ...color,
    name: normalizeColorName(color.name)
  }));
}

/**
 * Получает русское название цвета по ID
 */
export function getColorNameById(id: string | number): string {
  // Здесь можно добавить логику для получения названия по ID
  // Пока возвращаем ID как есть
  return id.toString();
}
