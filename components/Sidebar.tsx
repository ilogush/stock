import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  UsersIcon,
  CubeIcon,
  Squares2X2Icon,
  ArchiveBoxIcon,
  ArchiveBoxArrowDownIcon,
  PresentationChartLineIcon,
  TruckIcon,
  ShoppingCartIcon,
  ChartPieIcon,
  TagIcon,
  BuildingOffice2Icon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  SwatchIcon
} from '@heroicons/react/24/outline';

type MenuItem = { href: string; label: string; icon: any; badge?: string; roles?: string[]; onClick?: () => void };

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  collapsed?: boolean;
}

export default function Sidebar({ isOpen, setIsOpen, collapsed = false }: SidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);

  useEffect(() => {
    if (user) {
      checkUserRole();
      loadTasksCount();
      loadUnreadMessages();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Обновляем количество непрочитанных сообщений каждые 30 секунд
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      loadUnreadMessages();
    }, 30000);
    
    // Обновляем счетчик при возврате на страницу
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUnreadMessages();
      }
    };

    const handleFocus = () => {
      loadUnreadMessages();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const checkUserRole = async () => {
    try {
      if (user) {
        const rolesResponse = await fetch('/api/roles');
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          const rolesArray = Array.isArray(rolesData) ? rolesData : rolesData.roles || [];
          const role = rolesArray.find((r: any) => r.id === user.role_id);
          setUserRole(role?.name || null);
        }
      }
    } catch (error) {
      console.error('Ошибка получения роли:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasksCount = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/tasks', {
        headers: { 'x-user-id': String(user.id) }
      });
      if (res.ok) {
        const data = await res.json();
        const newTasks = (data.tasks || []).filter((t: any)=> t.status==='new');
        setTasksCount(newTasks.length);
      }
    } catch (e) {
      console.error('Ошибка загрузки задач:', e);
    }
  };

  const loadUnreadMessages = async () => {
    if (!user) return;
    try {
      // Получаем время последнего прочтения из localStorage
      const lastReadAt = localStorage.getItem(`chat_last_read_${user.id}`);
      
      const url = lastReadAt 
        ? `/api/chat/unread-count?user_id=${user.id}&last_read_at=${encodeURIComponent(lastReadAt)}`
        : `/api/chat/unread-count?user_id=${user.id}`;
        
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUnreadMessages(data.unread_count || 0);
      }
    } catch (e) {
      console.error('Ошибка загрузки непрочитанных сообщений:', e);
    }
  };

  const handleChatClick = () => {
    // Обновляем счетчик уведомлений при клике на чат
    loadUnreadMessages();
  };

  const getMenuItems = (): MenuItem[] => {
    // Базовое меню для всех
    const baseMenu = [
      { href: '/', label: 'Дашборд', icon: PresentationChartLineIcon }
    ];

    // Пользователь - базовый доступ (только дашборд, профиль, чат)
    if (userRole === 'user') {
      return [
        { href: '/', label: 'Дашборд', icon: PresentationChartLineIcon },
        { href: '/chat', label: 'Общий чат', icon: ChatBubbleLeftRightIcon, badge: unreadMessages > 0 ? String(unreadMessages) : undefined, onClick: handleChatClick }
      ];
    }

    // Кладовщик - просмотр товаров, склада, поступлений/реализации, создание цветов
    if (userRole === 'storekeeper') {
      return [
        { href: '/', label: 'Дашборд', icon: PresentationChartLineIcon },
        { href: '/products', label: 'Товары', icon: CubeIcon },
        { href: '/stock', label: 'Склад', icon: ArchiveBoxIcon },
        { href: '/receipts', label: 'Поступления', icon: ArrowDownTrayIcon },
        { href: '/realization', label: 'Реализация', icon: TruckIcon },
        { href: '/colors', label: 'Цвета', icon: SwatchIcon },
        { href: '/chat', label: 'Общий чат', icon: ChatBubbleLeftRightIcon, badge: unreadMessages > 0 ? String(unreadMessages) : undefined, onClick: handleChatClick }
      ];
    }

    // Менеджер - все как админ, кроме "Действия", "Пользователи", "Бренды" и "Компании"
    if (userRole === 'manager') {
      return [
        { href: '/', label: 'Дашборд', icon: PresentationChartLineIcon },
        { href: '/products', label: 'Товары', icon: CubeIcon },
        { href: '/stock', label: 'Склад', icon: ArchiveBoxIcon },
        { href: '/receipts', label: 'Поступления', icon: ArrowDownTrayIcon },
        { href: '/realization', label: 'Реализация', icon: TruckIcon },
        { href: '/orders', label: 'Заказы', icon: ShoppingCartIcon },
        { href: '/colors', label: 'Цвета', icon: SwatchIcon },
        { href: '/chat', label: 'Общий чат', icon: ChatBubbleLeftRightIcon, badge: unreadMessages > 0 ? String(unreadMessages) : undefined, onClick: handleChatClick }
      ];
    }

    // Администратор - полный доступ
    if (userRole === 'admin') {
      return [
        { href: '/', label: 'Дашборд', icon: PresentationChartLineIcon },
        { href: '/products', label: 'Товары', icon: CubeIcon },
        { href: '/stock', label: 'Склад', icon: ArchiveBoxIcon },
        { href: '/receipts', label: 'Поступления', icon: ArrowDownTrayIcon },
        { href: '/realization', label: 'Реализация', icon: TruckIcon },
        { href: '/orders', label: 'Заказы', icon: ShoppingCartIcon },
        { href: '/brands', label: 'Бренды', icon: TagIcon },
        { href: '/companies', label: 'Компании', icon: BuildingOffice2Icon },
        { href: '/actions', label: 'Действия', icon: ClockIcon },
        { href: '/colors', label: 'Цвета', icon: SwatchIcon },
        { href: '/users', label: 'Пользователи', icon: UsersIcon },
        { href: '/chat', label: 'Общий чат', icon: ChatBubbleLeftRightIcon, badge: unreadMessages > 0 ? String(unreadMessages) : undefined, onClick: handleChatClick }
      ];
    }

    // По умолчанию - базовый доступ
    return baseMenu;
  };

  if (loading) {
    return (
              <aside className={`fixed top-0 left-0 z-40 h-screen ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } bg-white border-r border-gray-200 ${collapsed ? 'w-16' : 'w-60'} lg:translate-x-0`}>
        <div className="h-full px-3 py-4 overflow-y-auto">
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-500 text-sm">Загрузка</div>
          </div>
        </div>
      </aside>
    );
  }

  const menuItems = getMenuItems();

  return (
    <>
      {/* Overlay для мобильных */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-gray-900/50 lg:hidden" 
          onClick={() => setIsOpen(false)}
        ></div>
      )}
      
      {/* Sidebar */}
              <aside className={`fixed top-0 left-0 z-40 h-screen ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } bg-white border-r border-gray-200 ${collapsed ? 'w-16' : 'w-60'} lg:translate-x-0`}>
        <div className="h-full px-3 py-4 overflow-y-auto">
          <nav className="space-y-2 mt-16">
            <ul className="space-y-1">
              {menuItems
                .filter(item => !item.roles || item.roles.includes(userRole || ''))
                .map(({ href, label, icon: Icon, badge, onClick }) => {
                  const active = router.pathname === href || router.pathname.startsWith(href + '/');
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={`flex items-center ${collapsed ? 'justify-center' : ''} p-2 text-gray-900 rounded-lg hover:bg-gray-100 group ${
                          active ? 'bg-gray-100 text-blue-700' : ''
                        } ${collapsed ? 'w-10 h-10' : ''}`}
                        onClick={() => {
                          setIsOpen(false);
                          if (onClick) onClick();
                        }}
                        title={collapsed ? label : ''}
                      >
                        <Icon className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'} ${
                          active ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-900'
                        }`} />
                        {!collapsed && (
                          <>
                            <span className="ml-3 flex-1 whitespace-nowrap">{label}</span>
                            {badge && (
                              <span className="inline-flex items-center justify-center w-3 h-3 p-3 ml-3 text-sm font-medium text-blue-800 bg-blue-100 rounded-full">
                                {badge}
                              </span>
                            )}
                          </>
                        )}
                        {collapsed && badge && (
                          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
                            {badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
} 