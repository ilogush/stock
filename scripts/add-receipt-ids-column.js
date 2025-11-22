/**
 * Скрипт для добавления колонок receipt_id и realization_id
 * и заполнения данных для всех поступлений и реализаций
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addColumnsAndFillData() {
  console.log('=== Добавление колонок и заполнение данных ===\n');

  try {
    // Проверяем наличие колонки receipt_id
    console.log('1. Проверка наличия колонки receipt_id...');
    const { data: checkReceipt, error: checkReceiptError } = await supabase
      .from('receipt_items')
      .select('receipt_id')
      .limit(1);

    if (checkReceiptError && (checkReceiptError.code === '42703' || checkReceiptError.message?.includes('receipt_id'))) {
      console.log('   ❌ Колонка receipt_id не существует');
      console.log('   ⚠️  Нужно добавить колонку через Supabase SQL Editor:');
      console.log('   ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS receipt_id INTEGER;');
      console.log('   CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);');
      console.log('');
      console.log('   После добавления колонки запустите: node scripts/add-receipt-ids-column.js');
      return;
    }

    console.log('   ✅ Колонка receipt_id существует\n');

    // Проверяем наличие колонки realization_id
    console.log('2. Проверка наличия колонки realization_id...');
    const { data: checkRealization, error: checkRealizationError } = await supabase
      .from('realization_items')
      .select('realization_id')
      .limit(1);

    if (checkRealizationError && (checkRealizationError.code === '42703' || checkRealizationError.message?.includes('realization_id'))) {
      console.log('   ❌ Колонка realization_id не существует');
      console.log('   ⚠️  Нужно добавить колонку через Supabase SQL Editor:');
      console.log('   ALTER TABLE realization_items ADD COLUMN IF NOT EXISTS realization_id INTEGER;');
      console.log('   CREATE INDEX IF NOT EXISTS idx_realization_items_realization_id ON realization_items(realization_id);');
      console.log('');
    } else {
      console.log('   ✅ Колонка realization_id существует\n');
    }

    // Заполняем receipt_id для всех поступлений
    console.log('3. Заполнение receipt_id для поступлений...');
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('id, created_at')
      .order('id');

    if (receiptsError) {
      console.error('   ❌ Ошибка получения поступлений:', receiptsError.message);
      return;
    }

    console.log(`   Найдено поступлений: ${receipts?.length || 0}`);

    let totalUpdated = 0;
    for (const receipt of receipts || []) {
      const receiptTime = new Date(receipt.created_at);
      const timeStart = new Date(receiptTime.getTime() - 300000); // минус 5 минут
      const timeEnd = new Date(receiptTime.getTime() + 300000); // плюс 5 минут

      // Находим товары по времени, у которых нет receipt_id
      const { data: items, error: itemsError } = await supabase
        .from('receipt_items')
        .select('id, receipt_id, created_at')
        .gte('created_at', timeStart.toISOString())
        .lte('created_at', timeEnd.toISOString())
        .is('receipt_id', null)
        .limit(100);

      if (itemsError) {
        console.error(`   ❌ Ошибка для поступления ${receipt.id}:`, itemsError.message);
        continue;
      }

      if (items && items.length > 0) {
        const itemIds = items.map(item => item.id);

        const { error: updateError } = await supabase
          .from('receipt_items')
          .update({ receipt_id: receipt.id })
          .in('id', itemIds);

        if (updateError) {
          console.error(`   ❌ Ошибка обновления для поступления ${receipt.id}:`, updateError.message);
        } else {
          console.log(`   ✅ Поступление ${receipt.id}: обновлено ${items.length} товаров`);
          totalUpdated += items.length;
        }
      }
    }

    console.log(`\n   ✅ Всего обновлено товаров: ${totalUpdated}\n`);

    // Заполняем realization_id для всех реализаций
    console.log('4. Заполнение realization_id для реализаций...');
    const { data: realizations, error: realizationsError } = await supabase
      .from('realization')
      .select('id, created_at')
      .order('id');

    if (realizationsError) {
      console.error('   ❌ Ошибка получения реализаций:', realizationsError.message);
      return;
    }

    console.log(`   Найдено реализаций: ${realizations?.length || 0}`);

    let totalRealizationUpdated = 0;
    for (const realization of realizations || []) {
      const realizationTime = new Date(realization.created_at);
      const timeStart = new Date(realizationTime.getTime() - 300000); // минус 5 минут
      const timeEnd = new Date(realizationTime.getTime() + 300000); // плюс 5 минут

      // Находим товары по времени, у которых нет realization_id
      const { data: items, error: itemsError } = await supabase
        .from('realization_items')
        .select('id, realization_id, created_at')
        .gte('created_at', timeStart.toISOString())
        .lte('created_at', timeEnd.toISOString())
        .is('realization_id', null)
        .limit(100);

      if (itemsError) {
        console.error(`   ❌ Ошибка для реализации ${realization.id}:`, itemsError.message);
        continue;
      }

      if (items && items.length > 0) {
        const itemIds = items.map(item => item.id);

        const { error: updateError } = await supabase
          .from('realization_items')
          .update({ realization_id: realization.id })
          .in('id', itemIds);

        if (updateError) {
          console.error(`   ❌ Ошибка обновления для реализации ${realization.id}:`, updateError.message);
        } else {
          console.log(`   ✅ Реализация ${realization.id}: обновлено ${items.length} товаров`);
          totalRealizationUpdated += items.length;
        }
      }
    }

    console.log(`\n   ✅ Всего обновлено товаров в реализациях: ${totalRealizationUpdated}\n`);

    console.log('=== Готово! ===');
    console.log('Все данные должны отображаться корректно на всех страницах.');

  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
}

addColumnsAndFillData();

