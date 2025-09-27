import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';

export default withPermissions(
  RoleChecks.canManageCompanies,
  'Доступ к компаниям разрешен только администраторам'
)(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ - данные загружаются в реальном времени
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const { limit = '20', offset = '0', search } = req.query;

      let query = supabaseAdmin
        .from('companies')
        .select('*', { count: 'exact' })
        .order('id');

      const { data: companies, error, count } = await query
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      if (error) {
        console.error('Ошибка при получении компаний:', error);
        return res.status(500).json({ error: 'Ошибка при получении компаний' });
      }

      // Фильтруем данные на стороне сервера если есть поисковый запрос
      let filteredCompanies = companies || [];
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = decodeURIComponent(search.trim()).toLowerCase();
        // Поисковый запрос компаний обработан
        
        filteredCompanies = (companies || []).filter((company: any) => {
          return (
            company.id.toString().includes(searchTerm) ||
            (company.name && company.name.toLowerCase().includes(searchTerm)) ||
            (company.description && company.description.toLowerCase().includes(searchTerm))
          );
        });
      }

      if (error) {
        console.error('Ошибка при получении компаний:', error);
        return res.status(500).json({ error: 'Ошибка при получении компаний' });
      }

      const companiesWithDetails = await Promise.all(
        (filteredCompanies || []).map(async (company: any) => {
          const { data: brands } = await supabaseAdmin
            .from('brands')
            .select('id, name')
            .eq('company_id', company.id);

          const { data: managers } = await supabaseAdmin
            .from('users')
            .select('id, email, first_name, last_name')
            .eq('role_id', 4)
            .eq('company_id', company.id);

          return {
            ...company,
            brands: brands || [],
            managers: managers || []
          };
        })
      );

      return res.status(200).json({
        companies: companiesWithDetails,
        pagination: {
          total: filteredCompanies.length || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}); 