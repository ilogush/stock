import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ - данные загружаются в реальном времени
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      
      const { limit = '20', page = '1', search } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;

      // Сначала загружаем все данные без пагинации для фильтрации по артикулам
      let query = supabaseAdmin
        .from('realization')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Убираем фильтрацию на уровне БД - будем фильтровать после загрузки всех данных

      const { data, error, count } = await query;
      if (error) {
        console.error('Ошибка получения реализаций:', error);
        return res.status(500).json({ error: 'Ошибка получения реализаций' });
      }
      console.log('Получены реализации:', data?.length || 0);

      const realizations = data || [];

      // Пользователи (отправитель/получатель)
      const userIds = Array.from(new Set(realizations.flatMap((s:any)=>[s.sender_id, s.recipient_id]).filter(Boolean)));
      let usersMap: Record<string, any> = {};
      if (userIds.length>0) {
        const { data: users } = await supabaseAdmin.from('users').select('id, first_name, last_name').in('id', userIds);
        usersMap = Object.fromEntries((users||[]).map((u:any)=>[u.id, u]));
      }

      // Грузим строки реализаций (учитываем разные названия FK и поля количества)
      let items: any[] = [];
      if (realizations.length>0) {
        const ids = realizations.map((r:any)=>r.id);
        // Выбираем строки с джойном на products (как в ручке [id])
        const { data: itemRows, error: itemsErr } = await supabaseAdmin
          .from('realization_items')
          // Используем '*' чтобы быть совместимыми с вариантами схемы (qty/quantity, size/size_code, color/color_code)
          .select(`
            *,
            product:products!realization_items_product_id_fkey(id, article)
          `)
          .in('realization_id', ids);
        if (!itemsErr && itemRows) {
          items = itemRows.map((r:any)=>({
            realization_id: r.realization_id ?? r.realization ?? r.shipment_id,
            product_id: (r.product?.id ?? r.product_id),
            size_code: (r.size_code ?? r.size),
            color_id: (r.color_id ?? r.color),
            qty: (typeof r.qty === 'number' ? r.qty : (typeof r.quantity === 'number' ? r.quantity : 0)),
            article: r.product?.article
          }));
        } else {
          items = [];
        }
      }

      // Справочники
      const productIds = Array.from(new Set((items||[]).map((it:any)=>it.product_id).filter(Boolean)));
      const sizeCodes = Array.from(new Set((items||[]).map((it:any)=>it.size_code)));
              const colorIds = Array.from(new Set((items||[]).map((it:any)=>it.color_id)));

      let prodMap: Record<string, string> = {};
      let sizeMap: Record<string, string> = {};
      let colorMap: Record<string, string> = {};

      if (productIds.length) {
        const { data: prodRows } = await supabaseAdmin.from('products').select('id, article').in('id', productIds);
        prodMap = Object.fromEntries((prodRows||[]).map((p:any)=>[p.id,p.article]));
      }
      if (sizeCodes.length) {
        const sizesResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sizes`).then(r => r.json());
        const filteredSizes = (sizesResponse.sizes || []).filter((s: any) => sizeCodes.includes(s.code));
        sizeMap = Object.fromEntries(filteredSizes.map((s:any)=>[s.code, s.code]));
      }
                      if (colorIds.length) {
          const { data: colorRows } = await supabaseAdmin.from('colors').select('id, name').in('id', colorIds);
          colorMap = Object.fromEntries((colorRows||[]).map((c:any)=>[c.id.toString(),c.name]));
        }

      // Группируем строки по реализации
      const itemsGroup: Record<string, any[]> = {};
      const totals: Record<string, number> = {};
      (items||[]).forEach((it:any)=>{
        const id = it.realization_id ?? it.realization ?? it.shipment_id;
        if (id == null) return;
        if(!itemsGroup[id]) itemsGroup[id]=[];
        const qtyVal = typeof it.qty === 'number' ? it.qty : (typeof it.quantity === 'number' ? it.quantity : 0);
        const article = it.article || (prodMap[it.product_id] || '-');
        const sizeCode = it.size_code ?? it.size;
        const colorId = it.color_id ?? it.color;
        itemsGroup[id].push({
          article,
          size: sizeMap[sizeCode] || sizeCode,
                      color: colorMap[colorId] || colorId,
          qty: qtyVal
        });
        totals[id] = (totals[id]||0) + qtyVal;
      });

      let enriched = realizations.map((r:any)=>({
        id: r.id,
        realization_number: r.realization_number,
        shipped_at: r.shipped_at,
        created_at: r.created_at,
        recipient_id: r.recipient_id,
        sender_id: r.sender_id,
        recipient_name: (()=>{ const u=usersMap[r.recipient_id]; return u?`${u.first_name||''} ${u.last_name||''}`.trim():'—'; })(),
        sender_name: (()=>{ const u=usersMap[r.sender_id]; return u?`${u.first_name||''} ${u.last_name||''}`.trim():'—'; })(),
        total_items: totals[r.id] ?? 0,
        items: itemsGroup[r.id] ?? [],
        notes: r.notes || ''
      }));

      // Дополнительная фильтрация по поиску (включая артикулы в позициях)
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = search.trim().toLowerCase();
        enriched = enriched.filter((r: any) => {
          // Поиск по номеру реализации
          if (r.realization_number?.toLowerCase().includes(searchTerm)) return true;
          // Поиск по примечаниям
          if (r.notes?.toLowerCase().includes(searchTerm)) return true;
          // Поиск по артикулам товаров в позициях
          if (r.items?.some((item: any) => item.article?.toLowerCase().includes(searchTerm))) return true;
          // Поиск по именам отправителя/получателя
          if (r.sender_name?.toLowerCase().includes(searchTerm)) return true;
          if (r.recipient_name?.toLowerCase().includes(searchTerm)) return true;
          return false;
        });
      }

      // Применяем пагинацию после фильтрации
      const totalFiltered = enriched.length;
      const paginatedResults = enriched.slice(from, from + limitNum);
      const totalPages = Math.ceil(totalFiltered / limitNum);

      return res.status(200).json({
        realizations: paginatedResults,
        pagination: { total: totalFiltered, page: pageNum, limit: limitNum, totalPages }
      });
    } catch (e) {
      console.error('Серверная ошибка в API realization:', e);
      console.error('Stack trace:', e instanceof Error ? e.stack : 'No stack trace');
      return res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        details: process.env.NODE_ENV === 'development' ? e instanceof Error ? e.message : String(e) : undefined
      });
    }
  }

  res.status(405).json({ error: 'Метод не поддерживается' });
} 