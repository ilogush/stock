/**
 * Утилиты для нормализации данных
 */

/**
 * Нормализует color_id: приводит к числу или null
 * Правила:
 * - null/undefined → null
 * - 0 → null (0 не является валидным ID)
 * - строка "0" → null
 * - положительное число → число
 * - отрицательное число → null
 */
export function normalizeColorId(value: any): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  const num = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  
  if (isNaN(num) || num <= 0) {
    return null; // 0 и отрицательные числа → null
  }
  
  return num;
}

/**
 * Извлекает числовую часть размера для сравнения
 * "92 - 2 года" → "92"
 * "98 - 3 года" → "98"
 * "M" → "M"
 * "XL" → "XL"
 */
export function extractSizeNumber(sizeCode: string): string {
  if (!sizeCode) return '';
  return sizeCode.split(' ')[0].trim();
}

/**
 * Нормализует размер для сохранения в БД
 * 
 * Правила:
 * - Для размеров W101 с ростом (L 160, L 170, M 160, M 170, S 160, S 170, XS 160, XS 170) - сохраняет полный размер с ростом
 * - Для детских размеров с возрастом ("92 - 2 года") - обрезает до числовой части ("92")
 * - Для обычных размеров ("M", "L", "XL") - сохраняет как есть
 * - Для числовых размеров ("92") - сохраняет как есть
 * 
 * @param sizeCode - код размера
 * @param article - артикул товара (опционально, для проверки W101)
 */
/**
 * Форматирует артикул: добавляет "L" в начале, если артикул состоит только из цифр
 * Например: "021" -> "L021", "W101" -> "W101"
 */
export function formatArticle(article: string | null | undefined): string {
  if (!article) return '';
  // Если артикул состоит только из цифр, добавляем "L" в начале
  if (/^[0-9]+$/.test(article)) {
    return `L${article}`;
  }
  return article;
}

export function normalizeSizeCode(sizeCode: string, article?: string): string {
  if (!sizeCode) return '';
  
  const trimmed = sizeCode.trim();
  
  // Если это модель W101, проверяем размеры с ростом
  if (article === 'W101') {
    // Список размеров W101 с ростом
    const w101SizesWithGrowth = [
      'XS 160', 'XS 170',
      'S 160', 'S 170',
      'M 160', 'M 170',
      'L 160', 'L 170'
    ];
    
    // Если размер соответствует формату W101 с ростом, сохраняем полностью
    if (w101SizesWithGrowth.includes(trimmed)) {
      return trimmed;
    }
  }
  
  // Проверяем, является ли размер одним из размеров W101 с ростом (даже если артикул не указан)
  const w101SizesWithGrowth = [
    'XS 160', 'XS 170',
    'S 160', 'S 170',
    'M 160', 'M 170',
    'L 160', 'L 170'
  ];
  
  if (w101SizesWithGrowth.includes(trimmed)) {
    return trimmed; // Сохраняем полный размер с ростом
  }
  
  // Для остальных случаев обрезаем до первой части (для совместимости с текущими данными в БД)
  return extractSizeNumber(sizeCode);
}

/**
 * Нормализует размер для поиска в базе данных
 * Обрабатывает проблемы с кодировкой (кириллица vs латиница)
 * Возвращает массив вариантов для поиска
 */
export function normalizeSizeForSearch(sizeCode: string): string[] {
  const normalized = sizeCode.trim();
  const variants = [normalized];
  
  // Добавляем варианты с разной кодировкой
  if (normalized === 'М') {
    variants.push('M'); // латинская M
  } else if (normalized === 'M') {
    variants.push('М'); // кириллическая М
  }
  
  // Добавляем варианты с числовыми суффиксами
  if (normalized.includes('/')) {
    const baseSize = normalized.split('/')[0];
    variants.push(baseSize);
  }
  
  // Добавляем варианты для детских размеров
  if (normalized.match(/^\d+$/)) {
    variants.push(normalized);
  }
  
  return variants;
}

/**
 * Нормализует артикул: первая буква должна быть заглавной латинской
 * Правила:
 * - Если первая буква - маленькая латинская (a-z), делаем её заглавной
 * - Остальные символы остаются без изменений
 * - Если артикул начинается с цифры или другого символа, не изменяется
 */
export function normalizeArticle(article: string): string {
  if (!article || typeof article !== 'string') return article;
  
  const trimmed = article.trim();
  if (!trimmed) return article;
  
  // Если первая буква - маленькая латинская, делаем её заглавной
  const firstChar = trimmed.charAt(0);
  if (firstChar >= 'a' && firstChar <= 'z') {
    return firstChar.toUpperCase() + trimmed.slice(1);
  }
  
  return trimmed;
}

/**
 * Получает порядковый номер размера для сортировки
 * Используется для сортировки размеров в селектах
 * 
 * @param sizeName - название размера (например, "XS", "M", "92")
 * @param categoryId - ID категории (3 для детской)
 * @returns порядковый номер для сортировки
 */
export function getSizeOrder(sizeName: string, categoryId?: number): number {
  if (!sizeName) return 0;
  
  const name = sizeName.toLowerCase();
  
  // Детские размеры (категория 3) - сортируем по числовому значению
  if (categoryId === 3) {
    const numMatch = sizeName.match(/\d+/);
    if (numMatch) return parseInt(numMatch[0], 10);
    return 0;
  }
  
  // Взрослые размеры - сортируем по стандартному порядку
  if (name.includes('xs')) return 1;
  if (name.includes('s') && !name.includes('xs')) return 2;
  if (name.includes('m') && !name.includes('xl')) return 3;
  if (name.includes('l') && !name.includes('xl')) return 4;
  if (name.includes('xl') && !name.includes('xxl')) return 5;
  if (name.includes('xxl') && !name.includes('xxxl')) return 6;
  if (name.includes('xxxl')) return 7;
  
  // Числовые размеры для взрослых (если есть)
  const numMatch = sizeName.match(/\d+/);
  if (numMatch) return parseInt(numMatch[0], 10);
  
  return 0;
}

