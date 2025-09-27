import { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useToast } from '../../components/ToastContext';
import PageHeader from '../../components/PageHeader';
import {
  UsersIcon,
  CubeIcon,
  ArchiveBoxIcon,
  ShoppingCartIcon,
  ChartPieIcon,
  TagIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline';

interface StatItem {
  label: string;
  value: string | number;
  note: string;
  icon: React.ReactNode;
}

interface TaskItem {
  id: number;
  description: string;
  status: string;

  created_at: string;
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState<StatItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'completed'>('current');

  const loadStats = async () => {
    try {
      const [usersRes, productsRes, warehouseRes, ordersRes] = await Promise.all([
        fetch('/api/users?limit=1'),
        fetch('/api/products?limit=1'),
        fetch('/api/stock?limit=1'),
        fetch('/api/orders?limit=1&status=new')
      ]);

      const usersData = usersRes.ok ? await usersRes.json() : { pagination: { total: 0 } };
      const productsData = productsRes.ok ? await productsRes.json() : { pagination: { total: 0 } };
      const warehouseData = warehouseRes.ok ? await warehouseRes.json() : { pagination: { total: 0 } };
      const ordersData = ordersRes.ok ? await ordersRes.json() : { pagination: { total: 0 } };

      setStats([
        {
          label: 'Пользователи',
          value: usersData.pagination?.total || 0,
          note: 'в системе',
          icon: <UsersIcon className="w-8 h-8 text-gray-400" />
        },
        {
          label: 'Товары',
          value: productsData.pagination?.total || 0,
          note: 'в каталоге',
          icon: <CubeIcon className="w-8 h-8 text-gray-400" />
        },
        {
          label: 'Склад',
          value: warehouseData.pagination?.total || 0,
          note: 'позиций',
          icon: <ArchiveBoxIcon className="w-8 h-8 text-gray-400" />
        },
        {
          label: 'Заказы',
          value: ordersData.pagination?.total || 0,
          note: 'новых',
          icon: <ShoppingCartIcon className="w-8 h-8 text-gray-400" />
        }
      ]);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      showToast('Ошибка загрузки статистики', 'error');
    }
  };

  const loadTasks = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/tasks', { headers: { 'x-user-id': String(user.id) } });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
      showToast('Ошибка загрузки задач', 'error');
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([loadStats(), loadTasks()]).finally(() => setLoading(false));
  }, [user]);

  // Автообновление при возврате на страницу
  useEffect(() => {
    if (!user) return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        Promise.all([loadStats(), loadTasks()]);
      }
    };

    const handleFocus = () => {
      Promise.all([loadStats(), loadTasks()]);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'current') {
      return task.status !== 'completed' && task.status !== 'done';
    } else {
      return task.status === 'completed' || task.status === 'done';
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'new': return 'Новое';
      case 'in_progress': return 'В работе';
      case 'completed': return 'Завершено';
      case 'done': return 'Выполнено';
      default: return status;
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Дашборд менеджера"
        showBackButton
      />
      
      <div className="mb-8">
        <p className="text-gray-600">Обзор системы и управление задачами</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {stat.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.note}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Задачи */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Задачи</h2>
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('current')}
                className={`px-3 py-1 text-sm rounded-md ${
                  activeTab === 'current'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Текущие
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-3 py-1 text-sm rounded-md ${
                  activeTab === 'completed'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Выполненные
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {task.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                      {getStatusDisplayName(task.status).toLowerCase()}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(task.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Нет задач для отображения</p>
          </div>
        )}
      </div>
    </div>
  );
} 