import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { createListResponse } from '../../../lib/api/standardResponse';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';

export default withPermissions(
  RoleChecks.canManageBrands,
  'Доступ к брендам разрешен только администраторам'
)(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ - данные загружаются в реальном времени
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const { search } = req.query;

      let query = supabaseAdmin
        .from('brands')
        .select(`
          *,
          company:companies(id, name, address, phone)
        `)
        .order('id');

      const { data: brands, error } = await query;

      if (error) {
        console.error('Ошибка при получении брендов:', error);
        return res.status(500).json({ error: 'Ошибка при получении брендов' });
      }

      // Фильтруем данные на стороне сервера если есть поисковый запрос
      let filteredBrands = brands || [];
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = decodeURIComponent(search.trim()).toLowerCase();
        // Поисковый запрос брендов обработан
        
        filteredBrands = (brands || []).filter((brand: any) => {
          return (
            brand.id.toString().includes(searchTerm) ||
            (brand.name && brand.name.toLowerCase().includes(searchTerm)) ||
            (brand.company && brand.company.name && brand.company.name.toLowerCase().includes(searchTerm))
          );
        });
      }

      if (error) {
        console.error('Ошибка при получении брендов:', error);
        return res.status(500).json({ error: 'Ошибка при получении брендов' });
      }

      // Добавляем имена менеджеров для каждого бренда
      const brandsWithManagers = await Promise.all((filteredBrands || []).map(async (brand: any) => {
        try {
          const { data: managersData, error: managersError } = await supabaseAdmin
            .from('brand_managers')
            .select(`
              user:users(id, first_name, last_name)
            `)
            .eq('brand_id', brand.id);

          let managers: any[] = [];
          if (!managersError && managersData) {
            managers = managersData.map((item: any) => ({
              id: item.user?.id,
              name: `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim()
            }));
          }

          return {
            ...brand,
            managers: managers,
            managers_count: managers.length
          };
        } catch (managerError) {
  
          return {
            ...brand,
            managers: [],
            managers_count: 0
          };
        }
      }));

      // 📊 СТАНДАРТИЗИРОВАННЫЙ ОТВЕТ
      const response = createListResponse(
        brandsWithManagers || [],
        (brandsWithManagers || []).length,
        1,
        (brandsWithManagers || []).length,
        'brands',
        {
          search: search || null,
          total_managers: (brandsWithManagers || []).reduce((sum: number, b: any) => sum + (b.managers_count || 0), 0)
        }
      );
      
      return res.status(200).json(response);
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}); 