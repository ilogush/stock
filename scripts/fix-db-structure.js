require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function fixDatabaseStructure() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔧 ИСПРАВЛЕНИЕ СТРУКТУРЫ БАЗЫ ДАННЫХ\n');

  try {
    // 1. Добавляем receipt_id в receipt_items
    console.log('1. Добавление receipt_id в receipt_items...');
    
    // Сначала добавляем колонку
    const { error: addReceiptIdError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS receipt_id INTEGER;'
    });
    
    if (addReceiptIdError) {
      console.log('   Колонка receipt_id уже существует или ошибка:', addReceiptIdError.message);
    } else {
      console.log('   ✅ Колонка receipt_id добавлена');
    }

    // Заполняем receipt_id на основе временной связи
    console.log('   Заполнение receipt_id на основе временной связи...');
    const { error: updateReceiptIdError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE receipt_items 
        SET receipt_id = (
          SELECT r.id 
          FROM receipts r 
          WHERE ABS(EXTRACT(EPOCH FROM (r.created_at - receipt_items.created_at))) < 60
          ORDER BY ABS(EXTRACT(EPOCH FROM (r.created_at - receipt_items.created_at)))
          LIMIT 1
        )
        WHERE receipt_id IS NULL;
      `
    });
    
    if (updateReceiptIdError) {
      console.log('   ❌ Ошибка заполнения receipt_id:', updateReceiptIdError.message);
    } else {
      console.log('   ✅ receipt_id заполнен');
    }

    // 2. Добавляем realization_id в realization_items
    console.log('\n2. Добавление realization_id в realization_items...');
    
    const { error: addRealizationIdError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE realization_items ADD COLUMN IF NOT EXISTS realization_id INTEGER;'
    });
    
    if (addRealizationIdError) {
      console.log('   Колонка realization_id уже существует или ошибка:', addRealizationIdError.message);
    } else {
      console.log('   ✅ Колонка realization_id добавлена');
    }

    // Заполняем realization_id
    console.log('   Заполнение realization_id на основе временной связи...');
    const { error: updateRealizationIdError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE realization_items 
        SET realization_id = (
          SELECT r.id 
          FROM realization r 
          WHERE ABS(EXTRACT(EPOCH FROM (r.created_at - realization_items.created_at))) < 60
          ORDER BY ABS(EXTRACT(EPOCH FROM (r.created_at - realization_items.created_at)))
          LIMIT 1
        )
        WHERE realization_id IS NULL;
      `
    });
    
    if (updateRealizationIdError) {
      console.log('   ❌ Ошибка заполнения realization_id:', updateRealizationIdError.message);
    } else {
      console.log('   ✅ realization_id заполнен');
    }

    // 3. Добавляем индексы
    console.log('\n3. Добавление критичных индексов...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);',
      'CREATE INDEX IF NOT EXISTS idx_receipt_items_product_id ON receipt_items(product_id);',
      'CREATE INDEX IF NOT EXISTS idx_receipt_items_created_at ON receipt_items(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_receipt_items_size_code ON receipt_items(size_code);',
      'CREATE INDEX IF NOT EXISTS idx_realization_items_realization_id ON realization_items(realization_id);',
      'CREATE INDEX IF NOT EXISTS idx_realization_items_product_id ON realization_items(product_id);',
      'CREATE INDEX IF NOT EXISTS idx_realization_items_created_at ON realization_items(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_realization_items_size_code ON realization_items(size_code);',
      'CREATE INDEX IF NOT EXISTS idx_products_article ON products(article);',
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);',
      'CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);',
      'CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);'
    ];

    for (const indexSql of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (indexError) {
        console.log('   ❌ Ошибка создания индекса:', indexError.message);
      } else {
        console.log('   ✅ Индекс создан');
      }
    }

    // 4. Проверяем результаты
    console.log('\n4. Проверка результатов...');
    
    // Проверяем receipt_items
    const { data: receiptItemsCheck, error: receiptCheckError } = await supabase
      .from('receipt_items')
      .select('id, receipt_id, created_at')
      .not('receipt_id', 'is', null)
      .limit(5);
    
    if (!receiptCheckError && receiptItemsCheck) {
      console.log('   ✅ receipt_items с receipt_id:', receiptItemsCheck.length, 'записей');
    }

    // Проверяем realization_items
    const { data: realizationItemsCheck, error: realizationCheckError } = await supabase
      .from('realization_items')
      .select('id, realization_id, created_at')
      .not('realization_id', 'is', null)
      .limit(5);
    
    if (!realizationCheckError && realizationItemsCheck) {
      console.log('   ✅ realization_items с realization_id:', realizationItemsCheck.length, 'записей');
    }

    console.log('\n🎉 ИСПРАВЛЕНИЯ ЗАВЕРШЕНЫ!');
    console.log('\n📋 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. Обновить API endpoints для использования новых полей');
    console.log('2. Добавить foreign key constraints');
    console.log('3. Протестировать производительность');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

fixDatabaseStructure().catch(console.error);
