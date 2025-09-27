import { createClient } from '@supabase/supabase-js';

// Проверяем переменные окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: any;

// Проверяем работу supabase admin клиента
async function checkAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return; // Не проверяем если нет переменных окружения
  }
  
  try {
    const { data, error } = await supabaseAdmin.from('users').select('id').limit(1);
    if (error) {
      console.error('Ошибка проверки supabaseAdmin клиента:', error);
    } else {
      // console.log('supabaseAdmin клиент успешно подключен к Supabase'); // Удален для production
    }
  } catch (err) {
    console.error('Ошибка при инициализации supabaseAdmin клиента:', err);
  }
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Переменные окружения Supabase Admin не настроены. Используются заглушки для сборки.');
  
  // Создаем заглушку для сборки
  supabaseAdmin = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
    auth: {
      admin: {
        createUser: () => Promise.resolve({ data: { user: null }, error: null }),
        deleteUser: () => Promise.resolve({ data: null, error: null }),
      }
    }
  };
} else {
  // Клиент с административными правами, используется только на сервере
  supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Запускаем проверку при запуске приложения
  checkAdminClient();
}

export { supabaseAdmin }; 