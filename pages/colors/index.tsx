import { NextPage } from 'next';
import { useEffect, useState, useRef } from 'react';
import { useUserRole } from '../../lib/hooks/useUserRole';
import { useRouter } from 'next/router';
import { PencilIcon, TrashIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';

import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../components/AuthContext';
import Paginator from '../../components/Paginator';
import ColorModal from '../../components/ColorModal';

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
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);

  // Проверяем права доступа - доступ для всех авторизованных пользователей
  const hasAccess = !!user;

  const fetchColors = async (search = searchQuery, page = pagination.page, limit = pagination.limit) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        page: String(page), 
        limit: String(limit) 
      });
      if (search.trim()) params.append('search', encodeURIComponent(search.trim()));
      const res = await fetch(`/api/colors?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      setColors(data.data?.colors || []);
      setPagination(data.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 });
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
    fetchColors(q || '', 1, pagination.limit);
  }, [router.query.search]);

  // Убираем автоматическое обновление при возврате на страницу - это создает лишние запросы

  const handlePageChange = (page: number) => {
    // Обновляем состояние пагинации
    setPagination(prev => ({ ...prev, page }));
    fetchColors(searchQuery, page, pagination.limit);
  };

  const handlePageSizeChange = (newLimit: number) => {
    fetchColors(searchQuery, 1, newLimit);
  };

  const handleEditColor = (color: Color) => {
    // Проверяем права доступа - редактирование для администраторов и менеджеров
    if (!user || ![1, 4].includes(user.role_id)) {
      showToast('Редактирование цветов доступно только администраторам и менеджерам', 'error');
      return;
    }
    setEditingColor(color);
    setIsModalOpen(true);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // При смене таба сбрасываем на первую страницу
    fetchColors(searchQuery, 1, pagination.limit);
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
                placeholder=""
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Очищаем предыдущий таймер
                  if (searchTimeout.current) {
                    clearTimeout(searchTimeout.current);
                  }
                  // Добавляем задержку для поиска в реальном времени
                  searchTimeout.current = setTimeout(() => {
                    fetchColors(e.target.value, 1, pagination.limit);
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
                      className={`table-row-hover ${user && user.role_id === 1 ? 'cursor-pointer' : 'cursor-default'}`}
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
                            // Генерируем HEX-код на основе названия цвета
                            const colorMap: { [key: string]: string } = {
                              // Основные цвета
                              'Белый': '#FFFFFF',
                              'Черный': '#000000',
                              'Красный': '#FF0000',
                              'Зеленый': '#00FF00',
                              'Синий': '#0000FF',
                              'Желтый': '#FFFF00',
                              'Розовый': '#FFC0CB',
                              'Оранжевый': '#FFA500',
                              'Фиолетовый': '#800080',
                              'Коричневый': '#A52A2A',
                              'Серый': '#808080',
                              'Бежевый': '#F5DEB3',
                              'Бирюзовый': '#40E0D0',
                              'Изумрудный': '#50C878',
                              'Светло-голубой': '#87CEEB',
                              'Серый меланж': '#C0C0C0',
                              'Ассорти': '#FFD700',
                              'Терракотовый': '#E2725B',
                              'спрут': '#8B4513',
                              'лоза': '#228B22',
                              
                              // Дополнительные цвета и вариации
                              'Розово': '#FFC0CB',
                              'Розов': '#FFC0CB',
                              'Зайчики на розовом': '#FFB6C1',
                              'Зайчики': '#FFB6C1',
                              'Розовое': '#FFC0CB',
                              'Розовая': '#FFC0CB',
                              
                              // Оттенки розового
                              'Светло-розовый': '#FFB6C1',
                              'Темно-розовый': '#FF1493',
                              'Нежно-розовый': '#FFE4E1',
                              'Ярко-розовый': '#FF69B4',
                              
                              // Оттенки синего
                              'Голубой': '#87CEEB',
                              'Небесно-голубой': '#87CEEB',
                              'Темно-синий': '#000080',
                              'Светло-синий': '#ADD8E6',
                              
                              // Оттенки зеленого
                              'Салатовый': '#7FFF00',
                              'Темно-зеленый': '#006400',
                              'Светло-зеленый': '#90EE90',
                              'Лаймовый': '#32CD32',
                              
                              // Оттенки красного
                              'Бордовый': '#800020',
                              'Малиновый': '#DC143C',
                              'Темно-красный': '#8B0000',
                              'Светло-красный': '#FF6B6B',
                              
                              // Металлические цвета
                              'Золотой': '#FFD700',
                              'Серебряный': '#C0C0C0',
                              'Бронзовый': '#CD7F32',
                              
                              // Пастельные цвета
                              'Пастельно-розовый': '#FFE4E1',
                              'Пастельно-голубой': '#E0F6FF',
                              'Пастельно-зеленый': '#E0F8E0',
                              'Пастельно-желтый': '#FFFACD'
                            };
                            
                            // Проверяем точное совпадение
                            let hexValue = (color as any).hex_code || (color as any).hex_value;
                            if (!hexValue && colorMap[color.name]) {
                              hexValue = colorMap[color.name];
                            }
                            
                            // Проверяем частичные совпадения
                            if (!hexValue) {
                              const normalizedName = color.name.toLowerCase();
                              for (const [colorName, hexCode] of Object.entries(colorMap)) {
                                if (normalizedName.includes(colorName.toLowerCase()) || 
                                    colorName.toLowerCase().includes(normalizedName)) {
                                  hexValue = hexCode;
                                  break;
                                }
                              }
                            }
                            
                            // Если ничего не найдено, генерируем цвет на основе названия
                            if (!hexValue) {
                              const normalizedNameForHash = color.name.trim().toLowerCase();
                              let hash = 0;
                              for (let i = 0; i < normalizedNameForHash.length; i++) {
                                hash = normalizedNameForHash.charCodeAt(i) + ((hash << 5) - hash);
                              }
                              
                              const hue = Math.abs(hash) % 360;
                              const saturation = 70 + (Math.abs(hash) % 30);
                              const lightness = 45 + (Math.abs(hash) % 20);
                              
                              const h = hue / 360;
                              const s = saturation / 100;
                              const l = lightness / 100;
                              
                              const hue2rgb = (p: number, q: number, t: number) => {
                                if (t < 0) t += 1;
                                if (t > 1) t -= 1;
                                if (t < 1/6) return p + (q - p) * 6 * t;
                                if (t < 1/2) return q;
                                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                                return p;
                              };
                              
                              let r, g, b;
                              if (s === 0) {
                                r = g = b = l;
                              } else {
                                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                                const p = 2 * l - q;
                                r = hue2rgb(p, q, h + 1/3);
                                g = hue2rgb(p, q, h);
                                b = hue2rgb(p, q, h - 1/3);
                              }
                              
                              const toHex = (c: number) => {
                                const hex = Math.round(c * 255).toString(16);
                                return hex.length === 1 ? '0' + hex : hex;
                              };
                              
                              hexValue = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
                            }
                            
                            if (hexValue) {
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
                            } else {
                              return <span className="text-xs font-mono text-gray-400">#000000</span>;
                            }
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

        {/* Пагинатор */}
        <Paginator
          total={pagination.total}
          page={pagination.page}
          limit={pagination.limit}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* Модальное окно создания/редактирования цвета */}
      <ColorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingColor(null);
        }}
        onSuccess={() => {
          fetchColors(searchQuery, pagination.page, pagination.limit);
          setEditingColor(null);
        }}
        color={editingColor}
      />
    </div>
  );
};

export default ColorsPage;