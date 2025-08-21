import { useEffect, useState, useRef } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';

import { PencilIcon, TrashIcon, EyeIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../components/ToastContext';
import Paginator from '../../components/Paginator';
type Category = { id: string; name: string };

type Color = {
  code: string;
  name: string;
};

type Size = {
  code: string;
  name: string;
};

type StockProduct = {
  id: number;
  name: string;
  article: string;
  brandName?: string | null;
  colors: Array<{
    colorId: number;
    colorName: string;
    sizes: number[];
    total: number;
    images?: string[];
  }>;
  total: number;
  images?: string[];
};

type PaginationInfo = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const StockPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [items, setItems] = useState<StockProduct[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchItems = async (page = 1, limit = pagination.limit, category = currentCategory, search = searchQuery) => {
    try {
      setLoading(true);
      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (category && category !== 'all') query.append('category', category);
      if (search && search.trim()) query.append('search', encodeURIComponent(search.trim()));
      
      // Кэширование убрано - timestamp не нужен
      
      const res = await fetch(`/api/stock?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки склада');
      
      setItems(data.items || []);
      setSizes(data.sizes || []);
      setPagination(data.pagination || { total: (data.items || []).length, page, limit, totalPages: 1 });
      
      // Показываем сообщение если таб пустой
      if ((data.items || []).length === 0 && !loading) {
        const categoryName = category === 'all' ? 'Все' : categories.find(c => c.id === category)?.name || category;
        showToast(`В категории "${categoryName}" нет товаров на складе`, 'info');
      }
    } catch (err: any) {
      console.error('Ошибка загрузки склада:', err);
      if (err.message && !err.message.includes('Внутренняя')) {
        showToast(err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Загружаем изображения товаров
  const loadProductImages = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/images`);
      const data = await res.json();
      return data.images || [];
    } catch (error) {
      console.error('Ошибка загрузки изображений товара:', error);
      return [];
    }
  };

  useEffect(() => {
    // Загружаем все справочники без кеширования
    const fetchData = async () => {
      try {
        // Загружаем новые данные каждый раз
        const categoriesRes = await fetch(`/api/categories`);
        const categoriesData = await categoriesRes.json();

        const fetched = (Array.isArray(categoriesData) ? categoriesData : categoriesData?.categories || []).map((c: any) => ({ id: c.id, name: c.name }));
        const mandatory = [
          { id: 1, name: 'Мужское' },
          { id: 2, name: 'Женское' },
          { id: 3, name: 'Детское' }
        ];
        const merged = [...fetched];
        mandatory.forEach((m) => {
          if (!merged.some((c) => c.id === m.id)) merged.push(m);
        });

        // Сортируем по prefer order Мужское, Женское, Детское, затем алфавит
        const prefer = ['Мужское', 'Женское', 'Детское'];
        merged.sort((a, b) => {
          const ai = prefer.indexOf(a.name);
          const bi = prefer.indexOf(b.name);
          if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });

        setCategories(merged);
        
        // Загружаем данные склада после загрузки справочников
        fetchItems(1, pagination.limit, currentCategory, searchQuery);
      } catch (error) {
        console.error('Ошибка загрузки справочников:', error);
        showToast('Ошибка загрузки справочников', 'error');
      }
    };

    // Получаем поисковый запрос из URL при загрузке страницы
    const urlSearchQuery = router.query.search as string;
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }

    fetchData();
  }, [router.query.search]);

    // Убираем автоматическое обновление при возврате на страницу - это создает лишние запросы

  const handlePageChange = (p: number) => {
    // Обновляем состояние пагинации
    setPagination(prev => ({ ...prev, page: p }));
    fetchItems(p, pagination.limit, currentCategory, searchQuery);
  };

  const changeCategory = (cat: string) => {
    setCurrentCategory(cat);
    fetchItems(1, pagination.limit, cat, searchQuery);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 pb-4 border-b-0 sm:border-b sm:border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Склад</h1>
        <div className="flex items-center gap-3">
          {/* Поиск справа от заголовка */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Поиск товаров на складе..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Очищаем предыдущий таймер
                if (searchTimeout.current) {
                  clearTimeout(searchTimeout.current);
                }
                // Добавляем задержку для поиска в реальном времени
                searchTimeout.current = setTimeout(() => {
                  fetchItems(1, pagination.limit, currentCategory, e.target.value);
                }, 500);
              }}
              className="search-input block w-full"
            />
          </div>
          <button
            onClick={() => window.print()}
            className="btn text-xs flex items-center hidden sm:flex"
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
      
      <div className="mb-4">
        <div className="w-full">
          <div className="flex justify-between items-center">
            <div className="flex gap-2 pb-2" aria-label="Tabs">
              {[{id:'all',name:'Все'},...categories].map((cat)=>(
                <button 
                  key={cat.id} 
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    currentCategory===cat.id
                      ?'bg-gray-800 text-white'
                      :'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`} 
                  onClick={()=>changeCategory(cat.id)}
                  disabled={loading}
                >
                  {cat.name}
                  {loading && currentCategory===cat.id && (
                    <span className="ml-1 inline-block w-2 h-2 bg-white rounded-full"></span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
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
                    <th className="table-header">Фото</th>
                    <th className="table-header">Бренд</th>
                    <th className="table-header">Артикул</th>
                    <th className="table-header w-60">Название</th>
                    <th className="table-header">Цвет</th>
                    {sizes.map((size) => (
                      <th key={size} className="table-header text-center">
                        {size}
                      </th>
                    ))}
                    <th className="table-header text-center">Итого</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {items.map((product) => (
                    product.colors.map((color, colorIndex) => (
                      <tr key={`${product.id}_${color.colorId}`} className="table-row-hover">
                        <td className="table-cell">
                          <div className="product-image-container relative rounded overflow-hidden bg-gray-100 w-12 h-12">
                            {color.images?.[0] && !imageErrors.has(`${product.id}_${color.colorId}`) ? (
                              <img
                                src={color.images[0]}
                                alt={`${product.name} - ${color.colorName}`}
                                width={48}
                                height={48}
                                className="product-image"
                                onError={(e) => {
                                  console.error('Ошибка загрузки изображения:', color.images?.[0], e);
                                  setImageErrors(prev => new Set(prev).add(`${product.id}_${color.colorId}`));
                                }}
                              />
                            ) : (
                              <div className="product-image-placeholder flex items-center justify-center w-full h-full">
                                <PhotoIcon className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">{product.brandName || '—'}</td>
                        <td className="table-cell-mono">{product.article}</td>
                        <td className="table-cell w-60">
                          <div className="break-words whitespace-normal leading-relaxed">{product.name}</div>
                        </td>
                        <td className="table-cell">
                          <span className="font-medium">{color.colorName}</span>
                        </td>
                        {color.sizes.map((qty, sizeIndex) => (
                          <td key={sizeIndex} className="table-cell text-center">
                            <span className={qty === 0 ? 'text-gray-400' : 'font-semibold'}>
                              {qty === 0 ? '—' : qty}
                            </span>
                          </td>
                        ))}
                        <td className="table-cell text-center font-semibold">
                          {color.total}
                        </td>
                      </tr>
                    ))
                  ))}
                  {items.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5 + sizes.length} className="text-center p-8 text-gray-500">
                        <div className="flex flex-col items-center space-y-2">
                          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <div className="text-lg font-medium">
                            {currentCategory === 'all' 
                              ? 'На складе нет товаров' 
                              : `В категории "${categories.find(c => c.id === currentCategory)?.name || currentCategory}" нет товаров`
                            }
                          </div>
                          <div className="text-sm text-gray-400">
                            {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Добавьте товары через поступления'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Промежуточный итог */}
          {items.length > 0 && (
            <div className="mt-4 mb-2 text-sm text-gray-600 border-t border-gray-200 pt-3">
              <div className="flex justify-between items-center">
                <span>
                  Итог: <strong>{items.reduce((sum, item) => sum + item.total, 0)}</strong>
                </span>
                <span>
                  Общее количество товаров на складе: <strong>{pagination.total}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Пагинатор отображается только если есть данные */}
          {pagination.total > 0 && (
            <Paginator
              total={pagination.total}
              page={pagination.page}
              limit={pagination.limit}
              onPageChange={handlePageChange}
              onPageSizeChange={(l)=>fetchItems(1,l,currentCategory,searchQuery)}
            />
          )}
        </div>
      </div>

      <style jsx>{`
        .product-image-container {
          position: relative;
          overflow: hidden;
          border-radius: 0.375rem;
          background-color: #f3f4f6;
        }
        
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .product-image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background-color: #f3f4f6;
        }
      `}</style>
    </div>
  );
};

export default StockPage; 