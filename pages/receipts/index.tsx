import { useEffect, useState, useRef } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { PencilIcon, TrashIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';
import Paginator from '../../components/Paginator';

import { useToast } from '../../components/ToastContext';
import { translateSupabaseError } from '../../lib/supabaseErrorTranslations';
import { useAuth } from '../../components/AuthContext';


interface Receipt {
  id: string;
  receipt_number: string;
  received_at: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  creator_name?: string; // Принял товар
  transferrer_name?: string; // Принято от товар
  total_items?: number; // Общее количество товаров
  total_rows?: number; // Количество строк товаров в поступлении
  items_info?: string; // Детали
  first_article?: string;
  first_size?: string;
  first_color?: string;
  items?: any[];
}

type Row = {
  receipt_id: string;
  receipt_number: string;
  date: string;
  article: string;
  size: string;
  color: string;
  qty: number;
  transferrer: string;
  creator: string;
  notes?: string;
  isFirst: boolean;
};

const ReceiptsPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();


  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchReceipts = async (page = 1, limit?: number, search = searchQuery) => {
    setLoading(true);
    try {
      const currentLimit = limit || pagination.limit;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: currentLimit.toString(),
      });

      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`/api/receipts?${params}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      const recs: Receipt[] = data.receipts || [];
      setReceipts(recs);

      // Формируем плоские строки
      const flat: Row[] = [];
      recs.forEach((rec) => {
        const items = rec.items || [];
        items.forEach((it: any, idx: number) => {
          // Показываем артикул только для первого размера каждого цвета
          const isFirstForColor = idx === 0 || items[idx - 1]?.color !== it.color;
          
          flat.push({
            receipt_id: rec.id,
            receipt_number: rec.receipt_number,
            date: rec.received_at || rec.created_at,
            article: isFirstForColor ? it.article : '', // Артикул только для первого размера цвета
            size: it.size,
            color: it.color,
            qty: it.qty,
            transferrer: rec.transferrer_name || '—',
            creator: rec.creator_name || '—',
            notes: rec.notes,
            isFirst: idx === 0,
          });
        });
      });

      setRows(flat);
      setPagination(data.pagination);
    } catch (error: any) {
      showToast(translateSupabaseError(error), 'error');
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
    fetchReceipts(1, pagination.limit, urlSearchQuery || '');
  }, [router.query.search]);

    // Убираем автоматическое обновление при возврате на страницу - это создает лишние запросы

  // Роль пользователя берём из хука

  const handlePageChange = (page: number) => {
    // Обновляем состояние пагинации
    setPagination(prev => ({ ...prev, page }));
    fetchReceipts(page, pagination.limit, searchQuery);
  };

  const handlePageSizeChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit }));
    fetchReceipts(1, newLimit, searchQuery); // Начинаем с первой страницы при смене лимита
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 pb-4 border-b-0 sm:border-b sm:border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Поступления товаров</h1>
        <div className="flex items-center gap-3">
          {/* Поиск справа от заголовка */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Поиск поступлений..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Очищаем предыдущий таймер
                if (searchTimeout.current) {
                  clearTimeout(searchTimeout.current);
                }
                // Добавляем задержку для поиска в реальном времени
                searchTimeout.current = setTimeout(() => {
                  fetchReceipts(1, pagination.limit, e.target.value);
                }, 500);
              }}
              className="search-input block w-full"
            />
          </div>
          {user && (user.role_id === 1 || user.role_id === 2 || user.role_id === 3) && (
            <button
              onClick={() => router.push('/receipts/new')}
              className="btn text-xs flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Создать
            </button>
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
          <table className="min-w-full divide-y divide-gray-200 border-0 rounded-none print-table">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider print-header">Номер</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider print-header">Дата</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider print-header">Время</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider print-header">Артикул</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider print-header">Размер</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider print-header">Цвет</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-800 uppercase tracking-wider print-header">шт.</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider print-header">Сдал</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider print-header">Принял</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider print-header">Примечания</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center p-4">
                    <div className="text-gray-500">Загрузка...</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center p-8 text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="text-lg font-medium">
                        Поступлений нет
                      </div>
                      <div className="text-sm text-gray-400">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Создайте первое поступление'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 print-row">
                    <td className={`table-cell-mono print-cell ${!row.isFirst ? 'border-t-0' : ''}`}>
                      {row.isFirst && (
                        <span className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs print-badge">{row.receipt_number}</span>
                      )}
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 print-cell ${!row.isFirst ? 'border-t-0' : ''}`}>{row.isFirst ? new Date(row.date).toLocaleDateString('ru-RU') : ''}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 print-cell ${!row.isFirst ? 'border-t-0' : ''}`}>{row.isFirst ? new Date(row.date).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}) : ''}</td>
                    <td className="table-cell-mono print-cell">{row.article || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 print-cell">{row.size}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 print-cell">{row.color}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center print-cell">{row.qty}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 print-cell ${!row.isFirst ? 'border-t-0' : ''}`}>{row.isFirst ? row.transferrer : ''}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 print-cell ${!row.isFirst ? 'border-t-0' : ''}`}>{row.isFirst ? row.creator : ''}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 print-cell ${!row.isFirst ? 'border-t-0' : ''}`}>{row.isFirst ? (row.notes || '-') : ''}</td>
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
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>

      <style jsx>{`
      `}</style>
    </div>
  );
};

export default ReceiptsPage;