/**
 * Скрипт для исправления артикулов: первая буква должна быть заглавной
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizeArticle(article) {
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

async function fixArticles() {
  console.log('=== Исправление артикулов ===\n');

  try {
    // Получаем все товары
    const { data: products, error } = await supabase
      .from('products')
      .select('id, article')
      .not('article', 'is', null)
      .limit(10000);

    if (error) {
      console.error('Ошибка получения товаров:', error);
      return;
    }

    console.log(`Всего товаров: ${products?.length || 0}`);

    // Находим товары, которые нужно исправить
    const productsToFix = (products || []).filter(p => {
      if (!p.article) return false;
      const normalized = normalizeArticle(p.article);
      return normalized !== p.article;
    });

    console.log(`Товаров для исправления: ${productsToFix.length}\n`);

    if (productsToFix.length === 0) {
      console.log('✅ Все артикулы уже в правильном формате');
      return;
    }

    // Исправляем артикулы
    let fixed = 0;
    let errors = 0;

    for (const product of productsToFix) {
      const normalized = normalizeArticle(product.article);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ article: normalized })
        .eq('id', product.id);

      if (updateError) {
        console.error(`❌ Ошибка обновления товара ${product.id}:`, updateError.message);
        errors++;
      } else {
        console.log(`✅ ${product.article} -> ${normalized} (ID: ${product.id})`);
        fixed++;
      }
    }

    console.log(`\n=== Итог ===`);
    console.log(`✅ Исправлено: ${fixed}`);
    if (errors > 0) {
      console.log(`❌ Ошибок: ${errors}`);
    }

  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
}

fixArticles();

