import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PageHeader from '../../components/PageHeader';
import { PencilIcon, TrashIcon, EyeIcon, ArrowLeftIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../components/AuthContext';

interface OrderItem {
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
  brand?: string;
}

interface CustomerData {
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
}

interface Order {
  id: number;
  order_number?: string;
  customer_data?: CustomerData;
  items?: OrderItem[];
  total_amount?: number;
  delivery_cost?: number;
  final_total?: number;
  items_count?: number;
  status?: string;
  created_at: string;
  updated_at: string;
}

interface StatusHistoryItem {
  id: number;
  status: string;
  comment: string;
  created_at: string;
  status_label: string;
}

interface StatusHistory {
  order_number: string;
  current_status: string;
  history: StatusHistoryItem[];
}

export default function OrderView() {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${id}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else {
        setError('Ошибка загрузки заказа');
      }
    } catch (err) {
      setError('Ошибка загрузки заказа');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Новый';
      case 'processing': return 'В обработке';
      case 'shipped': return 'Отправлен';
      case 'delivered': return 'Доставлен';
      case 'cancelled': return 'Отменен';
      default: return 'Неизвестно';
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!order || updatingStatus) return;
    
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id ? String(user.id) : '',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        showToast(data.message, 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Ошибка обновления статуса', 'error');
      }
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      showToast('Ошибка обновления статуса', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      'new': 'processing',
      'processing': 'shipped',
      'shipped': 'delivered',
      'delivered': 'delivered', // Конечный статус
      'cancelled': 'cancelled' // Конечный статус
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || currentStatus;
  };

  const canUpdateStatus = (currentStatus: string) => {
    return currentStatus !== 'delivered' && currentStatus !== 'cancelled';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error || 'Заказ не найден'}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/orders')}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">
            Заказ №{order.order_number || String(order.id).padStart(6, '0')}
          </h1>
        </div>
        <button
          onClick={() => window.print()}
          className="btn text-xs flex items-center"
        >
          <PrinterIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-6 print-content">
        {/* Заголовок заказа для печати */}
        <div className="print-only text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Заказ №{order.order_number || String(order.id).padStart(6, '0')}
          </h1>
          <p className="text-lg text-gray-600">
            Дата: {new Date(order.created_at).toLocaleDateString('ru-RU')}
          </p>
        </div>

        {/* Основная информация о заказе */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Информация о заказе</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Номер заказа</h3>
              <p className="text-gray-900 text-sm">{order.order_number || `ЗАК-${String(order.id).padStart(6, '0')}`}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Дата создания</h3>
              <p className="text-gray-900 text-sm">{new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Клиент</h3>
              <p className="text-gray-900 text-sm">{order.customer_data?.fullName || order.customer_data?.firstName || 'Гость'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Email</h3>
              <p className="text-gray-900 text-sm">{order.customer_data?.email || '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Телефон</h3>
              <p className="text-gray-900 text-sm">{order.customer_data?.phone || '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Статус</h3>
              <p className="text-gray-900 text-sm capitalize">{order.status === 'pending' ? 'новый' : order.status || 'новый'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Количество товаров</h3>
              <p className="text-gray-900 text-sm">{order.items_count || order.items?.length || 0}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Сумма заказа</h3>
              <p className="text-gray-900 text-sm">{order.total_amount ? `${order.total_amount} ₽` : '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Доставка</h3>
              <p className="text-gray-900 text-sm">{order.delivery_cost ? `${order.delivery_cost} ₽` : '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Итого</h3>
              <p className="text-gray-900 text-sm font-bold">{order.final_total ? `${order.final_total} ₽` : order.total_amount ? `${order.total_amount} ₽` : '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Способ оплаты</h3>
              <p className="text-gray-900 text-sm">{order.customer_data?.paymentMethod || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Адрес доставки</h3>
              <p className="text-gray-900 text-sm">{order.customer_data?.fullAddress || order.customer_data?.address || '-'}</p>
            </div>
          </div>
        </div>

        {/* Товары в заказе */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Товары в заказе</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ФОТО</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ТОВАР</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">БРЕНД</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">АРТИКУЛ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">РАЗМЕР</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ЦВЕТ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ЦЕНА</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">КОЛ-ВО</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">СУММА</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.brand || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.article}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.size}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.colorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.price} ₽</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.totalPrice} ₽</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      Итого:
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {order.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0)} ₽
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Управление статусом заказа */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 no-print">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Управление статусом заказа</h2>
          
          {/* Текущий статус */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Текущий статус:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status === 'pending' ? 'new' : order.status || 'new')}`}>
                {getStatusLabel(order.status === 'pending' ? 'new' : order.status || 'new')}
              </span>
            </div>
          </div>

          {/* Кнопки управления статусом */}
          <div className="space-y-3">
            {/* Кнопка следующего статуса */}
            {canUpdateStatus(order.status === 'pending' ? 'new' : order.status || 'new') && (
              <button
                onClick={() => updateOrderStatus(getNextStatus(order.status === 'pending' ? 'new' : order.status || 'new'))}
                disabled={updatingStatus}
                className="btn text-sm font-medium flex items-center gap-2"
              >
                {updatingStatus ? (
                  <>
                    <div className="text-gray-500">Загрузка...</div>
                    Обновление...
                  </>
                ) : (
                  <>
                    Перевести в статус: {getStatusLabel(getNextStatus(order.status === 'pending' ? 'new' : order.status || 'new'))}
                  </>
                )}
              </button>
            )}

            {/* Кнопка отмены заказа */}
            {canUpdateStatus(order.status === 'pending' ? 'new' : order.status || 'new') && (
              <button
                onClick={() => {
                  if (confirm('Вы уверены, что хотите отменить заказ? Это действие нельзя отменить.')) {
                    updateOrderStatus('cancelled');
                  }
                }}
                disabled={updatingStatus}
                className="btn text-sm font-medium flex items-center gap-2"
              >
                {updatingStatus ? (
                  <>
                    <div className="text-gray-500">Загрузка...</div>
                    Отмена...
                  </>
                ) : (
                  'Отменить заказ'
                )}
              </button>
            )}

            {/* Информация о завершенных заказах */}
            {!canUpdateStatus(order.status === 'pending' ? 'new' : order.status || 'new') && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">
                  {order.status === 'delivered' 
                    ? 'Заказ доставлен. Дальнейшие изменения невозможны.'
                    : 'Заказ отменен. Дальнейшие изменения невозможны.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
} 