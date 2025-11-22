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
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchRealizations = async (page = 1, limit?: number, search = searchQuery, timestamp?: number) => {
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
      
      // ВСЕГДА добавляем timestamp для предотвращения кэширования
      params.append('_t', (timestamp || Date.now()).toString());

      const response = await fetch(`/api/realization?${params}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'If-Modified-Since': '0',
          'If-None-Match': '*'
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки реализаций');
      }

      
      // Принудительно очищаем состояние перед установкой новых данных
      setRealizations([]);
      
      // Устанавливаем новые данные через небольшую задержку для принудительного перерендера
      setTimeout(() => {
        const newRealizations = data.realizations || [];
        setRealizations(newRealizations);
        setPagination(data.pagination || { total: 0, page, limit: currentLimit, totalPages: 0 });
        // Принудительно обновляем компонент
        setForceUpdateKey(prev => prev + 1);
      }, 10);

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
    // Принудительно обновляем данные при загрузке страницы
    const timestamp = Date.now();
    fetchRealizations(1, pagination.limit, '', timestamp);
  }, []);
  

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      fetchRealizations(1, pagination.limit, value, Date.now());
    }, 500);
  };

  const handlePageChange = (page: number) => {
    fetchRealizations(page, pagination.limit, searchQuery, Date.now());
  };

  const handlePageSizeChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit }));
    fetchRealizations(1, newLimit, searchQuery, Date.now());
  };


  const columns: Column<Realization>[] = [
    {
      key: 'id',
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
      key: 'created_at',
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
      render: (value, row) => {
        
        if (!value) return '—';
        
        const formattedArticle = /^[0-9]+$/.test(value) ? `L${value}` : value;
        const size = row.first_size ? `, ${row.first_size}` : '';
        const color = row.first_color ? `, ${row.first_color}` : '';
        const additional = row.items && row.items.length > 1 ? ` +${row.items.length - 1}` : '';
        
        return (
          <div>
            {formattedArticle}{size}{color}{additional}
          </div>
        );
      }
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
      <div className="flex flex-row justify-between items-center gap-2 mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Реализация</h1>
        <div className="flex items-center gap-2 no-print">
          {(user && [1,2].includes(user.role_id)) && (
            <Link href="/realization/new" className="btn text-xs flex items-center gap-2 hover:bg-gray-800 hover:text-white">
              <PlusIcon className="w-4 h-4" />
              Создать
            </Link>
          )}
          <button
            onClick={() => window.print()}
            className="btn text-xs flex items-center justify-center hover:bg-gray-800 hover:text-white hidden sm:flex"
            title="Печать списка"
          >
            <PrinterIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Таблица */}
      <div className="mt-4 sm:mt-0">
        <DataTable
          key={forceUpdateKey}
          data={realizations}
          columns={columns}
          rowKey="id"
          loading={loading}
          emptyMessage="Реализации не найдены"
        />

        {/* Пагинация */}
        {!loading && realizations.length > 0 && (
          <div className="mt-6 no-print">
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
    </div>
  );
};

export default RealizationPage; 