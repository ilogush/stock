import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import type { NextPage } from 'next';
import Link from 'next/link';
import { PencilIcon, TrashIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../components/ToastContext';
import { supabase } from '../../lib/supabaseClient';
import Paginator from '../../components/Paginator';

import { useAuth } from '../../components/AuthContext';
import { useUserRole } from '../../lib/hooks/useUserRole';

type User = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  telegram: string | null;
  role_id: number | null;
  created_at: string;
  avatar_url: string | null;
  updated_at: string;
  role?: {
    id: number;
    name: string;
    display_name: string;
  } | null;
};

type PaginationInfo = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const UsersList: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { hasAnyRole, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Проверка логина; доступ проверяем без редиректов/тостов
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Получаем пользователей через API сервера
  const fetchUsers = async (page = 1, limit = 20, search = searchQuery) => {
    try {
      setLoading(true);
      
      const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (search && search.trim()) query.append('search', encodeURIComponent(search.trim()));
      
      // Просто используем обычный запрос к API без заголовков авторизации
      // - серверная часть уже настроена на использование supabaseAdmin
      const response = await fetch(`/api/users?${query.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Ошибка API:', errorData);
        throw new Error(errorData.error || 'Ошибка при загрузке пользователей');
      }
      
      const data = await response.json();

      
      setUsers((data.data?.users || []).filter((u: any) => u.is_deleted !== true));
      setPagination(data.pagination || {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    } catch (err: any) {
      console.error('Ошибка при загрузке пользователей:', err);
      showToast(err.message, 'error');
      setUsers([]);
      setPagination({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Функция обновления статуса текущего пользователя
  const updateUserStatus = async (userId: number, status: string) => {
    try {
      const response = await fetch('/api/users/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, status })
      });
      
      if (response.ok) {
        // Статус обновлен успешно
      }
    } catch (error) {
      // Ошибка обновления статуса
    }
  };

  useEffect(() => {
    // Получаем поисковый запрос из URL при загрузке страницы
    const urlSearchQuery = router.query.search as string;
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }
    
    // Обновляем статус пользователя при загрузке страницы
    updateUserStatus(1, 'active'); // Временно используем ID 1 для тестирования
    
    fetchUsers(1, 20, urlSearchQuery || '');
    
    // Устанавливаем интервал для периодического обновления статуса
    const statusInterval = setInterval(() => {
      updateUserStatus(1, 'active'); // Временно используем ID 1 для тестирования
    }, 2 * 60 * 1000); // каждые 2 минуты
    
    // Устанавливаем интервал для обновления списка пользователей
    const usersInterval = setInterval(() => {
      fetchUsers(pagination.page, pagination.limit, searchQuery);
    }, 30 * 1000); // каждые 30 секунд
    
    // Очищаем интервалы при размонтировании компонента
    return () => {
      clearInterval(statusInterval);
      clearInterval(usersInterval);
    };
  }, [router.query.search]);

    // Убираем автоматическое обновление при возврате на страницу - это создает лишние запросы

  const handlePageChange = (page: number) => {
    fetchUsers(page, pagination.limit, searchQuery);
  };

  const handleViewUser = (userId: number) => {
    router.push(`/users/${userId}`);
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${userName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при удалении пользователя');
      }

      showToast('Пользователь успешно удален', 'success');
      // Обновляем список пользователей
      fetchUsers(pagination.page, pagination.limit, searchQuery);
    } catch (err: any) {
      console.error('Ошибка при удалении пользователя:', err);
      showToast(err.message, 'error');
    }
  };

  const isAllowed = hasAnyRole(['admin', 'director']);
  if (!user || roleLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500">Проверка прав доступа...</div>
      </div>
    );
  }
  if (!isAllowed) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500">Доступ запрещён</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800">Пользователи</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Поиск справа от заголовка на десктопе, на отдельной строке на мобильных */}
          <div className="relative w-full sm:w-64 order-2 sm:order-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Очищаем предыдущий таймер
                  if (searchTimeout.current) {
                    clearTimeout(searchTimeout.current);
                  }
                  // Добавляем задержку для поиска в реальном времени
                  searchTimeout.current = setTimeout(() => {
                    fetchUsers(1, pagination.limit, e.target.value);
                  }, 500);
                }}
                className="search-input block w-full pl-10 pr-4"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          <Link href="/users/new" className="btn text-xs flex items-center gap-2 order-1 sm:order-2">
                          <PlusIcon className="w-4 h-4" />
            Создать
          </Link>
        </div>
      </div>
      
                              {loading ? (
            <div className="text-center py-4">
              <div className="text-gray-500">Загрузка...</div>
            </div>
          ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table-standard">
              <thead>
                <tr>
                  <th className="table-header">
                    ПОЛЬЗОВАТЕЛЬ
                  </th>
                  <th className="table-header">
                    EMAIL
                  </th>
                  <th className="table-header">
                    ТЕЛЕФОН
                  </th>
                  <th className="table-header">
                    ТЕЛЕГРАМ
                  </th>
                  <th className="table-header">
                    РОЛЬ
                  </th>
                  <th className="table-header">
                    СТАТУС
                  </th>
                </tr>
              </thead>
              <tbody className="table-body">
                {users.map((user) => (
                  <tr key={user.id} className="table-row-hover">
                    <td className="table-cell">
                      <a href={`/users/${user.id}`} className="flex items-center gap-2">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-gray-300" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">—</div>
                        )}
                        <span className="text-sm text-gray-700">
                          {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name || user.last_name || '—'}
                        </span>
                      </a>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">{user.email || '—'}</div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">{user.phone || '—'}</div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">{user.telegram || '—'}</div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {user.role?.display_name || 'Роль не назначена'}
                      </span>
                    </td>
                    <td className="table-cell">
                      {(() => {
                        const timeDiff = Date.now() - new Date(user.updated_at).getTime();
                        const online = timeDiff < 10*60*1000;
                        return (
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <span className={`h-3 w-3 rounded-full ${online?'bg-green-600':'bg-red-500'}`}></span>
                            {online? 'active':'offline'}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
                
                {users.length === 0 && (
                  <tr className="border-t border-b border-gray-200">
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center space-y-2">
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <div className="text-lg font-medium">
                          Пользователи не найдены
                        </div>
                        <div className="text-sm text-gray-400">
                          {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Создайте первого пользователя'}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Пагинатор */}
          <Paginator
            total={pagination.total}
            page={pagination.page}
            limit={pagination.limit}
            onPageChange={handlePageChange}
            onPageSizeChange={(l)=>fetchUsers(1,l, searchQuery)}
          />
        </>
      )}
    </div>
  );
};

export default UsersList; 