/**
 * Скрипт для проверки количества удаленных реализаций
 * Проверяет текущее состояние и сравнивает с ожидаемым
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDeletedCount() {
  console.log('🔍 ПРОВЕРКА КОЛИЧЕСТВА УДАЛЕННЫХ РЕАЛИЗАЦИЙ\n');
  console.log('='.repeat(70));

  try {
    // 1. Проверяем пустые реализации (которые еще остались)
    console.log('\n1️⃣ Проверка пустых реализаций (которые еще остались)...');
    
    const { data: emptyRealizations, error: emptyError } = await supabase
      .from('realization')
      .select('id, created_at')
      .order('id', { ascending: false });

    if (emptyError) {
      console.error('❌ Ошибка получения реализаций:', emptyError);
      return;
    }

    // Проверяем каждую реализацию на наличие товаров
    const emptyIds = [];
    if (emptyRealizations) {
      for (const realization of emptyRealizations) {
        const { data: items, error: itemsError } = await supabase
          .from('realization_items')
          .select('id')
          .eq('realization_id', realization.id)
          .limit(1);

        if (!itemsError && (!items || items.length === 0)) {
          emptyIds.push(realization.id);
        }
      }
    }

    console.log(`   📊 Всего реализаций в БД: ${emptyRealizations?.length || 0}`);
    console.log(`   ⚠️  Пустых реализаций (без товаров): ${emptyIds.length}`);
    
    if (emptyIds.length > 0) {
      console.log(`   📋 ID пустых реализаций: ${emptyIds.join(', ')}`);
    } else {
      console.log('   ✅ Все реализации имеют товары!');
    }

    // 2. Проверяем последние реализации
    console.log('\n2️⃣ Последние 10 реализаций:');
    
    const lastRealizations = emptyRealizations?.slice(0, 10) || [];
    
    for (const realization of lastRealizations) {
      const { data: items, error: itemsError } = await supabase
        .from('realization_items')
        .select('id, qty')
        .eq('realization_id', realization.id);

      const itemsCount = items?.length || 0;
      const totalQty = items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0;
      
      const status = itemsCount === 0 ? '❌ ПУСТАЯ' : '✅';
      console.log(`   ${status} ID: ${realization.id}, товаров: ${itemsCount}, количество: ${totalQty} шт.`);
    }

    // 3. Проверяем, какие ID отсутствуют (возможно были удалены)
    console.log('\n3️⃣ Проверка отсутствующих ID (226, 225, 224, ... 218):');
    
    const expectedIds = [226, 225, 224, 223, 222, 221, 220, 219, 218];
    const existingIds = emptyRealizations?.map(r => r.id) || [];
    const missingIds = expectedIds.filter(id => !existingIds.includes(id));

    if (missingIds.length > 0) {
      console.log(`   ✅ Удалено реализаций из списка: ${missingIds.length}`);
      console.log(`   📋 Удаленные ID: ${missingIds.join(', ')}`);
      
      // Проверяем, были ли они действительно пустыми
      console.log('\n   💡 Эти записи были удалены, так как не имели товаров.');
    } else {
      console.log('   ⚠️  Все ID из списка (226-218) все еще существуют');
    }

    // 4. Итоговая статистика
    console.log('\n' + '='.repeat(70));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(70));
    console.log(`   Всего реализаций в БД: ${emptyRealizations?.length || 0}`);
    console.log(`   Пустых реализаций (без товаров): ${emptyIds.length}`);
    
    if (missingIds.length > 0) {
      console.log(`   ✅ Удалено из списка (226-218): ${missingIds.length} записей`);
      console.log(`   📋 Удаленные ID: ${missingIds.join(', ')}`);
    }

    // 5. Проверка поступлений (опционально)
    console.log('\n4️⃣ Проверка пустых поступлений (опционально):');
    
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('id')
      .order('id', { ascending: false })
      .limit(10);

    if (!receiptsError && receipts) {
      let emptyReceipts = 0;
      for (const receipt of receipts) {
        const { data: items } = await supabase
          .from('receipt_items')
          .select('id')
          .eq('receipt_id', receipt.id)
          .limit(1);

        if (!items || items.length === 0) {
          emptyReceipts++;
        }
      }
      
      console.log(`   📊 Проверено поступлений: ${receipts.length}`);
      console.log(`   ⚠️  Пустых поступлений: ${emptyReceipts}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ ПРОВЕРКА ЗАВЕРШЕНА');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
  }
}

checkDeletedCount().catch(console.error);

