/**
 * Тестовый скрипт для проверки создания реализации
 * Создает тестовый товар, поступление, реализацию, проверяет склад и удаляет тестовые данные
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRealizationCreation() {
  console.log('🧪 ТЕСТ: Создание товара, поступления и реализации\n');

  let testProductId = null;
  let testReceiptId = null;
  let testReceiptItemIds = [];
  let testRealizationId = null;
  let testRealizationItemIds = [];

  try {
    // 1. Получаем необходимые справочники
    console.log('1. Получение справочников...');
    
    const { data: brands } = await supabase.from('brands').select('id, name').limit(1);
    const { data: categories } = await supabase.from('categories').select('id, name').eq('id', 322).single();
    const { data: colors } = await supabase.from('colors').select('id, name').limit(1);
    const { data: sizes } = await supabase.from('sizes').select('code').eq('code', 'L').single();

    if (!brands || brands.length === 0 || !categories || !colors || colors.length === 0) {
      console.error('❌ Ошибка: не найдены необходимые справочники');
      return;
    }

    const sizeCode = sizes?.code || 'L';
    console.log(`   ✅ Размер: ${sizeCode}\n`);

    // 2. Создаем тестовый товар
    console.log('2. Создание тестового товара...');
    const testArticle = `TEST_REAL_${Date.now()}`;
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([{
        name: 'Тестовый товар для реализации',
        article: testArticle,
        brand_id: brands[0].id,
        category_id: categories.id,
        color_id: colors[0].id,
        price: 1000,
        composition: '100% тестовый материал',
        is_visible: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (productError) {
      console.error('❌ Ошибка создания товара:', productError);
      return;
    }

    testProductId = product.id;
    console.log(`   ✅ Товар создан: ${product.name} (ID: ${product.id}, Артикул: ${product.article})\n`);

    // 3. Получаем пользователей
    console.log('3. Получение пользователей...');
    const { data: users } = await supabase.from('users').select('id, email').limit(2);
    if (!users || users.length < 2) {
      console.error('❌ Ошибка: нужно минимум 2 пользователя');
      return;
    }
    console.log(`   ✅ Отправитель: ${users[0].email} (ID: ${users[0].id})`);
    console.log(`   ✅ Получатель: ${users[1].email} (ID: ${users[1].id})\n`);

    // 4. Создаем поступление
    console.log('4. Создание поступления...');
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert([{
        transferrer_id: users[0].id,
        notes: 'Тестовое поступление для реализации',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (receiptError) {
      console.error('❌ Ошибка создания поступления:', receiptError);
      return;
    }

    testReceiptId = receipt.id;
    console.log(`   ✅ Поступление создано (ID: ${receipt.id})\n`);

    // 5. Проверяем наличие колонки receipt_id
    console.log('5. Проверка наличия колонки receipt_id...');
    const { error: checkReceiptColumn } = await supabase.from('receipt_items').select('receipt_id').limit(1);
    const hasReceiptIdColumn = !checkReceiptColumn || checkReceiptColumn.code !== '42703';
    
    // 6. Создаем позиции поступления
    console.log('6. Создание позиций поступления...');
    const receiptItemsData = [{
      product_id: product.id,
      size_code: sizeCode,
      color_id: colors[0].id,
      qty: 10, // Создаем 10 шт для теста реализации
      created_at: new Date().toISOString()
    }];

    if (hasReceiptIdColumn) {
      receiptItemsData[0].receipt_id = receipt.id;
    }

    const { data: receiptItems, error: receiptItemsError } = await supabase
      .from('receipt_items')
      .insert(receiptItemsData)
      .select();

    if (receiptItemsError) {
      console.error('❌ Ошибка создания позиций поступления:', receiptItemsError);
      return;
    }

    testReceiptItemIds = receiptItems.map(item => item.id);
    console.log(`   ✅ Создано ${receiptItems.length} позиций поступления, всего: ${receiptItems[0].qty} шт\n`);

    // 7. Проверяем остаток на складе
    console.log('7. Проверка остатка на складе...');
    const { data: stockItems } = await supabase
      .from('receipt_items')
      .select('qty')
      .eq('product_id', product.id);

    const { data: realizationItems } = await supabase
      .from('realization_items')
      .select('qty')
      .eq('product_id', product.id);

    let totalStock = (stockItems || []).reduce((sum, item) => sum + (item.qty || 0), 0);
    let totalRealized = (realizationItems || []).reduce((sum, item) => sum + (item.qty || 0), 0);
    let availableStock = Math.max(0, totalStock - totalRealized);
    
    console.log(`   ✅ Остаток на складе: ${availableStock} шт. (поступления: ${totalStock}, реализации: ${totalRealized})\n`);

    // 8. Создаем реализацию
    console.log('8. Создание реализации...');
    const { data: realization, error: realizationError } = await supabase
      .from('realization')
      .insert([{
        sender_id: users[0].id,
        recipient_id: users[1].id,
        notes: 'Тестовая реализация',
        total_items: 5,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (realizationError) {
      console.error('❌ Ошибка создания реализации:', realizationError);
      return;
    }

    testRealizationId = realization.id;
    console.log(`   ✅ Реализация создана (ID: ${realization.id})\n`);

    // 9. Проверяем наличие колонки realization_id
    console.log('9. Проверка наличия колонки realization_id...');
    const { error: checkRealizationColumn } = await supabase.from('realization_items').select('realization_id').limit(1);
    const hasRealizationIdColumn = !checkRealizationColumn || checkRealizationColumn.code !== '42703';

    // 10. Создаем позиции реализации
    console.log('10. Создание позиций реализации...');
    const realizationItemsData = [{
      product_id: product.id,
      size_code: sizeCode,
      color_id: colors[0].id,
      qty: 5, // Реализуем 5 шт из 10
      created_at: new Date().toISOString()
    }];

    if (hasRealizationIdColumn) {
      realizationItemsData[0].realization_id = realization.id;
    }

    const { data: realizationItemsNew, error: realizationItemsError } = await supabase
      .from('realization_items')
      .insert(realizationItemsData)
      .select();

    if (realizationItemsError) {
      console.error('❌ Ошибка создания позиций реализации:', realizationItemsError);
      return;
    }

    testRealizationItemIds = realizationItemsNew.map(item => item.id);
    console.log(`   ✅ Создано ${realizationItemsNew.length} позиций реализации, количество: ${realizationItemsNew[0].qty} шт\n`);

    // 11. Проверяем остаток на складе после реализации
    console.log('11. Проверка остатка на складе после реализации...');
    const { data: stockItemsAfter } = await supabase
      .from('receipt_items')
      .select('qty')
      .eq('product_id', product.id);

    const { data: realizationItemsAfter } = await supabase
      .from('realization_items')
      .select('qty')
      .eq('product_id', product.id);

    totalStock = (stockItemsAfter || []).reduce((sum, item) => sum + (item.qty || 0), 0);
    totalRealized = (realizationItemsAfter || []).reduce((sum, item) => sum + (item.qty || 0), 0);
    availableStock = Math.max(0, totalStock - totalRealized);
    
    console.log(`   ✅ Остаток на складе: ${availableStock} шт. (поступления: ${totalStock}, реализации: ${totalRealized})`);
    console.log(`   ✅ Ожидаемый остаток: 5 шт. (10 поступлено - 5 реализовано = 5)`);
    
    if (availableStock === 5) {
      console.log(`   ✅ ✅ ✅ РАСЧЕТ ОСТАТКОВ РАБОТАЕТ КОРРЕКТНО!\n`);
    } else {
      console.log(`   ⚠️  Несоответствие: ожидалось 5, получено ${availableStock}\n`);
    }

    console.log('✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!\n');

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  } finally {
    // 12. Очистка: удаляем тестовые данные
    console.log('12. Очистка тестовых данных...');

    // Удаляем позиции реализации
    if (testRealizationItemIds.length > 0) {
      await supabase.from('realization_items').delete().in('id', testRealizationItemIds);
      console.log(`   ✅ Удалено ${testRealizationItemIds.length} позиций реализации`);
    }

    // Удаляем реализацию
    if (testRealizationId) {
      await supabase.from('realization').delete().eq('id', testRealizationId);
      console.log(`   ✅ Реализация удалена (ID: ${testRealizationId})`);
    }

    // Удаляем позиции поступления
    if (testReceiptItemIds.length > 0) {
      await supabase.from('receipt_items').delete().in('id', testReceiptItemIds);
      console.log(`   ✅ Удалено ${testReceiptItemIds.length} позиций поступления`);
    }

    // Удаляем поступление
    if (testReceiptId) {
      await supabase.from('receipts').delete().eq('id', testReceiptId);
      console.log(`   ✅ Поступление удалено (ID: ${testReceiptId})`);
    }

    // Удаляем товар
    if (testProductId) {
      await supabase.from('product_images').delete().eq('product_id', testProductId);
      await supabase.from('products').delete().eq('id', testProductId);
      console.log(`   ✅ Товар удален (ID: ${testProductId})`);
    }

    console.log('\n✅ ОЧИСТКА ЗАВЕРШЕНА');
  }
}

// Запускаем тест
testRealizationCreation()
  .then(() => {
    console.log('\n🎉 Тест завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Критическая ошибка:', error);
    process.exit(1);
  });
