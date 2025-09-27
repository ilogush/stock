require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

/**
 * Скрипт для анализа производительности базы данных
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Анализ производительности базы данных...\n');

// Функция для выполнения SQL запроса
async function executeQuery(query, description) {
  try {
    console.log(`📊 ${description}...`);
    const start = Date.now();
    
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: query });
    
    const duration = Date.now() - start;
    
    if (error) {
      console.log(`❌ Ошибка: ${error.message}`);
      return null;
    }
    
    console.log(`✅ Выполнено за ${duration}ms`);
    return { data, duration };
  } catch (error) {
    console.log(`❌ Ошибка выполнения: ${error.message}`);
    return null;
  }
}

// Анализ размеров таблиц
async function analyzeTableSizes() {
  console.log('\n1️⃣ Анализ размеров таблиц:');
  console.log('============================');
  
  const query = `
    SELECT 
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
      pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  `;
  
  const result = await executeQuery(query, 'Получение размеров таблиц');
  if (result && result.data) {
    result.data.forEach(row => {
      console.log(`   ${row.tablename}: ${row.size}`);
    });
  }
}

// Анализ индексов
async function analyzeIndexes() {
  console.log('\n2️⃣ Анализ индексов:');
  console.log('====================');
  
  const query = `
    SELECT 
      t.tablename,
      i.indexname,
      pg_size_pretty(pg_relation_size(i.indexname::regclass)) as size,
      i.indexdef
    FROM pg_indexes i
    JOIN pg_tables t ON i.tablename = t.tablename
    WHERE t.schemaname = 'public'
    ORDER BY pg_relation_size(i.indexname::regclass) DESC;
  `;
  
  const result = await executeQuery(query, 'Получение информации об индексах');
  if (result && result.data) {
    result.data.forEach(row => {
      console.log(`   ${row.tablename}.${row.indexname}: ${row.size}`);
    });
  }
}

// Анализ медленных запросов
async function analyzeSlowQueries() {
  console.log('\n3️⃣ Анализ медленных запросов:');
  console.log('==============================');
  
  const query = `
    SELECT 
      query,
      calls,
      total_time,
      mean_time,
      rows
    FROM pg_stat_statements 
    WHERE mean_time > 100
    ORDER BY mean_time DESC
    LIMIT 10;
  `;
  
  const result = await executeQuery(query, 'Получение медленных запросов');
  if (result && result.data) {
    result.data.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.query.substring(0, 100)}...`);
      console.log(`      Вызовов: ${row.calls}, Среднее время: ${row.mean_time.toFixed(2)}ms`);
    });
  } else {
    console.log('   ⚠️ pg_stat_statements не включен или нет медленных запросов');
  }
}

// Анализ использования индексов
async function analyzeIndexUsage() {
  console.log('\n4️⃣ Анализ использования индексов:');
  console.log('==================================');
  
  const query = `
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_tup_read,
      idx_tup_fetch
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_tup_read DESC
    LIMIT 10;
  `;
  
  const result = await executeQuery(query, 'Получение статистики использования индексов');
  if (result && result.data) {
    result.data.forEach(row => {
      console.log(`   ${row.tablename}.${row.indexname}: ${row.idx_tup_read} чтений`);
    });
  }
}

// Анализ блокировок
async function analyzeLocks() {
  console.log('\n5️⃣ Анализ блокировок:');
  console.log('======================');
  
  const query = `
    SELECT 
      blocked_locks.pid AS blocked_pid,
      blocked_activity.usename AS blocked_user,
      blocking_locks.pid AS blocking_pid,
      blocking_activity.usename AS blocking_user,
      blocked_activity.query AS blocked_statement,
      blocking_activity.query AS current_statement_in_blocking_process
    FROM pg_catalog.pg_locks blocked_locks
    JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
    JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
      AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
      AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
      AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
      AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
      AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
      AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
      AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
      AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
      AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
      AND blocking_locks.pid != blocked_locks.pid
    JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
    WHERE NOT blocked_locks.granted;
  `;
  
  const result = await executeQuery(query, 'Проверка блокировок');
  if (result && result.data && result.data.length > 0) {
    console.log('   ⚠️ Обнаружены блокировки:');
    result.data.forEach(row => {
      console.log(`      Заблокированный PID: ${row.blocked_pid}`);
      console.log(`      Блокирующий PID: ${row.blocking_pid}`);
    });
  } else {
    console.log('   ✅ Блокировок не обнаружено');
  }
}

// Анализ статистики таблиц
async function analyzeTableStats() {
  console.log('\n6️⃣ Анализ статистики таблиц:');
  console.log('==============================');
  
  const query = `
    SELECT 
      schemaname,
      tablename,
      n_tup_ins as inserts,
      n_tup_upd as updates,
      n_tup_del as deletes,
      n_live_tup as live_tuples,
      n_dead_tup as dead_tuples,
      last_vacuum,
      last_autovacuum,
      last_analyze,
      last_autoanalyze
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_live_tup DESC;
  `;
  
  const result = await executeQuery(query, 'Получение статистики таблиц');
  if (result && result.data) {
    result.data.forEach(row => {
      console.log(`   ${row.tablename}:`);
      console.log(`      Записей: ${row.live_tuples}, Вставок: ${row.inserts}, Обновлений: ${row.updates}`);
      console.log(`      Мертвых записей: ${row.dead_tuples}`);
      if (row.last_analyze) {
        console.log(`      Последний анализ: ${new Date(row.last_analyze).toLocaleString()}`);
      }
    });
  }
}

// Рекомендации по оптимизации
async function generateRecommendations() {
  console.log('\n7️⃣ Рекомендации по оптимизации:');
  console.log('==================================');
  
  const recommendations = [];
  
  // Проверяем размеры таблиц
  const sizeQuery = `
    SELECT 
      tablename,
      pg_total_relation_size('public.'||tablename) as size_bytes
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size('public.'||tablename) DESC;
  `;
  
  const sizeResult = await executeQuery(sizeQuery, 'Анализ размеров для рекомендаций');
  if (sizeResult && sizeResult.data) {
    const largeTables = sizeResult.data.filter(row => row.size_bytes > 100 * 1024 * 1024); // > 100MB
    if (largeTables.length > 0) {
      recommendations.push(`📊 Большие таблицы (>100MB): ${largeTables.map(t => t.tablename).join(', ')}`);
      recommendations.push('   Рекомендация: Рассмотрите партиционирование или архивирование старых данных');
    }
  }
  
  // Проверяем мертвые записи
  const deadQuery = `
    SELECT 
      tablename,
      n_dead_tup,
      n_live_tup
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' AND n_dead_tup > n_live_tup * 0.1;
  `;
  
  const deadResult = await executeQuery(deadQuery, 'Анализ мертвых записей');
  if (deadResult && deadResult.data && deadResult.data.length > 0) {
    recommendations.push('🧹 Таблицы с большим количеством мертвых записей:');
    deadResult.data.forEach(row => {
      recommendations.push(`   ${row.tablename}: ${row.n_dead_tup} мертвых из ${row.n_live_tup} общих`);
    });
    recommendations.push('   Рекомендация: Выполните VACUUM для очистки мертвых записей');
  }
  
  // Проверяем отсутствие индексов
  const noIndexQuery = `
    SELECT 
      t.tablename,
      COUNT(i.indexname) as index_count
    FROM pg_tables t
    LEFT JOIN pg_indexes i ON t.tablename = i.tablename AND t.schemaname = i.schemaname
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename
    HAVING COUNT(i.indexname) = 0;
  `;
  
  const noIndexResult = await executeQuery(noIndexQuery, 'Поиск таблиц без индексов');
  if (noIndexResult && noIndexResult.data && noIndexResult.data.length > 0) {
    recommendations.push('📇 Таблицы без индексов:');
    noIndexResult.data.forEach(row => {
      recommendations.push(`   ${row.tablename}`);
    });
    recommendations.push('   Рекомендация: Добавьте индексы для часто используемых полей');
  }
  
  // Выводим рекомендации
  if (recommendations.length > 0) {
    recommendations.forEach(rec => console.log(`   ${rec}`));
  } else {
    console.log('   ✅ Критических проблем не обнаружено');
  }
}

// Основная функция
async function main() {
  try {
    await analyzeTableSizes();
    await analyzeIndexes();
    await analyzeSlowQueries();
    await analyzeIndexUsage();
    await analyzeLocks();
    await analyzeTableStats();
    await generateRecommendations();
    
    console.log('\n🎉 Анализ производительности завершен!');
    console.log('\n📝 Следующие шаги:');
    console.log('   1. Примените индексы из sql/optimization-indexes.sql');
    console.log('   2. Выполните VACUUM для очистки мертвых записей');
    console.log('   3. Настройте мониторинг производительности');
    console.log('   4. Регулярно анализируйте статистику');
    
  } catch (error) {
    console.error('❌ Ошибка анализа:', error.message);
  }
}

main();
