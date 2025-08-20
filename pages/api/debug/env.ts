import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Проверяем переменные окружения
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'УСТАНОВЛЕНА' : 'ОТСУТСТВУЕТ',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'УСТАНОВЛЕНА' : 'ОТСУТСТВУЕТ',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'УСТАНОВЛЕНА' : 'ОТСУТСТВУЕТ',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'НЕ УСТАНОВЛЕНА'
    };

    // Проверяем подключение к Supabase
    let supabaseConnection = 'НЕ ПРОВЕРЯЕТСЯ';
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );
        
        const { data, error } = await supabaseAdmin.from('users').select('id').limit(1);
        
        if (error) {
          supabaseConnection = `ОШИБКА: ${error.message}`;
        } else {
          supabaseConnection = 'УСПЕШНО';
        }
      } else {
        supabaseConnection = 'НЕВОЗМОЖНО - отсутствуют переменные окружения';
      }
    } catch (error: any) {
      supabaseConnection = `ОШИБКА ПОДКЛЮЧЕНИЯ: ${error.message}`;
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      environment: envCheck,
      supabaseConnection,
      serverInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage()
      }
    });
  } catch (error: any) {
    console.error('Ошибка в API debug/env:', error);
    return res.status(500).json({ 
      error: 'Ошибка проверки окружения',
      message: error.message 
    });
  }
}
