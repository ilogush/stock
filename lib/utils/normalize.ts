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
 * Если размер содержит возраст ("92 - 2 года"), сохраняет полный формат
 * Если только число ("92"), сохраняет как есть
 * 
 * ВАЖНО: В текущей системе размеры сохраняются в числовом формате ("92"),
 * поэтому эта функция обрезает до числовой части для совместимости
 */
export function normalizeSizeCode(sizeCode: string): string {
  if (!sizeCode) return '';
  // Обрезаем до числовой части для совместимости с текущими данными в БД
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

