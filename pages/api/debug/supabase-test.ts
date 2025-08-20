import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Тест 1: Проверка подключения к users
    try {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .limit(1);
      
      results.tests.users = {
        success: !usersError,
        error: usersError?.message,
        count: users?.length || 0
      };
    } catch (error: any) {
      results.tests.users = {
        success: false,
        error: error.message
      };
    }

    // Тест 2: Проверка подключения к receipts
    try {
      const { data: receipts, error: receiptsError } = await supabaseAdmin
        .from('receipts')
        .select('id, receipt_number')
        .limit(1);
      
      results.tests.receipts = {
        success: !receiptsError,
        error: receiptsError?.message,
        count: receipts?.length || 0
      };
    } catch (error: any) {
      results.tests.receipts = {
        success: false,
        error: error.message
      };
    }

    // Тест 3: Проверка подключения к realization
    try {
      const { data: realizations, error: realizationsError } = await supabaseAdmin
        .from('realization')
        .select('id, realization_number')
        .limit(1);
      
      results.tests.realization = {
        success: !realizationsError,
        error: realizationsError?.message,
        count: realizations?.length || 0
      };
    } catch (error: any) {
      results.tests.realization = {
        success: false,
        error: error.message
      };
    }

    // Тест 4: Проверка RLS политик
    try {
      const { data: rlsTest, error: rlsError } = await supabaseAdmin
        .from('receipts')
        .select('*')
        .limit(5);
      
      results.tests.rls = {
        success: !rlsError,
        error: rlsError?.message,
        count: rlsTest?.length || 0
      };
    } catch (error: any) {
      results.tests.rls = {
        success: false,
        error: error.message
      };
    }

    return res.status(200).json(results);

  } catch (error: any) {
    console.error('Ошибка в API supabase-test:', error);
    return res.status(500).json({ 
      error: 'Ошибка тестирования Supabase',
      message: error.message 
    });
  }
}
