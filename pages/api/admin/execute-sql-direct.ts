import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { sql } = req.body;
    if (!sql) {
      return res.status(400).json({ error: 'SQL запрос не указан' });
    }

    // Выполняем SQL запрос напрямую
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Ошибка выполнения SQL:', error);
      return res.status(500).json({ error: `Ошибка выполнения SQL: ${error.message}` });
    }

    return res.status(200).json({ 
      success: true, 
      data: data,
      message: 'SQL запрос выполнен успешно' 
    });

  } catch (error) {
    console.error('Ошибка API execute-sql-direct:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
