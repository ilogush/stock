/**
 * Автоматический скрипт для выполнения SQL миграций из папки sql/
 * Использует DATABASE_URL для прямого подключения к PostgreSQL
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log('🚀 АВТОМАТИЧЕСКОЕ ВЫПОЛНЕНИЕ SQL МИГРАЦИЙ\n');
  console.log('='.repeat(70));

  // Получаем DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

  if (!databaseUrl || databaseUrl === 'postgresql://user:password@host:port/database') {
    console.log('❌ DATABASE_URL не настроен или содержит placeholder');
    console.log('');
    console.log('📋 Для автоматического выполнения миграций:');
    console.log('');
    console.log('1. Получите DATABASE_URL из Supabase Dashboard:');
    console.log('   - Откройте Supabase Dashboard → Settings → Database');
    console.log('   - Скопируйте Connection String (Connection Pooling)');
    console.log('   - Или используйте Connection String (Direct connection)');
    console.log('');
    console.log('2. Добавьте в .env.local:');
    console.log('   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres');
    console.log('');
    console.log('3. Затем запустите: node scripts/run-migrations.js');
    console.log('');
    console.log('💡 Альтернативный способ - выполните SQL вручную в Supabase SQL Editor:');
    console.log('   Откройте Supabase Dashboard → SQL Editor');
    console.log('   Скопируйте SQL из файлов в папке sql/');
    console.log('');
    console.log('='.repeat(70));
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Подключение к базе данных...');
    await client.connect();
    console.log('✅ Подключение установлено\n');

    // Получаем все SQL файлы из папки sql/
    const sqlDir = path.join(process.cwd(), 'sql');
    if (!fs.existsSync(sqlDir)) {
      console.log('⚠️  Папка sql/ не найдена');
      process.exit(0);
    }

    const sqlFiles = fs.readdirSync(sqlDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (sqlFiles.length === 0) {
      console.log('⚠️  SQL файлы не найдены в папке sql/');
      process.exit(0);
    }

    console.log(`Найдено SQL файлов: ${sqlFiles.length}\n`);

    // Выполняем каждый SQL файл
    for (const file of sqlFiles) {
      const filePath = path.join(sqlDir, file);
      console.log(`📄 Выполнение: ${file}...`);

      try {
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Разбиваем SQL на отдельные команды (по ;)
        const commands = sql
          .split(';')
          .map(cmd => cmd.trim())
          .filter(cmd => {
            // Удаляем комментарии и пустые строки
            const cleanCmd = cmd.replace(/--.*$/gm, '').trim();
            return cleanCmd && cleanCmd.length > 0;
          });

        let executed = 0;
        let errors = 0;
        
        for (const command of commands) {
          if (command) {
            try {
              await client.query(command + ';');
              executed++;
            } catch (error) {
              // Пропускаем ошибки "already exists" - это нормально для IF NOT EXISTS
              if (error.message.includes('already exists') || 
                  error.message.includes('duplicate') ||
                  error.code === '42P07') { // duplicate_table
                // Игнорируем - уже существует
              } else {
                console.error(`   ⚠️  Ошибка в команде: ${error.message}`);
                errors++;
              }
            }
          }
        }

        if (executed > 0) {
          console.log(`   ✅ Выполнено команд: ${executed}`);
        } else {
          console.log(`   ℹ️  Все команды уже выполнены или пропущены`);
        }

      } catch (error) {
        console.error(`   ❌ Ошибка выполнения файла: ${error.message}`);
      }
      console.log('');
    }

    // Проверяем результат
    console.log('='.repeat(70));
    console.log('✅ ПРОВЕРКА РЕЗУЛЬТАТА\n');

    // Проверяем receipt_id
    try {
      const { rows: receiptCheck } = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'receipt_items' 
        AND column_name = 'receipt_id'
      `);
      if (receiptCheck.length > 0) {
        console.log('✅ receipt_items.receipt_id существует');
      } else {
        console.log('❌ receipt_items.receipt_id не найдена');
      }
    } catch (error) {
      console.log('⚠️  Не удалось проверить receipt_id:', error.message);
    }

    // Проверяем realization_id
    try {
      const { rows: realizationCheck } = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'realization_items' 
        AND column_name = 'realization_id'
      `);
      if (realizationCheck.length > 0) {
        console.log('✅ realization_items.realization_id существует');
      } else {
        console.log('❌ realization_items.realization_id не найдена');
      }
    } catch (error) {
      console.log('⚠️  Не удалось проверить realization_id:', error.message);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ МИГРАЦИИ ЗАВЕРШЕНЫ!');
    console.log('='.repeat(70));
    console.log('\n📋 Следующий шаг:');
    console.log('   Запустите: node scripts/add-receipt-ids-column.js');
    console.log('   Это заполнит receipt_id и realization_id для существующих данных\n');

  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
    console.error('\n💡 Проверьте:');
    console.error('   1. DATABASE_URL корректно настроен в .env.local');
    console.error('   2. База данных доступна');
    console.error('   3. Или выполните SQL вручную в Supabase SQL Editor\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations().catch(console.error);
