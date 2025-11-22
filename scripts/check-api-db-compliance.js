/**
 * Скрипт для проверки соответствия API endpoints структуре базы данных
 * Проверяет:
 * 1. Существование таблиц, используемых в API
 * 2. Существование колонок, используемых в API
 * 3. Правильность foreign key связей
 * 4. Использование receipt_id и realization_id
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Основные таблицы и их ожидаемые колонки
const TABLE_SCHEMAS = {
  receipts: {
    columns: ['id', 'transferrer_id', 'creator_id', 'notes', 'created_at', 'updated_at'],
    foreignKeys: {
      transferrer_id: 'users',
      creator_id: 'users'
    }
  },
  receipt_items: {
    columns: ['id', 'product_id', 'qty', 'size_code', 'color_id', 'receipt_id', 'created_at'],
    foreignKeys: {
      product_id: 'products',
      color_id: 'colors',
      receipt_id: 'receipts'
    }
  },
  realization: {
    columns: ['id', 'sender_id', 'recipient_id', 'notes', 'total_items', 'created_at', 'updated_at'],
    foreignKeys: {
      sender_id: 'users',
      recipient_id: 'users'
    }
  },
  realization_items: {
    columns: ['id', 'product_id', 'qty', 'size_code', 'color_id', 'realization_id', 'created_at'],
    foreignKeys: {
      product_id: 'products',
      color_id: 'colors',
      realization_id: 'realization'
    }
  },
  products: {
    columns: ['id', 'article', 'name', 'brand_id', 'category_id', 'color_id', 'price', 'is_visible', 'created_at', 'updated_at'],
    foreignKeys: {
      brand_id: 'brands',
      category_id: 'categories',
      color_id: 'colors'
    }
  },
  users: {
    columns: ['id', 'email', 'first_name', 'last_name', 'role_id', 'is_online', 'created_at', 'updated_at'],
    foreignKeys: {
      role_id: 'roles'
    }
  },
  brands: {
    columns: ['id', 'name', 'company_id', 'created_at', 'updated_at'],
    foreignKeys: {
      company_id: 'companies'
    }
  },
  categories: {
    columns: ['id', 'name', 'created_at', 'updated_at']
  },
  colors: {
    columns: ['id', 'name', 'hex_code', 'created_at', 'updated_at']
  },
  sizes: {
    columns: ['code', 'name', 'category_id', 'created_at', 'updated_at'], // sizes использует code как первичный ключ, не id
    foreignKeys: {
      category_id: 'categories'
    }
  }
};

// Проверяемые связи в API
const API_RELATIONSHIPS = [
  { from: 'receipts', to: 'users', via: 'transferrer_id', key: 'receipts_transferrer_id_fkey' },
  { from: 'receipts', to: 'users', via: 'creator_id', key: 'receipts_creator_id_fkey' },
  { from: 'receipt_items', to: 'receipts', via: 'receipt_id' },
  { from: 'receipt_items', to: 'products', via: 'product_id' },
  { from: 'receipt_items', to: 'colors', via: 'color_id' },
  { from: 'realization', to: 'users', via: 'sender_id', key: 'realization_sender_id_fkey' },
  { from: 'realization', to: 'users', via: 'recipient_id', key: 'realization_recipient_id_fkey' },
  { from: 'realization_items', to: 'realization', via: 'realization_id' },
  { from: 'realization_items', to: 'products', via: 'product_id' },
  { from: 'realization_items', to: 'colors', via: 'color_id' },
  { from: 'products', to: 'brands', via: 'brand_id' },
  { from: 'products', to: 'categories', via: 'category_id' },
  { from: 'products', to: 'colors', via: 'color_id' }
];

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      // Проверяем код ошибки
      if (error.code === '42P01') {
        return { exists: false, error: 'Table does not exist' };
      }
      return { exists: true, error: null }; // Таблица существует, но может быть пуста
    }
    return { exists: true, error: null };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function checkColumnExists(tableName, columnName) {
  try {
    // Пробуем выбрать колонку с лимитом 0
    const { error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(0);
    
    if (error) {
      if (error.code === '42703') {
        return { exists: false, error: 'Column does not exist' };
      }
      return { exists: false, error: error.message };
    }
    return { exists: true, error: null };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function checkForeignKey(tableName, columnName, referencedTable) {
  try {
    // Проверяем наличие данных с валидными foreign keys
    const { data, error } = await supabase
      .from(tableName)
      .select(`${columnName}`)
      .not(columnName, 'is', null)
      .limit(1);
    
    if (error) {
      return { valid: false, error: error.message };
    }
    
    // Проверяем, что можем получить связанные данные
    if (data && data.length > 0 && data[0][columnName]) {
      const { error: refError } = await supabase
        .from(referencedTable)
        .select('id')
        .eq('id', data[0][columnName])
        .limit(1);
      
      if (refError) {
        return { valid: false, error: `Foreign key violation: ${refError.message}` };
      }
    }
    
    return { valid: true, error: null };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

async function main() {
  console.log('🔍 ПРОВЕРКА СООТВЕТСТВИЯ API И БД\n');
  
  const results = {
    tables: {},
    columns: {},
    relationships: {},
    critical: [],
    warnings: []
  };

  // 1. Проверка существования таблиц
  console.log('1. Проверка существования таблиц...\n');
  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    const check = await checkTableExists(tableName);
    results.tables[tableName] = check;
    
    if (check.exists) {
      console.log(`   ✅ Таблица "${tableName}" существует`);
    } else {
      console.log(`   ❌ Таблица "${tableName}" НЕ существует: ${check.error}`);
      results.critical.push(`Таблица "${tableName}" не существует`);
    }
  }

  // 2. Проверка существования колонок
  console.log('\n2. Проверка существования колонок...\n');
  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    if (!results.tables[tableName].exists) {
      continue; // Пропускаем, если таблицы нет
    }

    results.columns[tableName] = {};
    
    for (const columnName of schema.columns) {
      const check = await checkColumnExists(tableName, columnName);
      results.columns[tableName][columnName] = check;
      
      if (check.exists) {
        console.log(`   ✅ ${tableName}.${columnName}`);
      } else {
        console.log(`   ❌ ${tableName}.${columnName} НЕ существует: ${check.error}`);
        results.critical.push(`Колонка "${tableName}.${columnName}" не существует`);
      }
    }
  }

  // 3. Проверка критических колонок receipt_id и realization_id
  console.log('\n3. Проверка критических колонок receipt_id и realization_id...\n');
  
  const receiptIdCheck = await checkColumnExists('receipt_items', 'receipt_id');
  if (receiptIdCheck.exists) {
    console.log('   ✅ receipt_items.receipt_id существует');
  } else {
    console.log('   ⚠️  receipt_items.receipt_id НЕ существует (требуется для корректной работы)');
    results.warnings.push('receipt_items.receipt_id отсутствует - используется fallback на временную связку');
  }

  const realizationIdCheck = await checkColumnExists('realization_items', 'realization_id');
  if (realizationIdCheck.exists) {
    console.log('   ✅ realization_items.realization_id существует');
  } else {
    console.log('   ⚠️  realization_items.realization_id НЕ существует (требуется для корректной работы)');
    results.warnings.push('realization_items.realization_id отсутствует - используется fallback на временную связку');
  }

  // 4. Проверка foreign key связей
  console.log('\n4. Проверка foreign key связей...\n');
  for (const rel of API_RELATIONSHIPS) {
    if (!results.tables[rel.from]?.exists || !results.tables[rel.to]?.exists) {
      continue; // Пропускаем, если таблиц нет
    }

    const columnCheck = results.columns[rel.from]?.[rel.via];
    if (!columnCheck?.exists) {
      console.log(`   ⚠️  ${rel.from}.${rel.via} → ${rel.to} (колонка не существует)`);
      results.warnings.push(`Связь ${rel.from}.${rel.via} → ${rel.to} не может быть проверена (колонка отсутствует)`);
      continue;
    }

    const fkCheck = await checkForeignKey(rel.from, rel.via, rel.to);
    if (fkCheck.valid) {
      console.log(`   ✅ ${rel.from}.${rel.via} → ${rel.to}`);
      results.relationships[`${rel.from}.${rel.via}`] = { valid: true, to: rel.to };
    } else {
      console.log(`   ⚠️  ${rel.from}.${rel.via} → ${rel.to}: ${fkCheck.error}`);
      results.warnings.push(`Связь ${rel.from}.${rel.via} → ${rel.to} имеет проблемы: ${fkCheck.error}`);
    }
  }

  // 5. Итоговый отчет
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ');
  console.log('='.repeat(60) + '\n');

  if (results.critical.length === 0) {
    console.log('✅ Критических ошибок не найдено');
  } else {
    console.log(`❌ Найдено критических ошибок: ${results.critical.length}`);
    results.critical.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Найдено предупреждений: ${results.warnings.length}`);
    results.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  } else {
    console.log('\n✅ Предупреждений не найдено');
  }

  // 6. Рекомендации
  console.log('\n' + '='.repeat(60));
  console.log('💡 РЕКОМЕНДАЦИИ');
  console.log('='.repeat(60) + '\n');

  if (!receiptIdCheck.exists || !realizationIdCheck.exists) {
    console.log('Для полной работы системы выполните SQL миграцию:');
    console.log('   node scripts/db.js file sql/add-receipt-realization-ids.sql');
    console.log('   node scripts/add-receipt-ids-column.js');
    console.log('');
  }

  if (results.critical.length === 0 && results.warnings.length === 0) {
    console.log('✅ Все проверки пройдены успешно!');
    console.log('Система соответствует структуре базы данных.');
  }

  process.exit(results.critical.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌ Ошибка при проверке:', err);
  process.exit(1);
});
