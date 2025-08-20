import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Проверяем подключение к базе данных
      const { data: receipts, error: receiptsError } = await supabaseAdmin
        .from('receipts')
        .select('id, receipt_number')
        .limit(5);

      const { data: realizations, error: realizationsError } = await supabaseAdmin
        .from('realization')
        .select('id, realization_number')
        .limit(5);

      return res.status(200).json({
        success: true,
        receipts: {
          count: receipts?.length || 0,
          error: receiptsError?.message || null,
          data: receipts || []
        },
        realizations: {
          count: realizations?.length || 0,
          error: realizationsError?.message || null,
          data: realizations || []
        }
      });
    } catch (error) {
      console.error('Ошибка тестирования БД:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Ошибка подключения к базе данных',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}
