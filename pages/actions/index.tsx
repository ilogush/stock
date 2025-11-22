import { useEffect, useState, useRef } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import Paginator from '../../components/Paginator';

import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../components/AuthContext';
import { useUserRole } from '../../lib/hooks/useUserRole';
import PageHeader from '../../components/PageHeader';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface UserAction {
  id: number;
  user_id: number;
  action_name: string;
  status: string;
  details: string | null;
  created_at: string;
  user: User | null;
}

type PaginationInfo = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'bg-green-100 text-green-800';
    case 'error': return 'bg-red-100 text-red-800';
    case 'warning': return 'bg-yellow-100 text-yellow-800';
    case 'info': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'success': return 'Успешно';
    case 'error': return 'Ошибка';
    case 'warning': return 'Предупреждение';
    case 'info': return 'Информация';
    default: return status;
  }
};

const ActionsPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { hasAnyRole, loading: roleLoading } = useUserRole();
  
  const [allActions, setAllActions] = useState<UserAction[]>([]);
  const [filteredActions, setFilteredActions] = useState<UserAction[]>([]);
  const [displayedActions, setDisplayedActions] = useState<UserAction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ 
    total: 0, 
    page: 1, 
    limit: 20,
    totalPages: 0 
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Проверяем роль пользователя без тостов/редиректов до загрузки роли
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const fetchActions = async (page = 1, limit = 1000) => {
    try {
      setLoading(true);
      // Загружаем больше данных для локального поиска
      const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      
      const res = await fetch(`/api/actions?${query.toString()}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки действий');
      setAllActions(data.actions || []);
      setPagination(prev => ({ ...prev, total: data.actions?.length || 0 }));
    } catch (err: any) {
      console.error('Ошибка загрузки действий:', err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Функция для очистки истории действий
  const handleClearActions = async () => {
    if (!confirm('Вы уверены, что хотите очистить всю историю действий? Это действие нельзя отменить.')) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/actions/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Ошибка очистки истории');
      
      showToast('История действий очищена', 'success');
      fetchActions(); // Перезагружаем данные
    } catch (err: any) {
      console.error('Ошибка очистки истории:', err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Функция для локального поиска по всем столбцам
  const filterActions = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredActions(allActions);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = allActions.filter(action => {
      // Поиск по дате и времени
      const dateStr = new Date(action.created_at).toLocaleDateString('ru-RU');
      const timeStr = new Date(action.created_at).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const dateTimeStr = `${dateStr} ${timeStr}`;
      
      // Поиск по пользователю
      const userName = action.user ? `${action.user.first_name || ''} ${action.user.last_name || ''}`.toLowerCase() : '';
      const userEmail = action.user?.email?.toLowerCase() || '';
      
      // Поиск по действию
      const actionName = action.action_name.toLowerCase();
      
      // Поиск по статусу
      const status = getStatusLabel(action.status).toLowerCase();
      
      // Поиск по деталям
      const details = (action.details || '').toLowerCase();
      
      return (
        dateTimeStr.includes(term) ||
        userName.includes(term) ||
        userEmail.includes(term) ||
        actionName.includes(term) ||
        status.includes(term) ||
        details.includes(term)
      );
    });
    
    setFilteredActions(filtered);
  };

  // Функция для обновления отображаемых данных с пагинацией
  const updateDisplayedActions = () => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const displayed = filteredActions.slice(startIndex, endIndex);
    setDisplayedActions(displayed);
    
    // Обновляем пагинацию
    const totalPages = Math.ceil(filteredActions.length / pagination.limit);
    setPagination(prev => ({
      ...prev,
      total: filteredActions.length,
      totalPages
    }));
  };

  // Эффект для фильтрации при изменении поиска
  useEffect(() => {
    filterActions(searchQuery);
  }, [searchQuery, allActions]);

  // Эффект для обновления отображаемых данных
  useEffect(() => {
    updateDisplayedActions();
  }, [filteredActions, pagination.page, pagination.limit]);

  useEffect(() => {
    // Получаем поисковый запрос из URL при загрузке страницы
    const urlSearchQuery = router.query.search as string;
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }
    fetchActions(1, pagination.limit);
  }, [router.query.search]);

    // Убираем автоматическое обновление при возврате на страницу - это создает лишние запросы

  // Очищаем таймаут при размонтировании компонента
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  // Показываем загрузку или сообщение о запрете доступа
  const canView = hasAnyRole(['admin', 'director']);
  if (!user || roleLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Проверка прав доступа...</div>
        </div>
      </div>
    );
  }
  if (!canView) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Доступ запрещён</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Действия пользователей"
      >
        {/* Поиск справа от заголовка */}
        <div className="relative w-auto no-print">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const value = e.target.value;
              setSearchQuery(value);
              
              // Очищаем предыдущий таймаут
              if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
              }
              
              // Добавляем задержку для локального поиска
              searchTimeoutRef.current = setTimeout(() => {
                filterActions(value);
              }, 300);
            }}
            className="search-input block w-full"
          />
        </div>
        
        {/* Кнопка очистки для админа */}
        {user?.role_id === 1 && (
          <button
            onClick={handleClearActions}
            className="btn text-xs flex items-center justify-center hover:bg-gray-800 hover:text-white"
            title="Очистить историю действий"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
              />
            </svg>
          </button>
        )}
        
        <button
          onClick={() => window.print()}
          className="btn text-xs flex items-center hover:bg-gray-800 hover:text-white"
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
      </PageHeader>

      {/* Table */}
      <div className="flex flex-col flex-grow mt-4">
        <div className="overflow-x-auto flex-grow">
          {loading ? (
            <div className="text-center py-4">
              <div className="text-gray-500">Загрузка...</div>
            </div>
          ) : (
            <table className="table-standard">
              <thead>
                <tr>
                  <th className="table-header">ДАТА И ВРЕМЯ</th>
                  <th className="table-header">ПОЛЬЗОВАТЕЛЬ</th>
                  <th className="table-header">ДЕЙСТВИЕ</th>
                  <th className="table-header">СТАТУС</th>
                  <th className="table-header">ДЕТАЛИ</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {displayedActions.map((action) => (
                  <tr key={action.id} className="table-row-hover">
                    <td className="table-cell">
                      <a href={`/actions/${action.id}`} className="block">
                        <div className="text-sm">
                          <span className="font-medium">
                            {new Date(action.created_at).toLocaleDateString('ru-RU')}
                          </span>
                          <span className="text-gray-500 ml-2">
                            {new Date(action.created_at).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </a>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm font-medium">
                        {action.user?.first_name || 'Неизвестный'} {action.user?.last_name || 'пользователь'}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm font-medium">
                        {action.action_name}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(action.status)}`}>
                        {getStatusLabel(action.status).toLowerCase()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {action.details || '—'}
                      </div>
                    </td>
                  </tr>
                ))}
                {displayedActions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-gray-500">
                      <div className="flex flex-col items-center space-y-2">
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <div className="text-lg font-medium">
                          Действия не найдены
                        </div>
                        <div className="text-sm text-gray-400">
                          {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Действия появятся при работе с системой'}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Пагинатор */}
        <div className="no-print">
          <Paginator
            total={pagination.total}
            page={pagination.page}
            limit={pagination.limit}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>

      <style jsx>{`
      `}</style>
    </div>
  );
};

export default ActionsPage; 