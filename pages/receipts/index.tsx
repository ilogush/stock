import { useEffect, useState, useRef } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { PlusIcon, PrinterIcon } from '@heroicons/react/24/outline';
import Paginator from '../../components/Paginator';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../components/AuthContext';
import DataTable, { Column } from '../../components/DataTable';
import Link from 'next/link';

interface Receipt {
  id: string;
  received_at: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  creator_name?: string;
  transferrer_name?: string;
  total_items?: number;
  first_article?: string;
  first_size?: string;
  first_color?: string;
  items?: any[];
}

const ReceiptsPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
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

      const response = await fetch(`/api/receipts?${params}`, {
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки поступлений');
      }

      console.log('API Response:', data);
      console.log('Receipts:', data.receipts);
      console.log('Pagination:', data.pagination);
      
      setReceipts(data.receipts || []);
      setPagination(data.pagination || { total: 0, page, limit: currentLimit, totalPages: 0 });

    } catch (error: any) {
      console.error('Ошибка загрузки поступлений:', error);
      showToast(error.message || 'Ошибка загрузки поступлений', 'error');
      setReceipts([]);
      setPagination({ total: 0, page: 1, limit: 20, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      fetchReceipts(1, pagination.limit, value);
    }, 500);
  };

  const handlePageChange = (page: number) => {
    fetchReceipts(page, pagination.limit, searchQuery);
  };

  const handlePageSizeChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit }));
    fetchReceipts(1, newLimit, searchQuery);
  };



  const columns: Column<Receipt>[] = [
    {
      key: 'id',
      header: 'НОМЕР',
      render: (value, row) => (
        <Link 
          href={`/receipts/${row.id}`}
          className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono"
        >
          {value}
        </Link>
      )
    },
    {
      key: 'received_at',
      header: 'ДАТА',
      render: (value, row) => new Date(value || row.created_at).toLocaleDateString()
    },
    {
      key: 'transferrer_name',
      header: 'ПОСТАВЩИК',
      render: (value) => value || '—'
    },
    {
      key: 'creator_name',
      header: 'ПРИНЯЛ',
      render: (value) => value || '—'
    },
    {
      key: 'first_article',
      header: 'ТОВАРЫ',
      render: (value, row) => (
        <div>
          {value || '—'}
          {row.items && row.items.length > 1 && (
            <span className="text-gray-500 text-xs ml-1">
              +{row.items.length - 1}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'total_items',
      header: 'КОЛИЧЕСТВО',
      render: (value) => `${value || 0} шт.`,
      align: 'center'
    },
    {
      key: 'notes',
      header: 'ПРИМЕЧАНИЯ',
      render: (value) => (
        <div className="max-w-xs truncate">
          {value || '—'}
        </div>
      )
    },

  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 pb-4 border-b border-gray-200 no-print">
        <h1 className="text-xl font-bold text-gray-800">Поступления</h1>
        <div className="flex items-center gap-2">
          {/* Поиск - только в десктопной версии */}
          <div className="hidden md:block">
            <div className="relative w-64">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="search-input block w-full pl-10 pr-4"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          {(user && [1,2].includes(user.role_id)) && (
            <Link href="/receipts/new" className="btn text-xs flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Создать
            </Link>
          )}
          <button
            onClick={() => window.print()}
            className="btn text-xs flex items-center hidden sm:flex"
            title="Печать списка"
          >
            <PrinterIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Таблица */}
      <DataTable
        data={receipts}
        columns={columns}
        loading={loading}
        emptyMessage="Поступления не найдены"
      />

      {/* Пагинация */}
      {!loading && receipts.length > 0 && (
        <div className="mt-6">
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
  );
};

export default ReceiptsPage;