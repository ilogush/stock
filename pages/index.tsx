import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../components/ToastContext';
import {
  ArchiveBoxIcon,
  ArchiveBoxArrowDownIcon,
  TruckIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  ChartBarIcon,
  UsersIcon,
  XMarkIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthContext';
import Paginator from '../components/Paginator';
import TaskModal from '../components/TaskModal';


interface TaskStatus {
  id: number;
  code: string;
  display_name: string;
  sort_order: number;
}

interface UserItem {
  id: number;
  first_name: string;
  last_name: string;
}

interface BrandSummary {
  id: number;
  name: string;
  products: number;
}

interface TaskItem {
  id: number | string;
  task_number?: string; // для будущего расширения
  title?: string;
  description: string;
  status: 'new' | 'in_progress' | 'done';
  created_at: string;
  is_notification?: boolean;
  notification_type?: 'error' | 'warning' | 'info';
  brand_id?: number;
  brand_name?: string;
  count?: number;
  product_id?: number;
  product_name?: string;
  product_article?: string;
  issue?: string;
}

const Dashboard: NextPage = () => {
  const [stats, setStats] = useState<Array<any>>([]);
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const router = useRouter();
  const { showToast } = useToast();
  // Общие задачи
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskTab, setTaskTab] = useState<'current' | 'closed' | 'created'>('current');
  // Статусы задач
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  // Модальное окно создания задачи
  const [showTaskModal, setShowTaskModal] = useState(false);
  // Модальное окно просмотра задачи
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskViewModal, setShowTaskViewModal] = useState(false);
  

  const [users, setUsers] = useState<UserItem[]>([]);
  const [description, setDescription] = useState('');
  const [assigneeSelect, setAssigneeSelect] = useState<number>(0);
  const [assignees, setAssignees] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [taskLimit, setTaskLimit] = useState(20);
  const [ordersStats, setOrdersStats] = useState({ new: 0, processed: 0 });
  const [brands, setBrands] = useState<BrandSummary[]>([]);

  // Функция для обновления статуса пользователя
  const updateUserStatus = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/users/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, status: 'online' })
      });
      
      if (response.ok) {
        // Статус обновлен успешно
      }
    } catch (error) {
      // Ошибка обновления статуса
    }
  };

  useEffect(() => {
    // Получаем поисковый запрос из URL
    const { search } = router.query;
    if (search && typeof search === 'string') {
      setSearchQuery(search);
    }

    // Обновляем статус пользователя при загрузке страницы
    updateUserStatus();

    // Устанавливаем интервал для периодического обновления статуса
    const statusInterval = setInterval(updateUserStatus, 2 * 60 * 1000); // каждые 2 минуты

    // Очищаем интервал при размонтировании компонента
    return () => clearInterval(statusInterval);
  }, [router.query, user]);

    // Убираем автоматическое обновление при возврате на страницу - это создает лишние запросы

  // Определяем роль пользователя по role_id
  useEffect(() => {
    if (user?.role_id) {
      // Определяем роль через функцию mapRoleIdToName
      const role = mapRoleIdToName(user.role_id);
      setUserRole(role);
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const ts = Date.now();
      const [usersRes, onlineRes, summaryRes, userStatsRes] = await Promise.all([
        fetch('/api/users?limit=1'),
        fetch('/api/users/online-count'),
        fetch(`/api/stock/monthly-summary?t=${ts}`),
        fetch(`/api/users/user-stats?user_id=${user?.id}&t=${ts}`)
      ]);

      const usersData = usersRes.ok ? await usersRes.json() : { pagination: { total: 0 } };
      const onlineData = onlineRes.ok ? await onlineRes.json() : { online: 0 };
      const summary = summaryRes.ok ? await summaryRes.json() : {};
      const userStatsData = userStatsRes.ok ? await userStatsRes.json() : {};

      const totalUsers = usersData.pagination?.total || 0;
      const onlineUsers = onlineData.online || 0;

      setStats([
        {
          label: 'Пользователи',
          value: `${totalUsers}/${onlineUsers}`,
          note: 'онлайн',
          icon: <UsersIcon className="w-8 h-8 text-gray-400" />
        },
        {
          label: 'Поступления',
          value: userStatsData.receipts || 0,
          note: 'за месяц',
          icon: <ArchiveBoxArrowDownIcon className="w-8 h-8 text-gray-400" />
        },
        {
          label: 'Реализация',
          value: userStatsData.realization || 0,
          note: 'за месяц',
          icon: <TruckIcon className="w-8 h-8 text-gray-400" />
        },
        {
          label: 'Всего товаров',
          value: summary.totalInStock || 0,
          note: 'на складе',
          icon: <ArchiveBoxIcon className="w-8 h-8 text-gray-400" />
        },
        { label: 'Заказы', value: `${ordersStats.new}/${ordersStats.processed}`, note: 'новые/обработанные', icon: <ShoppingCartIcon className="w-8 h-8 text-gray-400" /> },
        { label: 'Продажи', value: '₽ 0', diff: '+0% за месяц', icon: <CurrencyDollarIcon className="w-8 h-8 text-gray-400" /> }
      ]);
        } catch (err) {
          console.error('Ошибка загрузки статистики:', err);
          setStats([
            { label: 'Пользователи', value: '0/0', note: 'онлайн', icon: <UsersIcon className="w-8 h-8 text-gray-400" /> },
            { label: 'Поступления', value: 0, note: 'за месяц', icon: <ArchiveBoxArrowDownIcon className="w-8 h-8 text-gray-400" /> },
            { label: 'Реализация', value: 0, note: 'за месяц', icon: <TruckIcon className="w-8 h-8 text-gray-400" /> },
            { label: 'Всего товаров', value: 0, note: 'на складе', icon: <ArchiveBoxIcon className="w-8 h-8 text-gray-400" /> },
            { label: 'Заказы', value: `${ordersStats.new}/${ordersStats.processed}`, note: 'новые/обработанные', icon: <ShoppingCartIcon className="w-8 h-8 text-gray-400" /> },
            { label: 'Продажи', value: '₽ 0', diff: '+0% за месяц', icon: <CurrencyDollarIcon className="w-8 h-8 text-gray-400" /> }
          ]);
        }
      };

  useEffect(() => {
    // Загружаем статистику
    loadStats();

    // автообновление: фокус вкладки + интервал 10с
    const onFocus = () => loadStats();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(loadStats, 10000);
    return () => { window.removeEventListener('focus', onFocus); clearInterval(interval); };
  }, [userRole]);



  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Получение цвета статуса
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'new': 'bg-green-100 text-green-800',
      'viewed': 'bg-orange-100 text-orange-800', 
      'in_progress': 'bg-blue-100 text-blue-800',
      'done': 'bg-gray-200 text-gray-800',
      'completed': 'bg-gray-200 text-gray-800' // для обратной совместимости
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };



  const mapRoleIdToName = (id: number): string => {
    switch(id) {
      case 1: return 'admin';
      case 2: return 'storekeeper';
      case 3: return 'brigadir';
      case 4: return 'manager';
      case 5: return 'director';
      case 6: return 'sales_manager';
      case 7: return 'brand_manager';
      case 8: return 'user';
      case 9: return 'production_manager';
      case 10: return 'accountant';
      default: return 'user';
    }
  };

  const loadTasks = async () => {
    setTasksLoading(true);
    try {
      const res = await fetch('/api/tasks', { headers: { 'x-user-id': String(user?.id || '') } });
      const data = await res.json();
      if (res.ok) setTasks(data.tasks || []);
    } catch {}
    setTasksLoading(false);
  };

  useEffect(()=>{ 
    loadTasks(); 
    loadTaskStatuses();
    loadUsers();
    loadOrdersStats();
    loadBrandsSummary();
    
    // Автоматическое обновление задач и статистики каждые 5 минут для всех
    let tasksInterval: NodeJS.Timeout | undefined;
    let statsInterval: NodeJS.Timeout | undefined;
    
    tasksInterval = setInterval(() => {
      loadTasks();
      loadOrdersStats();
    }, 300000); // 5 минут (300 секунд)
    
    // eslint-disable-next-line
    return () => {
      if (tasksInterval) {
        clearInterval(tasksInterval);
      }
      if (statsInterval) {
        clearInterval(statsInterval);
      }
    };
  },[user, userRole]);

  const loadTaskStatuses = async () => {
    try {
      const res = await fetch('/api/tasks/statuses');
      const data = await res.json();
      if (res.ok) setTaskStatuses(data.statuses || []);
    } catch (error) {
      console.error('Ошибка загрузки статусов:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users?limit=1000');
      const data = await res.json();
      if (res.ok) setUsers(data.data?.users || data.users || []);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const loadOrdersStats = async () => {
    try {
      // Получаем новые заказы (pending)
      const newRes = await fetch('/api/orders?status=pending&limit=1000');
      const newData = await newRes.json();
      const newCount = newData.orders?.length || 0;

      // Получаем обработанные заказы (processing, shipped, delivered)
      const processedRes = await fetch('/api/orders?status=processing,shipped,delivered&limit=1000');
      const processedData = await processedRes.json();
      const processedCount = processedData.orders?.length || 0;

      setOrdersStats({ new: newCount, processed: processedCount });
    } catch (error) {
      console.error('Ошибка загрузки статистики заказов:', error);
    }
  };

  const loadBrandsSummary = async () => {
    
    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      const allBrands = data.brands || [];
      const managed = allBrands.filter((b: any) => (b.managers || []).some((m: any) => m.id === user?.id));

      const summaries: BrandSummary[] = await Promise.all(
        managed.map(async (brand: any) => {
          try {
            const prRes = await fetch(`/api/products?limit=1&brand=${brand.id}`);
            const prData = await prRes.json();
            const total = prData.pagination?.total || 0;
            return { id: brand.id, name: brand.name, products: total };
          } catch {
            return { id: brand.id, name: brand.name, products: 0 };
          }
        })
      );
      setBrands(summaries);
    } catch (e) {
      console.error('Ошибка загрузки брендов:', e);
    }
  };


  const addAssignee = () => {
    if (!assigneeSelect) return;
    if (assignees.includes(assigneeSelect)) {
      showToast('Исполнитель уже добавлен', 'error');
      return;
    }
    setAssignees([...assignees, assigneeSelect]);
    setAssigneeSelect(0);
  };

  const createTask = async () => {
    if (assignees.length === 0) {
      showToast('Добавьте хотя бы одного исполнителя', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Введите описание задания', 'error');
      return;
    }
    
    try {
      setCreating(true);
      const payload = { description, assignee_ids: assignees };
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': String(user?.id || '') },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast('Задание создано', 'success');
      setShowTaskModal(false);
      setDescription('');
      setAssignees([]);
      loadTasks(); // Перезагружаем задачи
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const getStatusDisplayName = (statusCode: string) => {
    const statusMap: { [key: string]: string } = {
      'new': 'Новый',
      'viewed': 'Просмотренно',
      'in_progress': 'В процессе',
      'done': 'Выполненно',
      'completed': 'Выполненно' // для обратной совместимости
    };
    return statusMap[statusCode] || statusCode;
  };

  // --- Пагинация для таблицы задач ---
  const filteredTasks = tasks.filter((t: any) => {
    if (taskTab==='current') return (t.status!=='completed' && t.status!=='done') && t.assignee_id===user?.id;
    if (taskTab==='closed') return (t.status==='completed' || t.status==='done') && t.assignee_id===user?.id;
    if (taskTab==='created') return t.author_id===user?.id;
    return true;
  });

  const totalTaskPages = Math.max(1, Math.ceil(filteredTasks.length / taskLimit));
  const pagedTasks = filteredTasks.slice((taskPage-1)*taskLimit, taskPage*taskLimit);

  // Функция для определения ссылки карточки
  const getCardLink = (label: string) => {
    switch(label) {
      case 'Заказы':
        return '/orders';
      case 'Поступления':
        return '/receipts';
      case 'Реализация':
        return '/realization';
      case 'Склад':
        return '/stock';
      case 'Пользователи':
        return '/users';
      case 'Всего товаров':
        return '/stock';
      case 'Товары':
        return '/products';
      case 'Цвета':
        return '/colors';
      case 'Бренды':
        return '/brands';
      case 'Компании':
        return '/companies';
      case 'Задания':
        return '/tasks';
      case 'Средний чек':
        return null;
      case 'Продажи':
        return null;
      default:
        return null;
    }
  };


  
  return (
    <>
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 mb-8">
        {stats.map((s) => {
          const cardLink = getCardLink(s.label);
          
          const cardContent = (
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-start hover:bg-gray-50 cursor-pointer">
              <span className="text-gray-800 text-sm mb-1 flex items-center justify-between w-full">
                <span>{s.label}</span>
                {s.icon || (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/></svg>
                )}
              </span>
              <span className="text-2xl font-semibold text-gray-800">{s.value}</span>
              {s.diff && <span className={`${s.diffColor || 'text-green-500'} text-xs mt-1`}>{s.diff}</span>}
              {s.note && <span className="text-gray-800 text-xs mt-1">{s.note}</span>}
            </div>
          );

          return cardLink ? (
            <button
              key={s.label}
              onClick={() => router.push(cardLink)}
              className="text-left w-full"
            >
              {cardContent}
            </button>
          ) : (
            <div key={s.label}>
              {cardContent}
            </div>
          );
        })}
      </div>

      {/* Валидация товаров - только для админов и менеджеров */}
      

      {/* Единая секция заданий */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-gray-800">Задания</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
          <button
            onClick={() => setShowTaskModal(true)}
            className="btn text-xs flex items-center gap-2 hover:bg-gray-800 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Создать задание
          </button>
        </div>

        {/* Табы для всех пользователей */}
        <div className="flex gap-2 pb-2 text-xs">
          {[
            {key:'current',label:'Текущие'},
            {key:'closed',label:'Выполненные'},
            {key:'created',label:'Созданные'}
          ].map((t: any) => (
            <button key={t.key} onClick={()=>{setTaskTab(t.key as any); setTaskPage(1);}} className={`px-3 py-1 rounded-full border ${taskTab===t.key?'bg-gray-800 text-white':'bg-gray-100 text-gray-800'}`}>{t.label}</button>
          ))}
        </div>

        {/* Содержимое для всех пользователей */}
        <>
          {tasksLoading ? (
            <p className="text-center text-gray-500 py-4">Загрузка…</p>
          ) : tasks.length===0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="flex flex-col items-center space-y-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-12 h-12 text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                </svg>
                <div className="text-lg font-medium">
                  {taskTab === 'current' ? 'Текущих заданий нет' : 
                   taskTab === 'closed' ? 'Выполненных заданий нет' : 
                   'Созданных заданий нет'}
                </div>
                <div className="text-sm text-gray-400">
                  {taskTab === 'current' ? 'Создайте первое задание' : 
                   taskTab === 'closed' ? 'Выполненные задания появятся здесь' : 
                   'Созданные задания появятся здесь'}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4">ID</th>
                    <th className="py-2 pr-4">Дата</th>
                    <th className="py-2 pr-4">Время</th>
                    <th className="py-2 pr-4">Автор</th>
                    <th className="py-2 pr-4">Исполнитель</th>
                    <th className="py-2 pr-4">Описание</th>
                    <th className="py-2 pr-4">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTasks.map((t: any, index: number) => {
                    // Специальное отображение для уведомлений бренд-менеджера
                    if (t.is_notification) {
                      const notificationIcon = t.notification_type === 'error' ? '🔴' : t.notification_type === 'warning' ? '🟡' : '🔵';
                      const notificationBg = t.notification_type === 'error' ? 'bg-red-50 border-red-200' : 
                                            t.notification_type === 'warning' ? 'bg-yellow-50 border-yellow-200' : 
                                            'bg-blue-50 border-blue-200';
                      
                      return (
                        <tr key={t.id} className={`border-b border-gray-100 hover:bg-gray-50 ${notificationBg}`}>
                          <td className="py-2 pr-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{notificationIcon}</span>
                              <span className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs table-cell-mono">
                                {String(index + 1).padStart(3, '0')}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-gray-800">{new Date(t.created_at).toLocaleDateString()}</td>
                          <td className="py-2 pr-4 text-gray-800">{new Date(t.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                          <td className="py-2 pr-4 text-gray-800">Система</td>
                          <td className="py-2 pr-4 text-gray-800">Бренд-менеджер</td>
                          <td className="py-2 pr-4 text-gray-800 max-w-md">
                            <div>
                              <div className="font-medium">{t.title}</div>
                              <div className="text-sm opacity-90">{t.description}</div>
                              {t.product_article && (
                                <div className="text-xs opacity-75 mt-1">Артикул: {t.product_article}</div>
                              )}
                              {t.issue && (
                                <div className="text-xs text-red-600 mt-1">Проблема: {t.issue}</div>
                              )}
                              {t.brand_name && (
                                <div className="text-xs opacity-75 mt-1">Бренд: {t.brand_name}</div>
                              )}
                              {t.product_id && (
                                <button 
                                  onClick={() => router.push(`/products/${t.product_id}`)}
                                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                >
                                  Редактировать товар →
                                </button>
                              )}
                              {t.brand_id && !t.product_id && (
                                <button 
                                  onClick={() => router.push(`/products?brand=${t.brand_id}`)}
                                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                >
                                  Просмотреть товары →
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2 pr-4">
                            <span className="text-xs rounded-full px-2 py-1 bg-gray-100 text-gray-800">
                              {getStatusDisplayName(t.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    
                    // Обычное отображение для заданий
                    return (
                      <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4">
                          <button 
                            onClick={() => {
                              setSelectedTask(t);
                              setShowTaskViewModal(true);
                            }} 
                            className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono"
                          >
                            {String(t.id).padStart(3, '0')}
                          </button>
                        </td>
                        <td className="py-2 pr-4 text-gray-800">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td className="py-2 pr-4 text-gray-800">{new Date(t.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                        <td className="py-2 pr-4 text-gray-800">{(() => {
                          const author = users.find(u=>u.id===t.author_id);
                          return author ? `${author.first_name} ${author.last_name}` : '—';
                        })()}</td>
                        <td className="py-2 pr-4 text-gray-800">{(() => {
                          const assignee = users.find(u=>u.id===t.assignee_id);
                          return assignee ? `${assignee.first_name} ${assignee.last_name}` : '—';
                        })()}</td>
                        <td className="py-2 pr-4 text-gray-800 truncate max-w-xs">{t.description}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs rounded-full px-2 py-1 ${getStatusColor(t.status)}`}>{getStatusDisplayName(t.status).toLowerCase()}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Информация о брендах */}
          {brands.length > 0 && (
            <div className="mt-8">
              <h4 className="text-md font-medium text-gray-800 mb-4">Ваши бренды</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">Название бренда</th>
                      <th className="py-2 pr-4">Количество товаров</th>
                      <th className="py-2 pr-4">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brands.map((brand, index) => (
                      <tr key={brand.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4">
                          <span className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs table-cell-mono">
                            {String(index + 1).padStart(3, '0')}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-800 font-medium">{brand.name}</td>
                        <td className="py-2 pr-4 text-gray-800">{brand.products}</td>
                        <td className="py-2 pr-4">
                          <button 
                            onClick={() => router.push(`/products?brand=${brand.id}`)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Товары →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Пагинация для задач */}
          {filteredTasks.length > taskLimit && (
            <div className="mt-4">
              <Paginator
                total={filteredTasks.length}
                page={taskPage}
                limit={taskLimit}
                onPageChange={setTaskPage}
              />
            </div>
          )}
        </>
      </div>



      {/* Модальное окно создания задачи */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Новое задание</h2>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Исполнители */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={assigneeSelect}
                  onChange={(e) => setAssigneeSelect(Number(e.target.value))}
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value={0}>Выберите исполнителя</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={addAssignee}
                  className="btn text-sm flex items-center gap-2 justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Добавить исполнителя
                </button>
              </div>

              {/* Список выбранных исполнителей */}
              {assignees.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {assignees.map((id) => {
                    const usr = users.find((u) => u.id === id);
                    if (!usr) return null;
                    return (
                      <span key={id} className="bg-gray-200 text-gray-800 text-sm rounded px-3 py-1 flex items-center gap-2">
                        {usr.first_name} {usr.last_name}
                        <button 
                          onClick={() => setAssignees(assignees.filter((a) => a !== id))} 
                          className="text-gray-600 hover:text-gray-900"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}



              {/* Описание */}
              <textarea
                placeholder="Описание задания"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border rounded px-3 py-2 text-sm w-full h-32 resize-y"
              />

              {/* Кнопки */}
              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="btn text-sm"
                  disabled={creating}
                >
                  Отмена
                </button>
                <button
                  onClick={createTask}
                  className="btn text-sm hover:bg-gray-800 hover:text-white border-gray-800"
                  disabled={creating || assignees.length === 0 || !description.trim()}
                >
                  {creating ? 'Создание...' : 'Создать задание'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра задачи */}
      <TaskModal
        task={selectedTask}
        isOpen={showTaskViewModal}
        onClose={() => {
          setShowTaskViewModal(false);
          setSelectedTask(null);
        }}
        onStatusChange={() => {
          loadTasks(); // Обновляем список задач после изменения статуса
        }}
      />
    </>
  );
};

export default Dashboard; 