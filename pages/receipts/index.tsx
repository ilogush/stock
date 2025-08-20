import { useEffect, useState, useRef } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { PencilIcon, TrashIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';
import Paginator from '../../components/Paginator';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../components/AuthContext';
import Link from 'next/link';

interface Receipt {
  id: string;
  receipt_number: string;
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

      const response = await fetch(`/api/receipts?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки поступлений');
      }

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

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это поступление?')) {
      return;
    }

    try {
      const response = await fetch(`/api/receipts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка удаления');
      }

      showToast('Поступление удалено', 'success');
      fetchReceipts(pagination.page, pagination.limit, searchQuery);
    } catch (error: any) {
      console.error('Ошибка удаления:', error);
      showToast(error.message || 'Ошибка удаления', 'error');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Поступления</h1>
        <div className="flex items-center gap-2">
          <Link href="/receipts/new" className="btn text-xs flex items-center gap-2">
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
            placeholder="Поиск поступлений..."
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
        ) : receipts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Поступления не найдены</div>
          </div>
        ) : (
          <table className="table-standard">
            <thead>
              <tr>
                <th className="table-header">Номер</th>
                <th className="table-header">Дата</th>
                <th className="table-header">Поставщик</th>
                <th className="table-header">Принял</th>
                <th className="table-header">Товары</th>
                <th className="table-header">Количество</th>
                <th className="table-header">Примечания</th>
                <th className="table-header">Действия</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="table-row-hover">
                  <td className="table-cell">
                    <Link 
                      href={`/receipts/${receipt.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {receipt.receipt_number}
                    </Link>
                  </td>
                  <td className="table-cell">
                    {new Date(receipt.received_at || receipt.created_at).toLocaleDateString()}
                  </td>
                  <td className="table-cell">{receipt.transferrer_name || '—'}</td>
                  <td className="table-cell">{receipt.creator_name || '—'}</td>
                  <td className="table-cell">
                    {receipt.first_article || '—'}
                    {receipt.items && receipt.items.length > 1 && (
                      <span className="text-gray-500 text-xs ml-1">
                        +{receipt.items.length - 1}
                      </span>
                    )}
                  </td>
                  <td className="table-cell">{receipt.total_items || 0} шт.</td>
                  <td className="table-cell max-w-xs truncate">
                    {receipt.notes || '—'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/receipts/${receipt.id}`}
                        className="btn text-xs"
                        title="Просмотр"
                      >
                        <EyeIcon className="w-4 h-4" />
                        просмотр
                      </Link>
                      <button
                        onClick={() => handleDelete(receipt.id)}
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