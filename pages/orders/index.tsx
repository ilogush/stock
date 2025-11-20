import { useEffect, useRef, useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import Paginator from '../../components/Paginator';

import { useToast } from '../../components/ToastContext';
import { useDebouncedCallback } from '../../lib/hooks/useDebounce';
import { translateSupabaseError } from '../../lib/supabaseErrorTranslations';

interface Order {
  id: number;
  order_number?: string;
  customer_data?: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    fullAddress?: string;
    paymentMethod?: string;
    deliveryMethod?: string;
  };
  items?: Array<{
    id: number;
    name: string;
    size: string;
    color: string;
    image: string;
    price: number;
    article: string;
    quantity: number;
    colorName: string;
    totalPrice: number;
  }>;
  total_amount?: number;
  delivery_cost?: number;
  final_total?: number;
  items_count?: number;
  status?: string;
  created_at: string;
  updated_at: string;
}

const statusOptions = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Новый' },
  { value: 'processing', label: 'Обработка' },
  { value: 'shipped', label: 'Отправлен' },
  { value: 'delivered', label: 'Доставлен' },
  { value: 'cancelled', label: 'Отмена' }
];

const getStatusLabel = (status: string) => {
  // Обрабатываем статус 'pending' как 'new'
  const displayStatus = status === 'pending' ? 'new' : status;
  const option = statusOptions.find(opt => opt.value === displayStatus);
  return option ? option.label : status;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'new':
    case 'pending': return 'bg-blue-100 text-blue-800';
    case 'processing': return 'bg-yellow-100 text-yellow-800';
    case 'shipped': return 'bg-purple-100 text-purple-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const OrdersPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const fetchOrders = async (page = 1, status = 'all', limit?: number, search = searchQuery) => {
    setLoading(true);
    try {
      const currentLimit = limit || pagination?.limit || 20;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: currentLimit.toString()
      });

      if (status && status !== 'all') {
        params.append('status', status === 'new' ? 'pending' : status);
      }

      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const response = await fetch(`/api/orders?${params}` , { signal: abortRef.current.signal });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setOrders(data.orders || []);
      setPagination(data.pagination);
    } catch (error: any) {
      const isAbort = error?.name === 'AbortError' || /aborted/i.test(String(error?.message || ''));
      if (isAbort) return;
      showToast(translateSupabaseError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlSearchQuery = router.query.search as string;
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    } else {
      setSearchQuery('');
    }
    fetchOrders(1, statusFilter, pagination?.limit || 20, urlSearchQuery || '');
  }, [statusFilter, router.query.search]);

  useEffect(() => {
    debouncedSearch(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Автообновление списка раз в 30 секунд
  useEffect(() => {
    const timer = setInterval(() => {
      fetchOrders(pagination?.page || 1, statusFilter, pagination?.limit || 20, searchQuery);
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination?.page || 1, statusFilter, searchQuery]);

    // Убираем автоматическое обновление при возврате на страницу - это создает лишние запросы

  const handlePageChange = (page: number) => {
    // Обновляем состояние пагинации
    setPagination(prev => ({ ...prev, page }));
    
    const query: any = { page: String(page), limit: String(pagination?.limit || 20) };
    if (statusFilter && statusFilter !== 'all') query.status = statusFilter;
    if (searchQuery && searchQuery.trim()) query.search = searchQuery.trim();
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    fetchOrders(page, statusFilter, pagination?.limit || 20, searchQuery);
  };

  const handlePageSizeChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit }));
    const query: any = { page: '1', limit: String(newLimit) };
    if (statusFilter && statusFilter !== 'all') query.status = statusFilter;
    if (searchQuery && searchQuery.trim()) query.search = searchQuery.trim();
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    fetchOrders(1, statusFilter, newLimit, searchQuery);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    const query: any = { page: '1', limit: String(pagination?.limit || 20) };
    if (status && status !== 'all') query.status = status;
    if (searchQuery && searchQuery.trim()) query.search = searchQuery.trim();
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    fetchOrders(1, status, pagination?.limit || 20, searchQuery);
  };

  // Дебаунс поиска + синхронизация URL
  const debouncedSearch = useDebouncedCallback((q: string) => {
    const query: any = { page: '1', limit: String(pagination?.limit || 20) };
    if (statusFilter && statusFilter !== 'all') query.status = statusFilter;
    if (q && q.trim()) query.search = q.trim();
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    fetchOrders(1, statusFilter, pagination?.limit || 20, q);
  }, 500);

  // Удаление заказов запрещено
  const handleDeleteOrder = async (orderNumber: string) => {
    showToast('Удаление заказов запрещено', 'error');
  };

  return (
    <div>
      <div className="flex flex-row justify-between items-center gap-2 mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Заказы</h1>
        <div className="flex items-center gap-3 no-print">
          <button
            onClick={() => window.print()}
            className="btn text-xs flex items-center hover:bg-gray-800 hover:text-white hidden sm:flex"
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

      {/* Табы с поиском */}
      <div className="mb-4 mt-4 sm:mt-0">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="flex gap-2 pb-2 overflow-x-auto -mx-2 px-2">
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusFilterChange(status.value)}
                  className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap ${statusFilter===status.value?'bg-gray-800 text-white':'bg-gray-100 text-gray-800'}`}
                >
                  {status.label}
                </button>
              ))}
            </div>
            
            <div className="relative w-auto no-print">
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
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-grow mt-4">
        <div className="overflow-x-auto flex-grow">
          <table className="table-standard">
            <thead>
              <tr>
                <th className="table-header">№</th>
                <th className="table-header">НОМЕР ЗАКАЗА</th>
                <th className="table-header">ДАТА</th>
                <th className="table-header">ПОЛЬЗОВАТЕЛЬ</th>
                <th className="table-header">СУММА</th>
                <th className="table-header">СТАТУС</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center p-4">
                    <div className="text-gray-500">Загрузка...</div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <div className="text-lg font-medium">
                        {statusFilter === 'all' 
                          ? 'Заказов нет' 
                          : `Заказов со статусом "${statusOptions.find(s => s.value === statusFilter)?.label || statusFilter}" нет`
                        }
                      </div>
                      <div className="text-sm text-gray-400">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Заказы появятся при работе с системой'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => (
                  <tr key={order.id} className="table-row-hover">
                    <td className="table-cell-mono">
                      <Link href={`/orders/${order.id}`} className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono">
                        {String(order.id).padStart(3, '0')}
                      </Link>
                    </td>
                    <td className="table-cell-mono">
                      {order.order_number || `ЗАК-${String(order.id).padStart(6, '0')}`}
                    </td>
                    <td className="table-cell">
                      {new Date(order.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="table-cell">
                      {order.customer_data?.fullName || order.customer_data?.firstName || 'Гость'}
                    </td>
                    <td className="table-cell">
                      {order.final_total ? `${order.final_total} ₽` : order.total_amount ? `${order.total_amount} ₽` : '-'}
                    </td>
                    <td className="table-cell">
                      <span className={`p-1 rounded-full text-xs font-medium ${getStatusColor(order.status || 'pending')}`}>
                        {getStatusLabel(order.status || 'pending').toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Пагинатор */}
        {(pagination?.total || 0) > 0 && (
          <div className="no-print">
            <Paginator
              total={pagination?.total || 0}
              page={pagination?.page || 1}
              limit={pagination?.limit || 20}
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

export default OrdersPage; 