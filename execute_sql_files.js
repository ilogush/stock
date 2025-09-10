const fs = require('fs');
const path = require('path');

async function executeSqlFile(filename) {
  try {
    console.log(`Читаем файл: ${filename}`);
    const sqlContent = fs.readFileSync(filename, 'utf8');
    
    console.log(`Отправляем SQL в API...`);
    const response = await fetch('http://localhost:3000/api/admin/execute-sql-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: sqlContent })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${filename} выполнен успешно`);
      console.log(`Результат:`, result.message);
    } else {
      console.error(`❌ Ошибка в ${filename}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Ошибка выполнения ${filename}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Начинаем выполнение SQL файлов...\n');
  
  const files = [
    'create_receipts_direct.sql',
    'create_receipts_direct_part2.sql', 
    'create_receipts_direct_part3.sql'
  ];

  for (const file of files) {
    if (fs.existsSync(file)) {
      console.log(`\n📁 Выполняем ${file}...`);
      await executeSqlFile(file);
      // Небольшая пауза между файлами
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log(`⚠️  Файл ${file} не найден`);
    }
  }

  console.log('\n✅ Выполнение завершено!');
}

main().catch(console.error);
