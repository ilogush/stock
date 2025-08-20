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

      if (sizeCodes.length > 0) {
        const sizesResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sizes`).then(r => r.json());
        const filteredSizes = (sizesResponse.sizes || []).filter((s: any) => sizeCodes.includes(s.original_code || s.code));
        sizeMap = Object.fromEntries(filteredSizes.map((s:any)=>[s.original_code || s.code, s.code]));
      }

              if (colorIds.length > 0) {
  const { data: colorRows } = await supabaseAdmin.from('colors').select('id, name').in('id', colorIds);
  colorMap = Object.fromEntries((colorRows||[]).map((c:any)=>[c.id.toString(),c.name]));
}

      const aggMap: Record<string, any> = {};
      (itemDetails||[]).forEach((it:any)=>{
        const key = it.receipt_id;
        if(!aggMap[key]){
          aggMap[key]={
            article: prodMap[it.product_id] || '-',
            sizes: new Set<string>(),
            colors: new Set<string>()
          };
        }
        aggMap[key].sizes.add(sizeMap[it.size_code] || it.size_code);
                    aggMap[key].colors.add(colorMap[it.color_id] || it.color_id);
      });

      // Группируем позиции для каждого receipt
      const itemsGroup: Record<string, any[]> = {};
      (itemDetails||[]).forEach((it:any)=>{
        const rId = it.receipt_id;
        if(!itemsGroup[rId]) itemsGroup[rId]=[];
        itemsGroup[rId].push({
          article: prodMap[it.product_id] || '-',
          size: sizeMap[it.size_code] || it.size_code,
          color: colorMap[it.color_id] || it.color_id,
          qty: it.qty
        });
      });

      const enriched = receipts.map((r:any)=>({
        ...r,
        transferrer_name: usersMap[r.transferrer_id]?.first_name || '—',
        creator_name: usersMap[r.creator_id]?.first_name || '—',
        total_items: totalMap[r.id] || 0,
        first_article: aggMap[r.id]?.article || '-',
        first_size: Array.from(aggMap[r.id]?.sizes || new Set<string>())[0] || '-',
        first_color: Array.from(aggMap[r.id]?.colors || new Set<string>())[0] || '-',
        items: itemsGroup[r.id] || []
      }));

      // Фильтрация по поисковому запросу
      let filteredReceipts = enriched;
      if (searchQuery && searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim();
        filteredReceipts = enriched.filter((receipt: any) => {
          // Поиск по номеру поступления
          if (receipt.receipt_number?.toLowerCase().includes(searchLower)) return true;
          
          // Поиск по дате
          const dateStr = new Date(receipt.received_at || receipt.created_at).toLocaleDateString('ru-RU');
          if (dateStr.includes(searchLower)) return true;
          
          // Поиск по времени
          const timeStr = new Date(receipt.received_at || receipt.created_at).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
          if (timeStr.includes(searchLower)) return true;
          
          // Поиск по артикулу
          if (receipt.first_article?.toLowerCase().includes(searchLower)) return true;
          
          // Поиск по размеру
          if (receipt.first_size?.toLowerCase().includes(searchLower)) return true;
          
          // Поиск по цвету (название цвета)
          if (receipt.first_color?.toLowerCase().includes(searchLower)) return true;
          
          // Поиск по количеству
          if (receipt.total_items?.toString().includes(searchLower)) return true;
          
          // Поиск по имени передавшего
          if (receipt.transferrer_name?.toLowerCase().includes(searchLower)) return true;
          
          // Поиск по имени принявшего
          if (receipt.creator_name?.toLowerCase().includes(searchLower)) return true;
          
          // Поиск по примечаниям
          if (receipt.notes?.toLowerCase().includes(searchLower)) return true;
          
          // Поиск по всем позициям
          if (receipt.items && receipt.items.some((item: any) => 
            item.article?.toLowerCase().includes(searchLower) ||
            item.size?.toLowerCase().includes(searchLower) ||
            item.color?.toLowerCase().includes(searchLower) ||
            item.qty?.toString().includes(searchLower)
          )) return true;
          
          return false;
        });
        
        count = filteredReceipts.length;
      }

      // Применяем пагинацию к отфильтрованным результатам
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