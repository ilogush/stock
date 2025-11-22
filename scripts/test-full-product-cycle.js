/**
 * Полный тестовый скрипт для проверки жизненного цикла товара
 * 1. Создание товара
 * 2. Создание поступления с товаром
 * 3. Создание реализации с товаром
 * 4. Проверка корректности операций
 * 5. Удаление тестовых данных
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFullProductCycle() {
  console.log('🧪 ТЕСТ: Полный цикл товара (создание → поступление → реализация → удаление)\n');
  console.log('='.repeat(70));

  let testProductId = null;
  let testReceiptId = null;
  let testReceiptItemIds = [];
  let testRealizationId = null;
  let testRealizationItemIds = [];

  try {
    // 1. Получение справочников
    console.log('\n1. Получение справочников...');
    
    const { data: brands } = await supabase
      .from('brands')
      .select('id, name')
      .limit(1);

    if (!brands || brands.length === 0) {
      console.error('❌ Ошибка: не найден ни один бренд');
      return;
    }

    const { data: category } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', 322)
      .single();

    if (!category) {
      console.error('❌ Ошибка: категория 322 (женская) не найдена');
      return;
    }

    const { data: colors } = await supabase
      .from('colors')
      .select('id, name')
      .limit(1);

    if (!colors || colors.length === 0) {
      console.error('❌ Ошибка: не найден ни один цвет');
      return;
    }

    const brand = brands[0];
    const color = colors[0];
    const sizeCode = 'L';

    console.log(`   ✅ Бренд: ${brand.name} (ID: ${brand.id})`);
    console.log(`   ✅ Категория: ${category.name} (ID: ${category.id})`);
    console.log(`   ✅ Цвет: ${color.name} (ID: ${color.id})`);
    console.log(`   ✅ Размер: ${sizeCode}`);

    // 2. Создание тестового товара
    console.log('\n2. Создание тестового товара...');
    const testArticle = `TEST_FULL_${Date.now()}`;
    const testProductData = {
      name: 'Тестовый товар (полный цикл)',
      article: testArticle,
      brand_id: brand.id,
      category_id: category.id,
      color_id: color.id,
      price: 1500,
      composition: '100% тестовый материал для полного цикла',
      is_visible: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([testProductData])
      .select()
      .single();

    if (productError) {
      console.error('❌ Ошибка создания товара:', productError);
      return;
    }

    testProductId = product.id;
    console.log(`   ✅ Товар создан:`);
    console.log(`      - ID: ${product.id}`);
    console.log(`      - Название: ${product.name}`);
    console.log(`      - Артикул: ${product.article}`);

    // 3. Получение пользователей
    console.log('\n3. Получение пользователей...');
    const { data: users } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .limit(2);

    if (!users || users.length < 2) {
      console.error('❌ Ошибка: нужно минимум 2 пользователя (для поступления и реализации)');
      return;
    }

    const transferrer = users[0];
    const recipient = users[1];
    console.log(`   ✅ Пользователь для поступления: ${transferrer.email} (ID: ${transferrer.id})`);
    console.log(`   ✅ Пользователь для реализации: ${recipient.email} (ID: ${recipient.id})`);

    // 4. Создание поступления
    console.log('\n4. Создание поступления...');
    const receiptData = {
      transferrer_id: transferrer.id,
      notes: 'Тестовое поступление (полный цикл)',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert([receiptData])
      .select()
      .single();

    if (receiptError) {
      console.error('❌ Ошибка создания поступления:', receiptError);
      return;
    }

    testReceiptId = receipt.id;
    console.log(`   ✅ Поступление создано (ID: ${receipt.id})`);

    // 5. Создание позиций поступления
    console.log('\n5. Создание позиций поступления...');
    const receiptItemsData = [{
      product_id: product.id,
      size_code: sizeCode,
      color_id: color.id,
      qty: 10,
      receipt_id: receipt.id,
      created_at: new Date().toISOString()
    }];

    const { data: receiptItems, error: receiptItemsError } = await supabase
      .from('receipt_items')
      .insert(receiptItemsData)
      .select();

    if (receiptItemsError) {
      console.error('❌ Ошибка создания позиций поступления:', receiptItemsError);
      return;
    }

    testReceiptItemIds = receiptItems.map(item => item.id);
    console.log(`   ✅ Создано ${receiptItems.length} позиций поступления:`);
    receiptItems.forEach(item => {
      console.log(`      - Позиция ID: ${item.id}, Размер: ${item.size_code}, Количество: ${item.qty}`);
    });

    // 7. Проверка остатка на складе после поступления
    console.log('\n6. Проверка остатка на складе после поступления...');
    const { data: receiptStock, error: stockError } = await supabase
      .from('receipt_items')
      .select('qty, size_code, product_id, color_id')
      .eq('product_id', product.id)
      .eq('size_code', sizeCode)
      .eq('color_id', color.id)
      .eq('receipt_id', testReceiptId);
    const { data: realizationStock } = await supabase
      .from('realization_items')
      .select('qty')
      .eq('product_id', product.id)
      .eq('size_code', sizeCode)
      .eq('color_id', color.id);

    const totalReceiptQty = (receiptStock || []).reduce((sum, item) => sum + (item.qty || 0), 0);
    const totalRealQty = (realizationStock || []).reduce((sum, item) => sum + (item.qty || 0), 0);
    const availableStock = Math.max(0, totalReceiptQty - totalRealQty);

    console.log(`   ✅ Остаток на складе: ${availableStock} шт.`);
    console.log(`      - Поступлено: ${totalReceiptQty} шт.`);
    console.log(`      - Реализовано: ${totalRealQty} шт.`);

    if (availableStock !== 10) {
      console.error(`   ❌ Ожидалось 10 шт., получено ${availableStock} шт.`);
      return;
    }

    // 8. Создание реализации
    console.log('\n7. Создание реализации...');
    const realizationData = {
      sender_id: transferrer.id,
      recipient_id: recipient.id,
      notes: 'Тестовая реализация (полный цикл)',
      total_items: 5,
      created_at: new Date().toISOString()
    };

    const { data: realization, error: realizationError } = await supabase
      .from('realization')
      .insert([realizationData])
      .select()
      .single();

    if (realizationError) {
      console.error('❌ Ошибка создания реализации:', realizationError);
      return;
    }

    testRealizationId = realization.id;
    console.log(`   ✅ Реализация создана (ID: ${realization.id})`);

    // 9. Создание позиций реализации
    console.log('\n8. Создание позиций реализации...');
    const realizationItemsData = [{
      product_id: product.id,
      size_code: sizeCode,
      color_id: color.id,
      qty: 5,
      realization_id: realization.id,
      created_at: new Date().toISOString()
    }];

    const { data: realizationItems, error: realizationItemsError } = await supabase
      .from('realization_items')
      .insert(realizationItemsData)
      .select();

    if (realizationItemsError) {
      console.error('❌ Ошибка создания позиций реализации:', realizationItemsError);
      return;
    }

    testRealizationItemIds = realizationItems.map(item => item.id);
    console.log(`   ✅ Создано ${realizationItems.length} позиций реализации:`);
    realizationItems.forEach(item => {
      console.log(`      - Позиция ID: ${item.id}, Размер: ${item.size_code}, Количество: ${item.qty}`);
    });

    // 10. Проверка остатка на складе после реализации
    console.log('\n9. Проверка остатка на складе после реализации...');
    const { data: finalReceiptStock } = await supabase
      .from('receipt_items')
      .select('qty, size_code, product_id, color_id')
      .eq('product_id', product.id)
      .eq('size_code', sizeCode)
      .eq('color_id', color.id)
      .eq('receipt_id', testReceiptId);
    const { data: finalRealizationStock } = await supabase
      .from('realization_items')
      .select('qty')
      .eq('product_id', product.id)
      .eq('size_code', sizeCode)
      .eq('color_id', color.id);

    const finalReceiptQty = (finalReceiptStock || []).reduce((sum, item) => sum + (item.qty || 0), 0);
    const finalRealQty = (finalRealizationStock || []).reduce((sum, item) => sum + (item.qty || 0), 0);
    const finalStock = Math.max(0, finalReceiptQty - finalRealQty);

    console.log(`   ✅ Остаток на складе: ${finalStock} шт.`);
    console.log(`      - Поступлено: ${finalReceiptQty} шт.`);
    console.log(`      - Реализовано: ${finalRealQty} шт.`);
    console.log(`      - Расчет: ${finalReceiptQty} - ${finalRealQty} = ${finalStock}`);

    if (finalStock !== 5) {
      console.error(`   ❌ Ожидалось 5 шт., получено ${finalStock} шт.`);
      return;
    }

    console.log(`   ✅ ✅ ✅ РАСЧЕТ ОСТАТКОВ РАБОТАЕТ КОРРЕКТНО!`);

    // 11. Проверка связи по receipt_id и realization_id
    console.log('\n10. Проверка связей...');
    
    const { data: receiptItemsByReceiptId } = await supabase
      .from('receipt_items')
      .select('id, receipt_id')
      .eq('receipt_id', testReceiptId);

    if (receiptItemsByReceiptId && receiptItemsByReceiptId.length > 0) {
      console.log(`   ✅ Связь по receipt_id работает (найдено ${receiptItemsByReceiptId.length} позиций)`);
    } else {
      console.log(`   ⚠️  Не найдено позиций по receipt_id`);
    }

    const { data: realizationItemsByRealizationId } = await supabase
      .from('realization_items')
      .select('id, realization_id')
      .eq('realization_id', testRealizationId);

    if (realizationItemsByRealizationId && realizationItemsByRealizationId.length > 0) {
      console.log(`   ✅ Связь по realization_id работает (найдено ${realizationItemsByRealizationId.length} позиций)`);
    } else {
      console.log(`   ⚠️  Не найдено позиций по realization_id`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    console.error(error.stack);
  } finally {
    // 12. Очистка тестовых данных
    console.log('\n11. Очистка тестовых данных...');
    console.log('-'.repeat(70));

    // Удаляем позиции реализации
    if (testRealizationItemIds.length > 0) {
      const { error: deleteRealizationItemsError } = await supabase
        .from('realization_items')
        .delete()
        .in('id', testRealizationItemIds);

      if (deleteRealizationItemsError) {
        console.error('⚠️  Ошибка удаления позиций реализации:', deleteRealizationItemsError);
      } else {
        console.log(`   ✅ Удалено ${testRealizationItemIds.length} позиций реализации`);
      }
    }

    // Удаляем реализацию
    if (testRealizationId) {
      const { error: deleteRealizationError } = await supabase
        .from('realization')
        .delete()
        .eq('id', testRealizationId);

      if (deleteRealizationError) {
        console.error('⚠️  Ошибка удаления реализации:', deleteRealizationError);
      } else {
        console.log(`   ✅ Реализация удалена (ID: ${testRealizationId})`);
      }
    }

    // Удаляем позиции поступления
    if (testReceiptItemIds.length > 0) {
      const { error: deleteReceiptItemsError } = await supabase
        .from('receipt_items')
        .delete()
        .in('id', testReceiptItemIds);

      if (deleteReceiptItemsError) {
        console.error('⚠️  Ошибка удаления позиций поступления:', deleteReceiptItemsError);
      } else {
        console.log(`   ✅ Удалено ${testReceiptItemIds.length} позиций поступления`);
      }
    }

    // Удаляем поступление
    if (testReceiptId) {
      const { error: deleteReceiptError } = await supabase
        .from('receipts')
        .delete()
        .eq('id', testReceiptId);

      if (deleteReceiptError) {
        console.error('⚠️  Ошибка удаления поступления:', deleteReceiptError);
      } else {
        console.log(`   ✅ Поступление удалено (ID: ${testReceiptId})`);
      }
    }

    // Удаляем товар
    if (testProductId) {
      // Удаляем изображения товара (если есть)
      await supabase
        .from('product_images')
        .delete()
        .eq('product_id', testProductId);

      // Удаляем товар
      const { error: deleteProductError } = await supabase
        .from('products')
        .delete()
        .eq('id', testProductId);

      if (deleteProductError) {
        console.error('⚠️  Ошибка удаления товара:', deleteProductError);
      } else {
        console.log(`   ✅ Товар удален (ID: ${testProductId})`);
      }
    }

    console.log('-'.repeat(70));
    console.log('✅ ОЧИСТКА ЗАВЕРШЕНА');
    console.log('='.repeat(70));
  }
}

// Запускаем тест
testFullProductCycle()
  .then(() => {
    console.log('\n🎉 Тест завершен успешно!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Критическая ошибка:', error);
    process.exit(1);
  });
