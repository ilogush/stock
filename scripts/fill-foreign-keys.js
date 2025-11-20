/**
 * Скрипт для заполнения внешних ключей receipt_id и realization_id
 * Запускать ПОСЛЕ выполнения SQL команд из sql/add-foreign-keys.sql
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fillReceiptIds() {
  console.log('\n1️⃣ Заполнение receipt_id...');
  
  // Получаем все поступления
  const { data: receipts, error: receiptsError } = await supabase
    .from('receipts')
    .select('id, created_at')
    .order('created_at', { ascending: true });

  if (receiptsError) {
    console.error('   ❌ Ошибка при получении поступлений:', receiptsError.message);
    return;
  }

  console.log(`   📋 Найдено поступлений: ${receipts?.length || 0}`);

  if (!receipts || receipts.length === 0) {
    console.log('   ⚠️  Нет поступлений для обработки');
    return;
  }

  // Получаем все receipt_items без receipt_id
  const { data: allItems, error: itemsError } = await supabase
    .from('receipt_items')
    .select('id, created_at, receipt_id')
    .is('receipt_id', null)
    .order('created_at', { ascending: true });

  if (itemsError) {
    console.error('   ❌ Ошибка при получении товаров:', itemsError.message);
    return;
  }

  console.log(`   📦 Найдено товаров без receipt_id: ${allItems?.length || 0}`);

  if (!allItems || allItems.length === 0) {
    console.log('   ✅ Все товары уже имеют receipt_id');
    return;
  }

  // Связываем товары с поступлениями по времени
  const timeWindow = 10 * 60 * 1000; // 10 минут
  let linkedCount = 0;
  let unlinkedCount = 0;

  const updates = [];

  for (const item of allItems) {
    const itemTime = new Date(item.created_at).getTime();
    let bestMatch = null;
    let bestTimeDiff = Infinity;

    // Ищем ближайшее по времени поступление
    for (const receipt of receipts) {
      const receiptTime = new Date(receipt.created_at).getTime();
      const timeDiff = Math.abs(itemTime - receiptTime);

      if (timeDiff <= timeWindow && timeDiff < bestTimeDiff) {
        bestMatch = receipt.id;
        bestTimeDiff = timeDiff;
      }
    }

    if (bestMatch) {
      updates.push({ id: item.id, receipt_id: bestMatch });
      linkedCount++;
    } else {
      unlinkedCount++;
    }
  }

  console.log(`   🔗 Найдено связей: ${linkedCount}`);
  if (unlinkedCount > 0) {
    console.log(`   ⚠️  Без связи: ${unlinkedCount}`);
  }

  // Обновляем базу данных порциями
  const batchSize = 100;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    for (const update of batch) {
      const { error: updateError } = await supabase
        .from('receipt_items')
        .update({ receipt_id: update.receipt_id })
        .eq('id', update.id);

      if (updateError) {
        console.error(`   ❌ Ошибка обновления товара ${update.id}:`, updateError.message);
      }
    }
    
    console.log(`   ✅ Обновлено ${Math.min(i + batchSize, updates.length)} из ${updates.length}`);
  }

  console.log(`   ✅ Заполнение receipt_id завершено`);
}

async function fillRealizationIds() {
  console.log('\n2️⃣ Заполнение realization_id...');
  
  // Получаем все реализации
  const { data: realizations, error: realizationsError } = await supabase
    .from('realization')
    .select('id, created_at')
    .order('created_at', { ascending: true });

  if (realizationsError) {
    console.error('   ❌ Ошибка при получении реализаций:', realizationsError.message);
    return;
  }

  console.log(`   📋 Найдено реализаций: ${realizations?.length || 0}`);

  if (!realizations || realizations.length === 0) {
    console.log('   ⚠️  Нет реализаций для обработки');
    return;
  }

  // Получаем все realization_items без realization_id
  const { data: allItems, error: itemsError } = await supabase
    .from('realization_items')
    .select('id, created_at, realization_id')
    .is('realization_id', null)
    .order('created_at', { ascending: true });

  if (itemsError) {
    console.error('   ❌ Ошибка при получении товаров:', itemsError.message);
    return;
  }

  console.log(`   📦 Найдено товаров без realization_id: ${allItems?.length || 0}`);

  if (!allItems || allItems.length === 0) {
    console.log('   ✅ Все товары уже имеют realization_id');
    return;
  }

  // Связываем товары с реализациями по времени
  const timeWindow = 2 * 60 * 60 * 1000; // 2 часа
  let linkedCount = 0;
  let unlinkedCount = 0;

  const updates = [];

  for (const item of allItems) {
    const itemTime = new Date(item.created_at).getTime();
    let bestMatch = null;
    let bestTimeDiff = Infinity;

    // Ищем ближайшую по времени реализацию
    for (const realization of realizations) {
      const realizationTime = new Date(realization.created_at).getTime();
      const timeDiff = Math.abs(itemTime - realizationTime);

      if (timeDiff <= timeWindow && timeDiff < bestTimeDiff) {
        bestMatch = realization.id;
        bestTimeDiff = timeDiff;
      }
    }

    if (bestMatch) {
      updates.push({ id: item.id, realization_id: bestMatch });
      linkedCount++;
    } else {
      unlinkedCount++;
    }
  }

  console.log(`   🔗 Найдено связей: ${linkedCount}`);
  if (unlinkedCount > 0) {
    console.log(`   ⚠️  Без связи: ${unlinkedCount}`);
  }

  // Обновляем базу данных порциями
  const batchSize = 100;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    for (const update of batch) {
      const { error: updateError } = await supabase
        .from('realization_items')
        .update({ realization_id: update.realization_id })
        .eq('id', update.id);

      if (updateError) {
        console.error(`   ❌ Ошибка обновления товара ${update.id}:`, updateError.message);
      }
    }
    
    console.log(`   ✅ Обновлено ${Math.min(i + batchSize, updates.length)} из ${updates.length}`);
  }

  console.log(`   ✅ Заполнение realization_id завершено`);
}

async function main() {
  console.log('🔧 Заполнение внешних ключей в базе данных\n');
  console.log('='.repeat(80));
  console.log('⚠️  ВНИМАНИЕ: Убедитесь, что вы выполнили SQL команды из sql/add-foreign-keys.sql');
  console.log('='.repeat(80));

  await fillReceiptIds();
  await fillRealizationIds();

  console.log('\n' + '='.repeat(80));
  console.log('✅ Обработка завершена');
}

main().catch(console.error);

