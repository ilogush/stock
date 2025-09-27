/**
 * Функции для очистки текста от лишних символов экранирования
 * Удаляет множественные экранирования и лишние символы
 */

/**
 * Очищает текст от лишних символов экранирования
 */
export function cleanText(text: string | null): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Удаляем множественные экранирования кавычек
  cleaned = cleaned.replace(/\\+"/g, '"');
  cleaned = cleaned.replace(/\\+"/g, '"');
  
  // Удаляем множественные экранирования обратных слешей
  cleaned = cleaned.replace(/\\+/g, '\\');
  
  // Удаляем лишние символы в начале и конце
  cleaned = cleaned.replace(/^["\\[\s]+/, '');
  cleaned = cleaned.replace(/["\\]\s]+$/, '');
  
  // Удаляем множественные символы |
  cleaned = cleaned.replace(/\|+/g, '');
  
  // Удаляем лишние пробелы
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Очищает все текстовые поля товара
 */
export function cleanProductText(product: any): any {
  const textFields = [
    'description',
    'care_instructions', 
    'features',
    'technical_specs',
    'materials_info',
    'faq_description',
    'faq_materials',
    'faq_care',
    'faq_reviews'
  ];
  
  const cleaned = { ...product };
  
  textFields.forEach(field => {
    if (cleaned[field]) {
      cleaned[field] = cleanText(cleaned[field]);
    }
  });
  
  return cleaned;
}

/**
 * Очищает массив товаров
 */
export function cleanProductsText(products: any[]): any[] {
  return products.map(product => cleanProductText(product));
}
