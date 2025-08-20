import { NextPage } from 'next';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { PencilIcon, TrashIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';
import Paginator from '../../components/Paginator';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../components/AuthContext';
import { useUserRole } from '../../lib/hooks/useUserRole';

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

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту реализацию?')) {
      return;
    }

    try {
      const response = await fetch(`/api/realization/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка удаления');
      }

      showToast('Реализация удалена', 'success');
      fetchRealizations(pagination.page, pagination.limit, searchQuery);
    } catch (error: any) {
      console.error('Ошибка удаления:', error);
      showToast(error.message || 'Ошибка удаления', 'error');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Реализация</h1>
        <div className="flex items-center gap-2">
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
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 002 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" 
              />
            </svg>
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
      <div className="overflow-x-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Загрузка...</div>
          </div>
        ) : realizations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Реализации не найдены</div>
          </div>
        ) : (
          <table className="table-standard">
            <thead>
              <tr>
                <th className="table-header">Номер</th>
                <th className="table-header">Дата</th>
                <th className="table-header">Отправитель</th>
                <th className="table-header">Получатель</th>
                <th className="table-header">Товары</th>
                <th className="table-header">Количество</th>
                <th className="table-header">Примечания</th>
                <th className="table-header">Действия</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {realizations.map((realization) => (
                <tr key={realization.id} className="table-row-hover">
                  <td className="table-cell">
                    <Link 
                      href={`/realization/${realization.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {realization.realization_number}
                    </Link>
                  </td>
                  <td className="table-cell">
                    {new Date(realization.shipped_at || realization.created_at).toLocaleDateString()}
                  </td>
                  <td className="table-cell">{realization.sender_name || '—'}</td>
                  <td className="table-cell">{realization.recipient_name || '—'}</td>
                  <td className="table-cell">
                    {realization.first_article || '—'}
                    {realization.items && realization.items.length > 1 && (
                      <span className="text-gray-500 text-xs ml-1">
                        +{realization.items.length - 1}
                      </span>
                    )}
                  </td>
                  <td className="table-cell">{realization.total_items || 0} шт.</td>
                  <td className="table-cell max-w-xs truncate">
                    {realization.notes || '—'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/realization/${realization.id}`}
                        className="btn text-xs"
                        title="Просмотр"
                      >
                        <EyeIcon className="w-4 h-4" />
                        просмотр
                      </Link>
                      <button
                        onClick={() => handleDelete(realization.id)}
                        className="btn text-xs"
                        title="Удалить"
                      >
                        <TrashIcon className="w-4 h-4" />
                        удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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