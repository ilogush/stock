/**
 * 📊 Анализ индексов базы данных и рекомендации по оптимизации
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RECOMMENDED_INDEXES = [
  // 🔍 Поисковые индексы
  {
    table: 'products',
    columns: ['article'],
    type: 'btree',
    reason: 'Быстрый поиск по артикулу товара'
  },
  {
    table: 'products', 
    columns: ['name'],
    type: 'btree',
    reason: 'Поиск по названию товара'
  },
  {
    table: 'products',
    columns: ['category_id', 'brand_id'],
    type: 'btree',
    reason: 'Фильтрация по категории и бренду'
  },
  
  // 📦 Складские операции
  {
    table: 'receipt_items',
    columns: ['product_id', 'created_at'],
    type: 'btree', 
    reason: 'Оптимизация расчета остатков на складе'
  },
  {
    table: 'realization_items',
    columns: ['product_id', 'created_at'],
    type: 'btree',
    reason: 'Оптимизация расчета реализованных товаров'
  },
  {
    table: 'receipt_items',
    columns: ['article', 'created_at'],
    type: 'btree',
    reason: 'Связь поступлений по артикулу и времени'
  },
  {
    table: 'realization_items',
    columns: ['article', 'created_at'],
    type: 'btree',
    reason: 'Связь реализаций по артикулу и времени'
  },

  // 📅 Временные индексы
  {
    table: 'receipts',
    columns: ['created_at'],
    type: 'btree',
    reason: 'Сортировка поступлений по дате'
  },
  {
    table: 'realization',
    columns: ['created_at'],
    type: 'btree', 
    reason: 'Сортировка реализаций по дате'
  },

  // 👥 Пользовательские операции
  {
    table: 'users',
    columns: ['role_id'],
    type: 'btree',
    reason: 'Фильтрация пользователей по роли'
  },
  {
    table: 'tasks',
    columns: ['assignee_id', 'status'],
    type: 'btree',
    reason: 'Поиск задач по исполнителю и статусу'
  },

  // 🔗 Внешние ключи
  {
    table: 'products',
    columns: ['color_id'],
    type: 'btree',
    reason: 'JOIN с таблицей цветов'
  },
  {
    table: 'brand_managers',
    columns: ['brand_id', 'user_id'],
    type: 'btree',
    reason: 'Связь менеджеров с брендами'
  }
];

async function analyzeCurrentIndexes() {
  console.log('🔍 Анализ текущих индексов...\n');
  
  try {
    // Получаем информацию о существующих индексах
    const { data: indexes, error } = await supabase
      .rpc('get_table_indexes', {});
    
    if (error) {
      console.log('ℹ️  Не удалось получить информацию об индексах через RPC');
      console.log('   Это нормально для Supabase - продолжаем с рекомендациями\n');
    }

    return indexes || [];
  } catch (error) {
    console.log('ℹ️  Анализ существующих индексов недоступен\n');
    return [];
  }
}

async function generateIndexRecommendations() {
  console.log('📊 РЕКОМЕНДАЦИИ ПО ИНДЕКСАМ\n');
  console.log('=' .repeat(50));
  
  const existingIndexes = await analyzeCurrentIndexes();
  
  RECOMMENDED_INDEXES.forEach((index, i) => {
    console.log(`\n${i + 1}. Таблица: ${index.table}`);
    console.log(`   Колонки: ${index.columns.join(', ')}`);
    console.log(`   Тип: ${index.type.toUpperCase()}`);
    console.log(`   💡 Причина: ${index.reason}`);
    
    // Генерируем SQL для создания индекса
    const indexName = `idx_${index.table}_${index.columns.join('_')}`;
    const sql = `CREATE INDEX ${indexName} ON ${index.table} (${index.columns.join(', ')});`;
    console.log(`   🔧 SQL: ${sql}`);
  });

  console.log('\n' + '=' .repeat(50));
  console.log('📋 ИНСТРУКЦИЯ ПО ДОБАВЛЕНИЮ ИНДЕКСОВ:');
  console.log('\n1. Откройте Supabase Dashboard');
  console.log('2. Перейдите в SQL Editor');
  console.log('3. Выполните SQL команды выше по одной');
  console.log('4. Проверьте производительность после каждого индекса');
  console.log('\n⚠️  ВАЖНО: Создавайте индексы постепенно и тестируйте производительность!');
}

async function testTableQueries() {
  console.log('\n🧪 ТЕСТИРОВАНИЕ ПРОИЗВОДИТЕЛЬНОСТИ ЗАПРОСОВ\n');
  console.log('=' .repeat(50));

  const testQueries = [
    {
      name: 'Поиск товаров по артикулу',
      query: () => supabase.from('products').select('id, article, name').ilike('article', '%W%').limit(10)
    },
    {
      name: 'Товары по категории и бренду', 
      query: () => supabase.from('products').select('id, name').eq('category_id', 1).eq('brand_id', 1).limit(10)
    },
    {
      name: 'Последние поступления',
      query: () => supabase.from('receipts').select('id, created_at').order('created_at', { ascending: false }).limit(10)
    },
    {
      name: 'Задачи пользователя',
      query: () => supabase.from('tasks').select('id, title, status').eq('assignee_id', 1).limit(10)
    }
  ];

  for (const test of testQueries) {
    const startTime = Date.now();
    try {
      const { data, error } = await test.query();
      const duration = Date.now() - startTime;
      
      if (error) {
        console.log(`❌ ${test.name}: ОШИБКА - ${error.message}`);
      } else {
        console.log(`✅ ${test.name}: ${duration}ms (найдено ${data?.length || 0} записей)`);
      }
    } catch (err) {
      console.log(`❌ ${test.name}: ИСКЛЮЧЕНИЕ - ${err.message}`);
    }
  }
}

async function main() {
  console.log('🚀 АНАЛИЗ ПРОИЗВОДИТЕЛЬНОСТИ БД\n');
  
  await generateIndexRecommendations();
  await testTableQueries();
  
  console.log('\n✨ Анализ завершен!');
  console.log('📊 Мониторинг производительности доступен: /api/admin/performance-stats');
}

main().catch(console.error);
