require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testDatabaseFixes() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🧪 ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЙ БАЗЫ ДАННЫХ\n');

  let allTestsPassed = true;

  // Тест 1: Проверка receipt_id в receipt_items
  console.log('1. Тестирование receipt_id в receipt_items...');
  try {
    const { data: receiptItems, error } = await supabase
      .from('receipt_items')
      .select('id, receipt_id, created_at, receipt:receipts(id, created_at)')
      .not('receipt_id', 'is', null)
      .limit(10);

    if (error) {
      console.log('   ❌ Ошибка:', error.message);
      allTestsPassed = false;
    } else if (!receiptItems || receiptItems.length === 0) {
      console.log('   ⚠️  Нет записей с receipt_id');
    } else {
      console.log(`   ✅ Найдено ${receiptItems.length} записей с receipt_id`);
      
      // Проверяем корректность связывания
      let correctLinks = 0;
      receiptItems.forEach(item => {
        if (item.receipt && item.receipt.created_at) {
          const timeDiff = Math.abs(
            new Date(item.created_at).getTime() - new Date(item.receipt.created_at).getTime()
          );
          if (timeDiff < 60000) { // В пределах 60 секунд
            correctLinks++;
          }
        }
      });
      
      const accuracy = (correctLinks / receiptItems.length) * 100;
      console.log(`   📊 Точность связывания: ${accuracy.toFixed(1)}%`);
      
      if (accuracy < 90) {
        console.log('   ⚠️  Низкая точность связывания');
        allTestsPassed = false;
      }
    }
  } catch (error) {
    console.log('   ❌ Критическая ошибка:', error.message);
    allTestsPassed = false;
  }

  // Тест 2: Проверка realization_id в realization_items
  console.log('\n2. Тестирование realization_id в realization_items...');
  try {
    const { data: realizationItems, error } = await supabase
      .from('realization_items')
      .select('id, realization_id, created_at, realization:realization(id, created_at)')
      .not('realization_id', 'is', null)
      .limit(10);

    if (error) {
      console.log('   ❌ Ошибка:', error.message);
      allTestsPassed = false;
    } else if (!realizationItems || realizationItems.length === 0) {
      console.log('   ⚠️  Нет записей с realization_id');
    } else {
      console.log(`   ✅ Найдено ${realizationItems.length} записей с realization_id`);
      
      // Проверяем корректность связывания
      let correctLinks = 0;
      realizationItems.forEach(item => {
        if (item.realization && item.realization.created_at) {
          const timeDiff = Math.abs(
            new Date(item.created_at).getTime() - new Date(item.realization.created_at).getTime()
          );
          if (timeDiff < 60000) { // В пределах 60 секунд
            correctLinks++;
          }
        }
      });
      
      const accuracy = (correctLinks / realizationItems.length) * 100;
      console.log(`   📊 Точность связывания: ${accuracy.toFixed(1)}%`);
      
      if (accuracy < 90) {
        console.log('   ⚠️  Низкая точность связывания');
        allTestsPassed = false;
      }
    }
  } catch (error) {
    console.log('   ❌ Критическая ошибка:', error.message);
    allTestsPassed = false;
  }

  // Тест 3: Проверка индексов
  console.log('\n3. Тестирование индексов...');
  try {
    // Проверяем производительность запроса с индексом
    const startTime = Date.now();
    const { data: receiptItemsWithIndex, error: indexError } = await supabase
      .from('receipt_items')
      .select('id, product_id, size_code')
      .eq('product_id', 1)
      .limit(100);
    const endTime = Date.now();
    
    if (indexError) {
      console.log('   ❌ Ошибка запроса с индексом:', indexError.message);
      allTestsPassed = false;
    } else {
      console.log(`   ✅ Запрос с индексом выполнен за ${endTime - startTime}ms`);
      console.log(`   📊 Найдено ${receiptItemsWithIndex?.length || 0} записей`);
    }
  } catch (error) {
    console.log('   ❌ Критическая ошибка:', error.message);
    allTestsPassed = false;
  }

  // Тест 4: Проверка целостности данных
  console.log('\n4. Тестирование целостности данных...');
  try {
    // Проверяем, что все receipt_items имеют корректный receipt_id
    const { data: orphanedReceiptItems, error: orphanError } = await supabase
      .from('receipt_items')
      .select('id, receipt_id')
      .not('receipt_id', 'is', null)
      .is('receipt_id', null);

    if (orphanError) {
      console.log('   ❌ Ошибка проверки целостности:', orphanError.message);
      allTestsPassed = false;
    } else if (orphanedReceiptItems && orphanedReceiptItems.length > 0) {
      console.log(`   ⚠️  Найдено ${orphanedReceiptItems.length} записей без receipt_id`);
      allTestsPassed = false;
    } else {
      console.log('   ✅ Все записи имеют корректный receipt_id');
    }
  } catch (error) {
    console.log('   ❌ Критическая ошибка:', error.message);
    allTestsPassed = false;
  }

  // Тест 5: Производительность API
  console.log('\n5. Тестирование производительности API...');
  try {
    const startTime = Date.now();
    
    // Тестируем оптимизированный запрос склада
    const { data: stockData, error: stockError } = await supabase
      .from('receipt_items')
      .select(`
        qty,
        size_code,
        product_id,
        receipt_id,
        product:products!receipt_items_product_id_fkey(
          id,
          name,
          article,
          brand:brands!products_brand_id_fkey(name)
        )
      `)
      .limit(50);
    
    const endTime = Date.now();
    
    if (stockError) {
      console.log('   ❌ Ошибка API склада:', stockError.message);
      allTestsPassed = false;
    } else {
      console.log(`   ✅ API склада выполнен за ${endTime - startTime}ms`);
      console.log(`   📊 Загружено ${stockData?.length || 0} записей`);
      
      if (endTime - startTime > 1000) {
        console.log('   ⚠️  Медленный запрос (>1000ms)');
        allTestsPassed = false;
      }
    }
  } catch (error) {
    console.log('   ❌ Критическая ошибка:', error.message);
    allTestsPassed = false;
  }

  // Итоговый результат
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('✅ База данных готова к использованию');
    console.log('🚀 Можно переходить к оптимизации API');
  } else {
    console.log('❌ НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ');
    console.log('⚠️  Требуется дополнительная настройка');
    console.log('🔧 Проверьте логи выше для деталей');
  }
  console.log('='.repeat(50));
}

testDatabaseFixes().catch(console.error);
