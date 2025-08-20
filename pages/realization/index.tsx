import { NextPage } from 'next';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { PencilIcon, TrashIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';
import Paginator from '../../components/Paginator';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../components/AuthContext';
import { useUserRole } from '../../lib/hooks/useUserRole';
import { Realization } from '../../types';

const RealizationPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { hasAnyRole } = useUserRole();

  const [list, setList] = useState<Realization[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async (page = 1, limit = pagination.limit, search = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search.trim()) params.append('search', encodeURIComponent(search.trim()));
      const res = await fetch(`/api/realization?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      setList(data.realizations || []);
      setPagination(data.pagination || { total: 0, page, limit, totalPages: 0 });
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // начальная загрузка + реакция на search
  useEffect(() => {
    const q = router.query.search as string;
    setSearchQuery(q || '');
    fetchData(1, pagination.limit, q || '');
  }, [router.query.search]);

    // Убираем автоматическое обновление при возврате на страницу - это создает лишние запросы

  // Роль пользователя берём из хука

  const handlePageChange = (p: number) => {
    // Обновляем состояние пагинации
    setPagination(prev => ({ ...prev, page: p }));
    fetchData(p, pagination.limit, searchQuery);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 pb-4 border-b-0 sm:border-b sm:border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Реализация</h1>
        <div className="flex items-center gap-3">
          {/* Поиск справа от заголовка */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Поиск доставок..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                // дебаунс 500 мс без накопления таймеров
                if ((searchDebounceRef.current as any)) {
                  clearTimeout(searchDebounceRef.current as any);
                }
                searchDebounceRef.current = setTimeout(() => {
                  fetchData(1, pagination.limit, value);
                }, 500) as any;
              }}
              className="search-input block w-full"
            />
          </div>
          {hasAnyRole(['admin', 'director', 'storekeeper']) && (
            <Link href="/realization/new" className="btn text-xs flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Создать
            </Link>
          )}
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

      <div className="flex flex-col flex-grow">
        <div className="overflow-x-auto flex-grow">
          <table className="min-w-full divide-y divide-gray-200 border-0 rounded-none">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Номер</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Дата</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Артикул</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Размер</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Цвет</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-800 uppercase tracking-wider">шт.</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Кому передали</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Передал</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Примечания</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
              <tr>
                  <td colSpan={9} className="text-center p-4">
                  <div className="text-gray-500">Загрузка...</div>
                </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center p-8 text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-12 h-12 text-gray-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                      </svg>
                      <div className="text-lg font-medium">
                        Записей реализации нет
                      </div>
                      <div className="text-sm text-gray-400">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Создайте первую запись реализации'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                list.flatMap((rec:any)=> {
                  const items = rec.items || [];
                  if (items.length === 0) {
                    return [{ rec, it: { article: '-', size: '-', color: '-', qty: 0 }, isFirst: true }];
                  }
                  return items.map((it:any, idx:number)=> { 
                    // Показываем артикул только для первого размера каждого цвета
                    const isFirstForColor = idx === 0 || items[idx - 1]?.color !== it.color;
                    return { 
                      rec, 
                      it: { 
                        ...it, 
                        article: isFirstForColor ? it.article : '' 
                      }, 
                      isFirst: idx === 0 
                    };
                  });
                }).map(({rec,it,isFirst}:any, idx:number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className={`table-cell-mono ${!isFirst ? 'border-t-0' : ''}`}>
                      {isFirst && (
                        <span className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs">{rec.realization_number}</span>
                      )}
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 ${!isFirst ? 'border-t-0' : ''}`}>{isFirst ? new Date(rec.shipped_at || rec.created_at).toLocaleDateString('ru-RU') : ''}</td>
                    <td className="table-cell-mono">{it.article || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{it.size}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{it.color}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">{it.qty}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 ${!isFirst ? 'border-t-0' : ''}`}>{isFirst ? (rec.recipient_name || '—') : ''}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 ${!isFirst ? 'border-t-0' : ''}`}>{isFirst ? (rec.sender_name || '—') : ''}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 ${!isFirst ? 'border-t-0' : ''}`}>{isFirst ? (rec.notes || '-') : ''}</td>
              </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.total > 0 && (
          <div className="mt-4">
          <Paginator
            total={pagination.total}
            page={pagination.page}
            limit={pagination.limit}
              onPageChange={handlePageChange}
              onPageSizeChange={(l)=>fetchData(1,l,searchQuery)}
          />
          </div>
        )}
      </div>

      <style jsx>{`
      `}</style>
    </div>
  );
};

export default RealizationPage; 