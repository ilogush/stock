/**
 * Скрипт для проверки ошибок на странице actions
 * Проверяет:
 * 1. Структуру таблицы user_actions
 * 2. Foreign key связи с users
 * 3. Соответствие API и БД
 * 4. Наличие всех необходимых колонок
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkActionsErrors() {
  console.log('🔍 ПРОВЕРКА ОШИБОК НА СТРАНИЦЕ ACTIONS\n');
  console.log('='.repeat(70));

  let errors = [];
  let warnings = [];

  // 1. Проверка структуры таблицы user_actions
  console.log('\n1️⃣ Проверка структуры таблицы user_actions...');
  
  try {
    const { data: actions, error: actionsError } = await supabase
      .from('user_actions')
      .select('*')
      .limit(1);

    if (actionsError) {
      if (actionsError.code === '42P01') {
        errors.push({
          type: 'КРИТИЧЕСКАЯ ОШИБКА',
          message: 'Таблица user_actions не существует',
          details: actionsError.message,
          fix: 'Создайте таблицу user_actions в базе данных'
        });
        console.log('   ❌ Таблица user_actions не существует');
      } else {
        errors.push({
          type: 'ОШИБКА',
          message: 'Ошибка доступа к таблице user_actions',
          details: actionsError.message,
          fix: 'Проверьте права доступа и структуру таблицы'
        });
        console.log('   ❌ Ошибка доступа к таблице:', actionsError.message);
      }
    } else {
      console.log('   ✅ Таблица user_actions существует');
      
      // Проверяем структуру первой записи
      if (actions && actions.length > 0) {
        const action = actions[0];
        const requiredFields = ['id', 'user_id', 'action_name', 'status', 'created_at'];
        const optionalFields = ['details'];
        
        const missingFields = requiredFields.filter(field => !(field in action));
        if (missingFields.length > 0) {
          errors.push({
            type: 'ОШИБКА',
            message: 'Отсутствуют обязательные поля в таблице user_actions',
            details: `Поля: ${missingFields.join(', ')}`,
            fix: 'Добавьте отсутствующие поля в таблицу user_actions'
          });
          console.log(`   ⚠️  Отсутствуют поля: ${missingFields.join(', ')}`);
        } else {
          console.log('   ✅ Все обязательные поля присутствуют');
        }
      }
    }
  } catch (error) {
    errors.push({
      type: 'КРИТИЧЕСКАЯ ОШИБКА',
      message: 'Ошибка проверки таблицы user_actions',
      details: error.message,
      fix: 'Проверьте подключение к базе данных'
    });
    console.log('   ❌ Ошибка проверки:', error.message);
  }

  // 2. Проверка foreign key связи с users
  console.log('\n2️⃣ Проверка связи user_actions → users...');
  
  try {
    const { data: actionsWithUsers, error: joinError } = await supabase
      .from('user_actions')
      .select(`
        id,
        user_id,
        action_name,
        user:users!user_actions_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .limit(5);

    if (joinError) {
      if (joinError.code === '42703' || joinError.message?.includes('user_actions_user_id_fkey')) {
        warnings.push({
          type: 'ПРЕДУПРЕЖДЕНИЕ',
          message: 'Foreign key user_actions_user_id_fkey не настроен',
          details: joinError.message,
          fix: 'Добавьте foreign key constraint или используйте другой способ связи'
        });
        console.log('   ⚠️  Foreign key не настроен (не критично)');
      } else {
        errors.push({
          type: 'ОШИБКА',
          message: 'Ошибка связи с таблицей users',
          details: joinError.message,
          fix: 'Проверьте структуру foreign key связи'
        });
        console.log('   ❌ Ошибка связи с users:', joinError.message);
      }
    } else {
      // Проверяем наличие "сиротских" записей
      const orphanedActions = actionsWithUsers?.filter(action => !action.user) || [];
      if (orphanedActions.length > 0) {
        warnings.push({
          type: 'ПРЕДУПРЕЖДЕНИЕ',
          message: 'Найдены действия с несуществующими пользователями',
          details: `${orphanedActions.length} записей с user_id, которых нет в users`,
          fix: 'Удалите или исправьте записи с несуществующими user_id'
        });
        console.log(`   ⚠️  Найдено ${orphanedActions.length} действий с несуществующими пользователями`);
      } else {
        console.log('   ✅ Связь с users работает корректно');
      }
    }
  } catch (error) {
    console.log('   ⚠️  Ошибка проверки связи:', error.message);
  }

  // 3. Проверка данных на наличие ошибок
  console.log('\n3️⃣ Проверка данных на наличие проблем...');
  
  try {
    // Проверка на NULL в обязательных полях
    const { data: nullUserIds, error: nullError } = await supabase
      .from('user_actions')
      .select('id, user_id, action_name')
      .is('user_id', null)
      .limit(10);

    if (!nullError && nullUserIds && nullUserIds.length > 0) {
      warnings.push({
        type: 'ПРЕДУПРЕЖДЕНИЕ',
        message: 'Найдены действия с NULL user_id',
        details: `${nullUserIds.length} записей без указания пользователя`,
        fix: 'Исправьте или удалите записи с NULL user_id'
      });
      console.log(`   ⚠️  Найдено ${nullUserIds.length} действий с NULL user_id`);
    } else {
      console.log('   ✅ Все действия имеют user_id');
    }

    // Проверка на пустые action_name
    const { data: emptyActions, error: emptyError } = await supabase
      .from('user_actions')
      .select('id, action_name')
      .or('action_name.is.null,action_name.eq.')
      .limit(10);

    if (!emptyError && emptyActions && emptyActions.length > 0) {
      warnings.push({
        type: 'ПРЕДУПРЕЖДЕНИЕ',
        message: 'Найдены действия с пустым action_name',
        details: `${emptyActions.length} записей без названия действия`,
        fix: 'Заполните action_name для всех записей'
      });
      console.log(`   ⚠️  Найдено ${emptyActions.length} действий с пустым action_name`);
    } else {
      console.log('   ✅ Все действия имеют названия');
    }

    // Проверка на невалидные статусы
    const validStatuses = ['success', 'error', 'warning', 'info'];
    const { data: allActions, error: allError } = await supabase
      .from('user_actions')
      .select('id, status')
      .limit(100);

    if (!allError && allActions) {
      const invalidStatuses = allActions.filter(
        action => action.status && !validStatuses.includes(action.status)
      );
      
      if (invalidStatuses.length > 0) {
        warnings.push({
          type: 'ПРЕДУПРЕЖДЕНИЕ',
          message: 'Найдены действия с невалидными статусами',
          details: `${invalidStatuses.length} записей со статусами, не входящими в: ${validStatuses.join(', ')}`,
          fix: 'Исправьте статусы на валидные значения'
        });
        console.log(`   ⚠️  Найдено ${invalidStatuses.length} действий с невалидными статусами`);
      } else {
        console.log('   ✅ Все статусы валидны');
      }
    }

  } catch (error) {
    console.log('   ⚠️  Ошибка проверки данных:', error.message);
  }

  // 4. Проверка соответствия API и БД
  console.log('\n4️⃣ Проверка соответствия API и БД...');
  
  try {
    // Проверяем, что API возвращает ожидаемую структуру
    const testResponse = await fetch('http://localhost:3000/api/actions?limit=1');
    if (testResponse.ok) {
      const testData = await testResponse.json();
      
      if (!testData.actions) {
        errors.push({
          type: 'ОШИБКА',
          message: 'API не возвращает поле actions',
          details: 'API должен возвращать { actions: [...], pagination: {...} }',
          fix: 'Исправьте структуру ответа API'
        });
        console.log('   ❌ API не возвращает поле actions');
      } else {
        console.log('   ✅ API возвращает корректную структуру');
      }

      if (!testData.pagination) {
        warnings.push({
          type: 'ПРЕДУПРЕЖДЕНИЕ',
          message: 'API не возвращает поле pagination',
          details: 'Рекомендуется добавлять информацию о пагинации',
          fix: 'Добавьте поле pagination в ответ API'
        });
        console.log('   ⚠️  API не возвращает pagination');
      } else {
        console.log('   ✅ API возвращает информацию о пагинации');
      }
    } else {
      warnings.push({
        type: 'ПРЕДУПРЕЖДЕНИЕ',
        message: 'Не удалось проверить API (сервер может быть не запущен)',
        details: 'Проверьте, что сервер работает на localhost:3000',
        fix: 'Запустите сервер: npm run dev'
      });
      console.log('   ⚠️  Не удалось проверить API (сервер не запущен?)');
    }
  } catch (error) {
    warnings.push({
      type: 'ПРЕДУПРЕЖДЕНИЕ',
      message: 'Не удалось проверить API',
      details: error.message,
      fix: 'Убедитесь, что сервер запущен'
    });
    console.log('   ⚠️  Ошибка проверки API:', error.message);
  }

  // Итоговый отчет
  console.log('\n' + '='.repeat(70));
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ');
  console.log('='.repeat(70));

  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ Критических ошибок не найдено!');
    console.log('✅ Страница actions должна работать корректно');
  } else {
    if (errors.length > 0) {
      console.log(`\n❌ Найдено критических ошибок: ${errors.length}`);
      errors.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.type}: ${error.message}`);
        console.log(`   Детали: ${error.details}`);
        console.log(`   Исправление: ${error.fix}`);
      });
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  Найдено предупреждений: ${warnings.length}`);
      warnings.forEach((warning, index) => {
        console.log(`\n${index + 1}. ${warning.type}: ${warning.message}`);
        console.log(`   Детали: ${warning.details}`);
        console.log(`   Рекомендация: ${warning.fix}`);
      });
    }
  }

  // Сохраняем отчет в файл
  const report = {
    timestamp: new Date().toISOString(),
    errors,
    warnings,
    summary: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      status: errors.length === 0 ? 'OK' : 'ERROR'
    }
  };

  console.log('\n' + '='.repeat(70));
  console.log('✅ ПРОВЕРКА ЗАВЕРШЕНА');
  console.log('='.repeat(70));
  console.log(`\n📄 Полный отчет сохранен в: scripts/actions-errors-report.json`);

  return report;
}

checkActionsErrors()
  .then(report => {
    const fs = require('fs');
    fs.writeFileSync(
      'scripts/actions-errors-report.json',
      JSON.stringify(report, null, 2)
    );
    process.exit(report.summary.status === 'OK' ? 0 : 1);
  })
  .catch(console.error);


