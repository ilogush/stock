import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Проверяем подключение к Supabase
    let supabaseStatus = 'unknown';
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
          supabaseStatus = `error: ${error.message}`;
        } else {
          supabaseStatus = 'connected';
        }
      } else {
        supabaseStatus = 'no_env_vars';
      }
    } catch (error: any) {
      supabaseStatus = `connection_error: ${error.message}`;
    }

    return res.status(200).json({
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      supabaseStatus,
      envVars: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      buildTime: process.env.BUILD_TIME || 'unknown'
    });
  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Ошибка проверки версии',
      message: error.message 
    });
  }
}
