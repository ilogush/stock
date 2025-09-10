import { useEffect, useRef, useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { PencilIcon, TrashIcon, EyeIcon, PlusIcon, PrinterIcon, TagIcon } from '@heroicons/react/24/outline';
import Paginator from '../../components/Paginator';
import { useToast } from '../../components/ToastContext';
import { useDebouncedCallback } from '../../lib/hooks/useDebounce';

interface Company {
  id: number;
  name: string;
  address?: string;
  phone?: string;
}

interface Manager {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
  company_id?: number;
  company?: Company;
  managers?: Manager[];
  managers_count?: number;
}

const BrandsPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const load = async (q?: string) => {
    try {
      setLoading(true);
      const url = q && q.trim() ? `/api/brands?search=${encodeURIComponent(q.trim())}` : '/api/brands';
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const res = await fetch(url, { signal: abortRef.current.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      setBrands(data.data?.brands || data.brands || []);
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''));
      if (isAbort) return;
      showToast(err.message || 'Ошибка загрузки брендов', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Получаем поисковый запрос из URL при загрузке страницы
    const urlSearchQuery = router.query.search as string;
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }

    // Загружаем данные только один раз при монтировании
    load(urlSearchQuery);
  }, []); // Убираем зависимость от router.query.search

  // Убираем дублирование - поиск происходит на сервере, клиентская фильтрация не нужна
  const total = brands.length;
  const sliced = brands.slice((page - 1) * limit, page * limit);

  const handlePageSizeChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    const query: any = { page: '1', limit: String(newLimit) };
    if (searchQuery && searchQuery.trim()) query.search = searchQuery.trim();
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  };

  const debouncedSearch = useDebouncedCallback((q: string) => {
    const query: any = { page: '1', limit: String(limit) };
    if (q && q.trim()) query.search = q.trim();
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    // перезагружаем данные с защитой от AbortError
    (async () => {
      try {
        const url = q && q.trim() ? `/api/brands?search=${encodeURIComponent(q.trim())}` : '/api/brands';
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Ошибка загрузки');
        }
        const data = await res.json();
        setBrands(data.data?.brands || data.brands || []);
      } catch (err: any) {
        const isAbort = err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''));
        if (!isAbort) {
          showToast(err.message || 'Ошибка загрузки брендов', 'error');
        }
      }
    })();
  }, 500);

  useEffect(() => {
    debouncedSearch(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

    // Убираем автоматическое обновление при возврате на страницу - это создает лишние запросы

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 pb-4 border-b-0 sm:border-b sm:border-gray-200 no-print">
        <h1 className="text-xl font-bold text-gray-800">Бренды</h1>
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
          <Link href="/brands/new" className="btn text-xs flex items-center gap-2">
                          <PlusIcon className="w-4 h-4" />
            Создать
          </Link>
          <button
            onClick={() => window.print()}
            className="btn text-xs flex items-center hidden sm:flex"
            title="Печать списка"
          >
            <PrinterIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Таблица брендов */}
        <div className="flex flex-col">
          <div className="overflow-x-auto">
            <table className="table-standard">
              <thead>
                <tr>
                <th className="table-header">ID</th>
                <th className="table-header">БРЕНД</th>
                <th className="table-header">КОМПАНИЯ</th>
                <th className="table-header">МЕНЕДЖЕРЫ</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {sliced.map((b, index) => (
                <tr key={b.id} className="table-row-hover">
                  <td className="table-cell-mono">
                    <Link href={`/brands/${b.id}`} className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono">
                      {String(index + 1).padStart(3, '0')}
                    </Link>
                  </td>
                  <td className="table-cell">{b.name}</td>
                  <td className="table-cell">
                    {b.company ? (
                      <span className="text-gray-900">
                        {b.company.name}
                      </span>
                    ) : (
                      <span className="text-gray-500">Не привязан</span>
                    )}
                  </td>
                  <td className="table-cell">
                    {b.managers && b.managers.length > 0 ? (
                      <span>
                        {b.managers.map((manager, index) => (
                          <span key={manager.id}>
                            <span className="text-gray-900">
                              {manager.name}
                            </span>
                            {index < b.managers!.length - 1 && ', '}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {total === 0 && (
                <tr className="border-t border-b border-gray-200">
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <TagIcon className="w-12 h-12 text-gray-300" />
                      <div className="text-lg font-medium">
                        Брендов нет
                      </div>
                      <div className="text-sm text-gray-400">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Создайте первый бренд'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <Paginator 
            total={total} 
            page={page} 
            limit={limit} 
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
        </div>

      <style jsx>{`
      `}</style>
    </div>
  );
};

export default BrandsPage; 