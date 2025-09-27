import { NextPage } from 'next';
import { useEffect, useState, useRef } from 'react';
import { useUserRole } from '../../lib/hooks/useUserRole';
import { useRouter } from 'next/router';
import { PencilIcon, TrashIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';

import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../components/AuthContext';
import ColorModal from '../../components/ColorModal';
import { getHexFromName } from '../../lib/unifiedColorService';

interface Color {
  id: string;
  name: string;
  hex_value?: string;
  created_at: string;
  product_count?: number;
}

const ColorsPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { roleName, hasAnyRole } = useUserRole();

  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);

  // Проверяем права доступа - доступ для всех авторизованных пользователей
  const hasAccess = !!user;

  const fetchColors = async (search = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', encodeURIComponent(search.trim()));
      // Загружаем все цвета без пагинации
      params.append('limit', '1000');
      const res = await fetch(`/api/colors?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      setColors(data.data?.colors || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = router.query.search as string;
    setSearchQuery(q || '');
    fetchColors(q || '');
  }, [router.query.search]);

  // Убираем автоматическое обновление при возврате на страницу - это создает лишние запросы


  const handleEditColor = (color: Color) => {
    // Редактирование и удаление цветов отключено - можно только создавать новые уникальные цвета
    showToast('Редактирование и удаление цветов отключено. Можно только создавать новые уникальные цвета.', 'info');
    return;
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Фильтрация цветов по табам (клиентская фильтрация для отображения)
  const filteredColors = (activeTab === 'all' 
    ? colors 
    : activeTab === 'used' 
      ? colors.filter(color => (color.product_count || 0) > 0)
      : colors.filter(color => (color.product_count || 0) === 0)
  );

  if (!hasAccess) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Доступ запрещён</div>
          <div className="text-gray-600">У вас нет прав для просмотра этой страницы</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Управление цветами</h1>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
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
                    fetchColors(e.target.value);
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
          <button 
            onClick={() => {
              setEditingColor(null);
              setIsModalOpen(true);
            }}
            className="btn text-xs flex items-center gap-2"
          >
                          <PlusIcon className="w-4 h-4" />
            Добавить цвет
          </button>
        </div>
      </div>

      {/* Табы - на отдельной строке только на мобильных */}
      <div className="mb-4 sm:mb-0">
        <div className="flex gap-2 pb-2 overflow-x-auto sm:overflow-visible">
          <button 
            className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap ${activeTab === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800'}`} 
            onClick={() => handleTabChange('all')}
          >
            Все
          </button>
          <button 
            className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap ${activeTab === 'used' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800'}`} 
            onClick={() => handleTabChange('used')}
          >
            Используемые
          </button>
          <button 
            className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap ${activeTab === 'unused' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800'}`} 
            onClick={() => handleTabChange('unused')}
          >
            Неиспользуемые
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-grow">
        <div className="overflow-x-auto flex-grow">
          {loading ? (
            <div className="text-center py-4">
              <div className="text-gray-500">Загрузка...</div>
            </div>
          ) : (
            <table className="table-standard">
              <thead>
                <tr>
                  <th className="table-header">ID</th>
                  <th className="table-header">Название</th>
                  <th className="table-header">Цвет</th>
                  <th className="table-header">Товаров</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {filteredColors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-gray-500">
                      <div className="flex flex-col items-center space-y-2">
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <div className="text-lg font-medium">
                          {activeTab === 'all' ? 'Цветов не найдено' : 
                           activeTab === 'used' ? 'Нет используемых цветов' : 
                           'Нет неиспользуемых цветов'}
                        </div>
                        <div className="text-sm text-gray-400">
                          {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Создайте первый цвет'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredColors.map((color, index) => (
                    <tr 
                      key={color.id} 
                      className="table-row-hover cursor-default"
                      onClick={() => handleEditColor(color)}
                    >
                      <td className="table-cell-mono">
                        <span className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs table-cell-mono">
                          {String(color.id).padStart(3, '0')}
                        </span>
                      </td>
                      <td className="table-cell">{color.name}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          {(() => {
                            // Используем единый сервис цветов
                            let hexValue = (color as any).hex_code || (color as any).hex_value;
                            if (!hexValue) {
                              hexValue = getHexFromName(color.name);
                            }
                            
                            return (
                              <>
                                <div 
                                  className="w-6 h-6 rounded border border-gray-300"
                                  style={{ backgroundColor: hexValue }}
                                  title={hexValue}
                                ></div>
                                <span className="text-xs font-mono">{hexValue}</span>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="table-cell text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          (color.product_count || 0) > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {color.product_count || 0}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Модальное окно создания/редактирования цвета */}
      <ColorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingColor(null);
        }}
        onSuccess={() => {
          fetchColors(searchQuery);
          setEditingColor(null);
        }}
        color={editingColor}
      />
    </div>
  );
};

export default ColorsPage;