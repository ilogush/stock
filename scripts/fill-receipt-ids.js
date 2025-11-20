/**
 * Скрипт для заполнения receipt_id в receipt_items
 * Запускать после добавления колонки receipt_id в таблицу
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fillReceiptIds() {
  console.log('=== Заполнение receipt_id для всех поступлений ===\n');

  try {
    // Получаем все поступления
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('id, created_at')
      .order('id');

    if (receiptsError) {
      console.error('Ошибка получения поступлений:', receiptsError);
      return;
    }

    console.log(`Найдено поступлений: ${receipts?.length || 0}\n`);

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
        console.error(`Ошибка для поступления ${receipt.id}:`, itemsError.message);
        continue;
      }

      if (items && items.length > 0) {
        const itemIds = items.map(item => item.id);

        const { error: updateError } = await supabase
          .from('receipt_items')
          .update({ receipt_id: receipt.id })
          .in('id', itemIds);

        if (updateError) {
          console.error(`Ошибка обновления для поступления ${receipt.id}:`, updateError.message);
        } else {
          console.log(`✅ Поступление ${receipt.id}: обновлено ${items.length} товаров`);
          totalUpdated += items.length;
        }
      }
    }

    console.log(`\n✅ Всего обновлено товаров: ${totalUpdated}`);
  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
}

fillReceiptIds();

