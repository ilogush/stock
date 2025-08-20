import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Простой запрос без сложной логики
      const { data: receipts, error } = await supabaseAdmin
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Ошибка Supabase:', error);
        return res.status(500).json({ 
          error: 'Ошибка базы данных',
          details: error.message,
          receipts: [],
          pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
        });
      }

      // Упрощенная логика - возвращаем базовые данные
      const enriched = (receipts || []).map((r: any) => ({
        ...r,
        transferrer_name: '—',
        creator_name: '—',
        total_items: 0,
        first_article: '—',
        first_size: '—',
        first_color: '—',
        items: []
      }));

      return res.status(200).json({
        receipts: enriched,
        pagination: {
          total: enriched.length,
          page: 1,
          limit: 20,
          totalPages: 1
        }
      });

    } catch (error: any) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        details: error.message,
        receipts: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
      });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 