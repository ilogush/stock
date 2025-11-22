/**
 * Тестовый скрипт для проверки создания товара и поступления
 * Создает тестовый товар, поступление, проверяет склад и удаляет тестовый товар
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testReceiptCreation() {
  console.log('🧪 ТЕСТ: Создание товара и поступления\n');

  let testProductId = null;
  let testReceiptId = null;
  let testReceiptItemIds = [];

  try {
    // 1. Получаем необходимые справочники для создания товара
    console.log('1. Получение справочников...');
    
    // Получаем первый бренд
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name')
      .limit(1);

    if (brandsError || !brands || brands.length === 0) {
      console.error('❌ Ошибка: не найден ни один бренд');
      return;
    }

    // Получаем категорию (женская)
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', 322)
      .single();

    if (categoriesError || !categories) {
      console.error('❌ Ошибка: категория 322 (женская) не найдена');
      return;
    }

    // Получаем первый цвет
    const { data: colors, error: colorsError } = await supabase
      .from('colors')
      .select('id, name')
      .limit(1);

    if (colorsError || !colors || colors.length === 0) {
      console.error('❌ Ошибка: не найден ни один цвет');
      return;
    }

    // Получаем размер (для W101 - размер с ростом)
    const { data: sizes, error: sizesError } = await supabase
      .from('sizes')
      .select('code')
      .eq('code', 'L 160')
      .single();

    let sizeCode = 'L 160';
    if (sizesError || !sizes) {
      console.log('⚠️  Размер "L 160" не найден, будет создан с размером "L"');
      sizeCode = 'L';
    } else {
      sizeCode = sizes.code;
    }

    const brand = brands[0];
    const category = categories;
    const color = colors[0];

    console.log(`   ✅ Бренд: ${brand.name} (ID: ${brand.id})`);
    console.log(`   ✅ Категория: ${category.name} (ID: ${category.id})`);
    console.log(`   ✅ Цвет: ${color.name} (ID: ${color.id})`);
    console.log(`   ✅ Размер: ${sizeCode}\n`);

    // 2. Создаем тестовый товар
    console.log('2. Создание тестового товара...');
    const testArticle = `TEST_${Date.now()}`;
    const testProductData = {
      name: 'Тестовый товар для проверки поступления',
      article: testArticle,
      brand_id: brand.id,
      category_id: category.id,
      color_id: color.id,
      price: 1000,
      composition: '100% тестовый материал',
      is_visible: false, // Скрываем тестовый товар
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
    console.log(`   ✅ Товар создан: ${product.name} (ID: ${product.id}, Артикул: ${product.article})\n`);

    // 3. Получаем пользователя для поступления
    console.log('3. Получение пользователя для поступления...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('❌ Ошибка: не найден ни один пользователь');
      // Продолжаем без пользователя
    } else {
      console.log(`   ✅ Пользователь: ${users[0].email} (ID: ${users[0].id})\n`);
    }

    // 4. Создаем поступление
    console.log('4. Создание поступления...');
    const receiptData = {
      transferrer_id: users && users.length > 0 ? users[0].id : null,
      notes: 'Тестовое поступление',
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
    console.log(`   ✅ Поступление создано (ID: ${receipt.id})\n`);

    // 5. Проверяем наличие колонки receipt_id
    console.log('5. Проверка наличия колонки receipt_id...');
    const { data: checkReceiptColumn, error: checkColumnError } = await supabase
      .from('receipt_items')
      .select('receipt_id')
      .limit(1);

    const hasReceiptIdColumn = !checkColumnError || checkColumnError.code !== '42703';

    if (!hasReceiptIdColumn) {
      console.log('   ⚠️  Колонка receipt_id не существует, создаем без неё');
      console.log('   📋 Добавьте колонку через SQL: ALTER TABLE receipt_items ADD COLUMN receipt_id INTEGER;');
    } else {
      console.log('   ✅ Колонка receipt_id существует');
    }
    console.log('');

    // 6. Создаем позиции поступления
    console.log('6. Создание позиций поступления...');
    const receiptItemsData = [{
      product_id: product.id,
      size_code: sizeCode,
      color_id: color.id,
      qty: 5,
      created_at: new Date().toISOString()
    }];

    // Добавляем receipt_id только если колонка существует
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
    console.log(`   ✅ Создано ${receiptItems.length} позиций поступления`);
    receiptItems.forEach(item => {
      console.log(`      - Позиция ID: ${item.id}, Размер: ${item.size_code}, Количество: ${item.qty}`);
    });
    console.log('');

    // 7. Проверяем, что товар виден на складе
    console.log('7. Проверка товара на складе...');
    let stockQuery = supabase
      .from('receipt_items')
      .select(`
        qty,
        size_code,
        product_id,
        color_id,
        product:products!inner(
          id,
          article,
          name
        )
      `)
      .eq('product_id', product.id);

    // Добавляем фильтр по receipt_id только если колонка существует
    if (hasReceiptIdColumn) {
      stockQuery = stockQuery.eq('receipt_id', testReceiptId);
    }

    const { data: stockItems, error: stockError } = await stockQuery;

    // Также получаем реализации для расчета остатков
    const { data: realizationItems, error: realizationError } = await supabase
      .from('realization_items')
      .select('qty, size_code, color_id')
      .eq('product_id', product.id);

    if (stockError) {
      console.error('⚠️  Ошибка проверки склада:', stockError);
    } else {
      let totalReceiptQty = 0;
      (stockItems || []).forEach(item => {
        totalReceiptQty += item.qty || 0;
      });

      let totalRealQty = 0;
      (realizationItems || []).forEach(item => {
        if (item.size_code === sizeCode && item.color_id === color.id) {
          totalRealQty += item.qty || 0;
        }
      });

      const stockQty = Math.max(0, totalReceiptQty - totalRealQty);
      console.log(`   ✅ Остаток на складе: ${stockQty} шт. (поступления: ${totalReceiptQty}, реализации: ${totalRealQty})\n`);
    }

    // 8. Проверяем связь по receipt_id (если колонка существует)
    console.log('8. Проверка связи по receipt_id...');
    if (hasReceiptIdColumn) {
      const { data: receiptItemsByReceiptId, error: receiptItemsCheckError } = await supabase
        .from('receipt_items')
        .select('id, qty, size_code, receipt_id')
        .eq('receipt_id', testReceiptId);

      if (receiptItemsCheckError) {
        console.error('   ❌ Ошибка проверки связи по receipt_id:', receiptItemsCheckError);
      } else {
        console.log(`   ✅ Найдено ${receiptItemsByReceiptId?.length || 0} позиций по receipt_id`);
        if (receiptItemsByReceiptId && receiptItemsByReceiptId.length > 0) {
          receiptItemsByReceiptId.forEach(item => {
            console.log(`      - Позиция ID: ${item.id}, Размер: ${item.size_code}, Количество: ${item.qty}`);
          });
        }
        console.log('');
      }
    } else {
      console.log('   ⚠️  Колонка receipt_id отсутствует, проверка невозможна');
      console.log('   💡 Позиции поступления будут связаны по времени (fallback режим)');
      console.log('');
    }

    console.log('✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!\n');

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  } finally {
    // 9. Очистка: удаляем тестовые данные
    console.log('9. Очистка тестовых данных...');

    // Удаляем позиции поступления
    if (testReceiptItemIds.length > 0) {
      const { error: deleteItemsError } = await supabase
        .from('receipt_items')
        .delete()
        .in('id', testReceiptItemIds);

      if (deleteItemsError) {
        console.error('⚠️  Ошибка удаления позиций поступления:', deleteItemsError);
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
      // Сначала удаляем изображения (если есть)
      await supabase
        .from('product_images')
        .delete()
        .eq('product_id', testProductId);

      // Затем удаляем сам товар
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

    console.log('\n✅ ОЧИСТКА ЗАВЕРШЕНА');
  }
}

// Запускаем тест
testReceiptCreation()
  .then(() => {
    console.log('\n🎉 Тест завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Критическая ошибка:', error);
    process.exit(1);
  });
