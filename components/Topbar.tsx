import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import { 
  Bars3Icon,
  BellIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface TopbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed?: boolean;
  setSidebarCollapsed?: (collapsed: boolean) => void;
}

export default function Topbar({ sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed }: TopbarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newTasksCount, setNewTasksCount] = useState(0);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [newOrders, setNewOrders] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Загружаем количество новых заданий и заказов
  useEffect(() => {
    const loadNewTasksCount = async () => {
      if (!user) return;
      
      try {
        const res = await fetch('/api/tasks', { headers: { 'x-user-id': String(user.id) } });
        const data = await res.json();
        if (res.ok && data.tasks) {
          const newTasks = data.tasks.filter((task: any) => task.status==='new' && task.assignee_id===user.id);
          setNewTasksCount(newTasks.length);
        }
      } catch (error) {
        console.error('Ошибка загрузки заданий:', error);
      }
    };

    const loadNewOrdersCount = async () => {
      try {
        const res = await fetch('/api/orders?status=pending&limit=5');
        const data = await res.json();
        if (res.ok && data.orders) {
          setNewOrders(data.orders);
          setNewOrdersCount(data.orders.length);
        }
      } catch (error) {
        console.error('Ошибка загрузки новых заказов:', error);
      }
    };

    loadNewTasksCount();
    loadNewOrdersCount();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(() => {
      loadNewTasksCount();
      loadNewOrdersCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);



  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
  };

  const handleProfile = () => {
    router.push('/profile');
    setDropdownOpen(false);
  };



  const fullName = user ? `${user.first_name} ${user.last_name}` : 'User';
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5 fixed left-0 right-0 top-0 z-50 no-print">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex justify-start items-center">
          {/* Кнопка гамбургер - доступна на всех устройствах */}
          <button
            onClick={() => {
              if (window.innerWidth >= 1024) {
                // На десктопе переключаем collapsed состояние
                setSidebarCollapsed?.(!sidebarCollapsed);
              } else {
                // На мобильных переключаем открытие/закрытие
                setSidebarOpen(!sidebarOpen);
              }
            }}
            className="p-2 mr-2 text-gray-600 rounded-lg cursor-pointer hover:text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:ring-2 focus:ring-gray-100"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          
          {/* Логотип */}
          <Link href="/" className="flex mr-4">
            <span className="self-center text-2xl font-semibold whitespace-nowrap text-gray-900">
              Logush
            </span>
          </Link>
        </div>

        {/* Правая часть */}
        <div className="flex items-center lg:order-2">

          {/* Уведомления */}
          <div className="flex items-center ml-3">
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900"
              >
                <BellIcon className="w-6 h-6" />
                {(newTasksCount > 0 || newOrdersCount > 0) && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {newTasksCount + newOrdersCount > 99 ? '99+' : newTasksCount + newOrdersCount}
                  </span>
                )}
              </button>

              {/* Выпадающий список уведомлений */}
              {notificationsOpen && (
                <div className="absolute right-0 z-50 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200">
                  <div className="p-4">
                    
                    <div className="space-y-3">
                      {/* Новые заказы */}
                      {newOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Заказ №{order.order_number || String(order.id).padStart(6, '0')}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              router.push(`/orders/${order.id}`);
                              setNotificationsOpen(false);
                            }}
                            className="text-green-600 hover:text-green-800"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Новые задачи */}
                      {newTasksCount > 0 && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Новые задания
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              router.push('/');
                              setNotificationsOpen(false);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Нет уведомлений */}
                      {newTasksCount === 0 && newOrdersCount === 0 && (
                        <div className="text-center py-6">
                          <BellIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Нет новых уведомлений</p>
                        </div>
                      )}
                    </div>


                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Профиль пользователя */}
          <div className="flex items-center ml-3">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                className="flex mx-3 text-sm rounded-full lg:mr-0 focus:ring-4 focus:ring-gray-300"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="sr-only">Открыть меню пользователя</span>
                {user?.avatar_url ? (
                  <img 
                    className="w-8 h-8 rounded-full object-cover border border-gray-300" 
                    src={user.avatar_url} 
                    alt="Аватар пользователя" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                    {initial}
                  </div>
                )}
              </button>

              {/* Dropdown меню */}
              {dropdownOpen && (
                <div className="absolute right-0 z-50 my-4 w-56 text-base list-none bg-white rounded divide-y divide-gray-100 shadow">
                  <div className="py-3 px-4">
                    <span className="block text-sm font-semibold text-gray-900">
                      {user?.first_name} {user?.last_name}
                    </span>
                    <span className="block text-sm text-gray-500 truncate">
                      {user?.email}
                    </span>
                  </div>
                  <ul className="py-1">
                    <li>
                      <button
                        onClick={handleProfile}
                        className="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Профиль
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={handleLogout}
                        className="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Выйти
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 