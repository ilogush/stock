import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { queries } = req.body;
    if (!queries || !Array.isArray(queries)) {
      return res.status(400).json({ error: 'Массив SQL запросов не указан' });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      try {
        console.log(`Выполняем запрос ${i + 1}/${queries.length}: ${query.substring(0, 50)}...`);
        
        const { data, error } = await supabaseAdmin.from('receipts').insert(
          // Здесь будет динамический запрос
          eval(`(${query})`)
        );

        if (error) {
          console.error(`Ошибка в запросе ${i + 1}:`, error);
          results.push({ index: i, success: false, error: error.message });
          errorCount++;
        } else {
          console.log(`Запрос ${i + 1} выполнен успешно`);
          results.push({ index: i, success: true, data });
          successCount++;
        }
      } catch (error) {
        console.error(`Ошибка выполнения запроса ${i + 1}:`, error);
        results.push({ index: i, success: false, error: error.message });
        errorCount++;
      }
    }

    return res.status(200).json({ 
      success: true, 
      results,
      summary: {
        total: queries.length,
        success: successCount,
        errors: errorCount
      },
      message: `Выполнено ${successCount} из ${queries.length} запросов` 
    });

  } catch (error) {
    console.error('Ошибка API execute-sql-batch:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
