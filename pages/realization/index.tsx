import { NextPage } from 'next';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { PlusIcon, PrinterIcon } from '@heroicons/react/24/outline';
import Paginator from '../../components/Paginator';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../components/AuthContext';
import { useUserRole } from '../../lib/hooks/useUserRole';
import DataTable, { Column } from '../../components/DataTable';

interface Realization {
  id: string;
  realization_number: string;
  shipped_at: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  sender_name?: string;
  recipient_name?: string;
  total_items?: number;
  first_article?: string;
  first_size?: string;
  first_color?: string;
  items?: any[];
}

const RealizationPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { hasAnyRole } = useUserRole();

  const [realizations, setRealizations] = useState<Realization[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchRealizations = async (page = 1, limit?: number, search = searchQuery) => {
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

      const response = await fetch(`/api/realization?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки реализаций');
      }

      setRealizations(data.realizations || []);
      setPagination(data.pagination || { total: 0, page, limit: currentLimit, totalPages: 0 });

    } catch (error: any) {
      console.error('Ошибка загрузки реализаций:', error);
      showToast(error.message || 'Ошибка загрузки реализаций', 'error');
      setRealizations([]);
      setPagination({ total: 0, page: 1, limit: 20, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealizations();
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      fetchRealizations(1, pagination.limit, value);
    }, 500);
  };

  const handlePageChange = (page: number) => {
    fetchRealizations(page, pagination.limit, searchQuery);
  };

  const handlePageSizeChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit }));
    fetchRealizations(1, newLimit, searchQuery);
  };

  const columns: Column<Realization>[] = [
    {
      key: 'realization_number',
      header: 'НОМЕР',
      render: (value, row) => (
        <Link 
          href={`/realization/${row.id}`}
          className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono"
        >
          {value}
        </Link>
      )
    },
    {
      key: 'shipped_at',
      header: 'ДАТА',
      render: (value, row) => new Date(value || row.created_at).toLocaleDateString()
    },
    {
      key: 'sender_name',
      header: 'ОТПРАВИТЕЛЬ',
      render: (value) => value || '—'
    },
    {
      key: 'recipient_name',
      header: 'ПОЛУЧАТЕЛЬ',
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
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Реализация</h1>
        <div className="flex items-center gap-2">
          {user?.role_id === 3 && (
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
            <PrinterIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Поиск */}
      <div className="mb-4">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Поиск реализаций..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input block w-full"
          />
        </div>
      </div>

      {/* Таблица */}
      <DataTable
        data={realizations}
        columns={columns}
        loading={loading}
        emptyMessage="Реализации не найдены"
      />

      {/* Пагинация */}
      {!loading && realizations.length > 0 && (
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

export default RealizationPage; 