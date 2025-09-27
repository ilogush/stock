import { useEffect, useRef, useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { PencilIcon, TrashIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';
import Paginator from '../../components/Paginator';
import { useToast } from '../../components/ToastContext';
import { useDebouncedCallback } from '../../lib/hooks/useDebounce';

interface Brand {
  id: number;
  name: string;
}

interface Manager {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface Company {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  brands?: Brand[];
  managers?: Manager[];
}

const CompaniesPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const debouncedSearch = useDebouncedCallback((q: string) => {
    const query: any = { page: '1', limit: String(pagination.limit) };
    if (q && q.trim()) query.search = q.trim();
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    fetchCompanies(1, pagination.limit, q);
  }, 500);

  const fetchCompanies = async (page = 1, limit?: number, search = searchQuery) => {
    try {
      const currentLimit = limit || pagination.limit;
      const offset = (page - 1) * currentLimit;
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: currentLimit.toString()
      });

      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const res = await fetch(`/api/companies?${params.toString()}`, { signal: abortRef.current.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      setCompanies(data.companies || []);
      
      const totalPages = Math.ceil((data.pagination?.total || 0) / currentLimit);
      setPagination({
        total: data.pagination?.total || 0,
        page: page,
        limit: currentLimit,
        totalPages: totalPages
      });
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''));
      if (isAbort) return;
      showToast(err.message || 'Ошибка загрузки компаний', 'error');
    }
  };

  useEffect(() => {
    // Получаем поисковый запрос из URL при загрузке страницы
    const urlSearchQuery = router.query.search as string;
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }
    fetchCompanies(1, pagination.limit, urlSearchQuery || '');
  }, [router.query.search]);

  useEffect(() => {
    debouncedSearch(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

    // Убираем автоматическое обновление при возврате на страницу - это создает лишние запросы

  const handlePageChange = (p: number) => {
    // Обновляем состояние пагинации
    setPagination(prev => ({ ...prev, page: p }));
    
    const query: any = { page: String(p), limit: String(pagination.limit) };
    if (searchQuery && searchQuery.trim()) query.search = searchQuery.trim();
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    fetchCompanies(p, pagination.limit, searchQuery);
  };

  const handlePageSizeChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit }));
    const query: any = { page: '1', limit: String(newLimit) };
    if (searchQuery && searchQuery.trim()) query.search = searchQuery.trim();
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    fetchCompanies(1, newLimit, searchQuery);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 pb-4 border-b-0 sm:border-b sm:border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Компании</h1>
        <div className="flex items-center gap-3">
          {/* Поиск справа от заголовка */}
          <div className="relative w-full sm:w-64">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input block w-full pl-10 pr-4"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          <Link href="/companies/new" className="btn text-xs flex items-center gap-2">
                          <PlusIcon className="w-4 h-4" />
            Создать
          </Link>
          <button
            onClick={() => window.print()}
            className="btn text-xs flex items-center hidden sm:flex"
            title="Печать списка"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" 
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="overflow-x-auto">
          <table className="table-standard">
            <thead>
              <tr>
                <th className="table-header">ID</th>
                <th className="table-header">НАЗВАНИЕ</th>
                <th className="table-header">АДРЕС</th>
                <th className="table-header">ТЕЛЕФОН</th>
                <th className="table-header">БРЕНДЫ</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {companies.map((c, index) => (
                <tr key={c.id} className="table-row-hover">
                  <td className="table-cell-mono">
                    <Link href={`/companies/${c.id}`} className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono">
                      {String(index + 1).padStart(3, '0')}
                    </Link>
                  </td>
                  <td className="table-cell font-medium">{c.name}</td>
                  <td className="table-cell">{c.address || '—'}</td>
                  <td className="table-cell">{c.phone || '—'}</td>
                  <td className="table-cell">
                    {c.brands && c.brands.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.brands.map((brand, index) => (
                          <span key={brand.id} className="bg-gray-100 p-1 rounded">
                            <span className="text-gray-900">
                              {brand.name}
                            </span>
                            {index < c.brands!.length - 1 && ''}
                          </span>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr className="border-t border-b border-gray-200">
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <div className="text-lg font-medium">
                        Компаний нет
                      </div>
                      <div className="text-sm text-gray-400">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Создайте первую компанию'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.total > 0 && (
          <Paginator 
            total={pagination.total} 
            page={pagination.page} 
            limit={pagination.limit} 
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>

      <style jsx>{`
      `}</style>
    </div>
  );
};

export default CompaniesPage; 