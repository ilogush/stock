import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ - данные загружаются в реальном времени
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      
      const { limit = '20', offset = '0', page = '1', search } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offsetNum = (pageNum - 1) * limitNum;
      const searchQuery = search as string;

      // Если есть поисковый запрос, получаем все поступления для фильтрации
      let receiptsRaw: any[] = [];
      let count = 0;

      if (searchQuery && searchQuery.trim()) {
        // Получаем все поступления для поиска
        const { data: allReceipts, error: allError } = await supabaseAdmin
          .from('receipts')
          .select('*')
          .order('created_at', { ascending: false });

        if (allError) {
          console.error('Ошибка при получении всех поступлений:', allError);
          return res.status(500).json({ error: 'Ошибка при получении поступлений' });
        }

        receiptsRaw = allReceipts || [];
      } else {
        // Обычный запрос с пагинацией
        const { data: receipts, error, count: totalCount } = await supabaseAdmin
          .from('receipts')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offsetNum, offsetNum + limitNum - 1);

        if (error) {
          console.error('Ошибка при получении поступлений:', error);
          return res.status(500).json({ error: 'Ошибка при получении поступлений' });
        }

        receiptsRaw = receipts || [];
        count = totalCount || 0;
             }

      const receipts = receiptsRaw || [];

      // Собираем id пользователей для пакетного запроса
      const userIds = Array.from(new Set(receipts.flatMap((r:any)=>[r.transferrer_id, r.creator_id]).filter(Boolean)));
      let usersMap: Record<string, any> = {};
      if (userIds.length) {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds);
        usersMap = Object.fromEntries((users||[]).map((u:any)=>[u.id,u]));
      }

      // Получаем total_items для поступлений
      let totalMap: Record<string, number> = {};
      if (receipts.length > 0) {
        const { data: totals } = await supabaseAdmin
          .from('receipt_items')
          .select('receipt_id, qty')
          .in('receipt_id', receipts.map((r:any)=>r.id));
        (totals||[]).forEach((t:any)=>{
          totalMap[t.receipt_id] = (totalMap[t.receipt_id]||0)+ t.qty;
        });
      }

      // Детали строк для отображения в списке (артикул/размер/цвет)
      let itemDetails: any[] = [];
      if (receipts.length > 0) {
        const { data: details } = await supabaseAdmin
          .from('receipt_items')
          .select('receipt_id, product_id, size_code, color_id, qty')
          .in('receipt_id', receipts.map((r:any)=>r.id));
        itemDetails = details || [];
      }

      // Собираем уникальные ids/codes для справочников
      const productIds = Array.from(new Set((itemDetails||[]).map((it:any)=>it.product_id)));
      const sizeCodes = Array.from(new Set((itemDetails||[]).map((it:any)=>it.size_code)));
              const colorIds = Array.from(new Set((itemDetails||[]).map((it:any)=>it.color_id)));

      // Загружаем справочники только если есть данные
      let prodMap: Record<string, string> = {};
      let sizeMap: Record<string, string> = {};
      let colorMap: Record<string, string> = {};

      if (productIds.length > 0) {
        const { data: prodRows } = await supabaseAdmin.from('products').select('id, article').in('id', productIds);
        prodMap = Object.fromEntries((prodRows||[]).map((p:any)=>[p.id,p.article]));
      }

      // Упрощенная фильтрация
      let filteredReceipts = enriched;
      if (searchQuery && searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim();
        filteredReceipts = enriched.filter((receipt: any) => {
          return receipt.receipt_number?.toLowerCase().includes(searchLower) ||
                 receipt.notes?.toLowerCase().includes(searchLower);
        });
        count = filteredReceipts.length;
      }

      // Применяем пагинацию
      const paginatedReceipts = searchQuery && searchQuery.trim() 
        ? filteredReceipts.slice(offsetNum, offsetNum + limitNum)
        : filteredReceipts;

      const totalPages = Math.ceil((count || 0) / limitNum);

      return res.status(200).json({
        receipts: paginatedReceipts,
        pagination: {
          total: count || 0,
          page: pageNum,
          limit: limitNum,
          totalPages
        }
      });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 