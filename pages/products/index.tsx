import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import type { NextPage } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useToast } from '../../components/ToastContext';
import Paginator from '../../components/Paginator';

import { useDebouncedCallback } from '../../lib/hooks';
import { useUserRole } from '../../lib/hooks/useUserRole';
import { PencilIcon, TrashIcon, EyeIcon, PlusIcon, PhotoIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { TableSuspense } from '../../components/SuspenseWrapper';


type Category = { id: number; name: string };

type Product = {
  id: number;
  name: string;
  brand_id: number | null;
  category_id: number | null;
  subcategory_id: number | null;
  color_id: number | null;
  composition?: string;
  article: string;
  price: number | null;
  old_price: number | null;
  is_popular: boolean;
  is_visible: boolean;
  images: string[];
  brandName?: string;
  categoryName?: string;
  subcategoryName?: string;
  colorName?: string;
};

type PaginationInfo = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const ProductsPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { roleName, hasAnyRole } = useUserRole();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ 
    total: 0, 
    page: 1, 
    limit: 20, // По умолчанию 20
    totalPages: 0 
  });
  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const abortRef = useRef<AbortController | null>(null);


  // Функция для очистки названия товара от категории/подкатегории
  const cleanProductName = (name: string, subcategoryName?: string | null, categoryName?: string | null): string => {
    let cleanName = name;
    
    // Удаляем информацию в скобках
    cleanName = cleanName.replace(/\s*\([^)]*\)\s*/g, '');
    
    // Удаляем подкатегорию из начала названия
    if (subcategoryName) {
      const subcatRegex = new RegExp(`^${subcategoryName}\\s+`, 'i');
      cleanName = cleanName.replace(subcatRegex, '');
    }
    
    // Удаляем категорию из начала названия (если подкатегория не сработала)
    if (categoryName) {
      const catRegex = new RegExp(`^${categoryName}\\s+`, 'i');
      cleanName = cleanName.replace(catRegex, '');
    }
    
    // Удаляем лишние пробелы и приводим к нормальному виду
    return cleanName.trim();
  };



  const fetchProducts = async (page = 1, limit?: number, category = currentCategory, search = searchQuery) => {
    const currentLimit = limit || pagination.limit;
    try {
      setLoading(true);
      const query = new URLSearchParams({ page: String(page), limit: String(currentLimit) });
      if (category && category !== 'all') query.append('category', category);
      if (search && search.trim()) query.append('search', encodeURIComponent(search.trim()));
      
      const url = `/api/products?${query.toString()}`;
      
      // Отмена предыдущего запроса
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const res = await fetch(url, { signal: abortRef.current.signal, cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки товаров');
      

      
      // Обновляем данные и состояние пагинации
      const productsData = data.data?.products || [];
      
      // Обрабатываем данные товаров
      const processedProducts = productsData.map((product: any) => ({
        ...product,
        brandName: product.brand?.name || null,
        categoryName: product.category?.name || null,
        colorName: product.colorName || null, // Используем colorName из API
        images: product.images || []
      }));
      
      console.log('Загружены товары:', processedProducts.length);
      console.log('Пример товара:', processedProducts[0]);
      
      setProducts(processedProducts);
      setPagination({
        total: data.pagination?.total || 0,
        page: data.pagination?.page || 1,
        limit: data.pagination?.limit || currentLimit,
        totalPages: data.pagination?.totalPages || 0,
      });
      setImageErrors(new Set()); // Очищаем ошибки при загрузке новых данных
      
      
    } catch (err: any) {
      // Игнорируем отменённые запросы от AbortController (не показываем тосты)
      const isAbort = err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''));
      if (isAbort) {
        return;
      }
      console.error(err);
      showToast(err.message || 'Ошибка загрузки товаров', 'error');
    } finally {
      setLoading(false);
    }
  };



  // Инициализация компонента без кеширования
  useEffect(() => {
    // Принудительно устанавливаем лимит 20
    setPagination(prev => ({ ...prev, limit: 20 }));
    setIsInitialized(true);
  }, []);

  // Перезагружаем данные когда изменяется лимит
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 })); // Сбрасываем на первую страницу
    fetchProducts(1, pagination.limit, currentCategory, searchQuery);
  }, [pagination.limit]);

  // Инициализация и загрузка данных
  useEffect(() => {
    if (!isInitialized) return;
    
    // Получаем параметры из URL
    const urlSearchQuery = router.query.search as string;
    const urlCategory = router.query.category as string;
    
    // Обновляем состояние из URL
    if (urlSearchQuery !== undefined) {
      setSearchQuery(urlSearchQuery);
    }
    if (urlCategory !== undefined) {
      setCurrentCategory(urlCategory);
    }
    
    // Загружаем данные
    fetchProducts(1, pagination.limit, urlCategory || currentCategory, urlSearchQuery || searchQuery);
  }, [isInitialized, router.query.search, router.query.category]);

  // Дебаунс поиска
  const debouncedFetch = useDebouncedCallback((q: string) => {
    const query: any = { page: '1', limit: String(pagination.limit) };
    if (currentCategory && currentCategory !== 'all') query.category = currentCategory;
    if (q && q.trim()) query.search = q.trim();
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    fetchProducts(1, pagination.limit, currentCategory, q);
  }, 300);

  // Обработка изменений поиска
  useEffect(() => {
    if (!isInitialized) return;
    debouncedFetch(searchQuery);
  }, [searchQuery, isInitialized]);

  // Убираем автоматическое обновление при возврате на страницу - это создает лишние запросы

  // Загружаем категории
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.categories && Array.isArray(data.categories) ? data.categories : []);
        const mapped = list.map((c: any) => ({ id: c.id, name: c.name }));
        
        // Фильтруем только основные категории: женское, мужское, детское
        const mainCategories = mapped.filter((c: Category) => {
          const nameLower = c.name.toLowerCase();
          return nameLower.includes('женск') || nameLower.includes('мужск') || nameLower.includes('детск');
        });
        
        // Сортируем: женское, мужское, детское
        const preferred = ['женск', 'мужск', 'детск'];
        mainCategories.sort((a: Category, b: Category) => {
          const aNameLower = a.name.toLowerCase();
          const bNameLower = b.name.toLowerCase();
          const ai = preferred.findIndex(p => aNameLower.includes(p));
          const bi = preferred.findIndex(p => bNameLower.includes(p));
          if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
        
        // Если не найдено категорий, используем fallback
        if (mainCategories.length === 0) {
          console.warn('Основные категории не найдены, используем fallback');
          setCategories([
            { id: 322, name: 'женское' },
            { id: 323, name: 'мужское' },
            { id: 3, name: 'детское' }
          ]);
        } else {
          console.log('Загружено категорий:', mainCategories.length, mainCategories);
          setCategories(mainCategories);
        }
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        // Fallback на стандартные категории
        setCategories([
          { id: 322, name: 'женское' },
          { id: 323, name: 'мужское' },
          { id: 3, name: 'детское' }
        ]);
      }
    };
    
    fetchCategories();
  }, []);



  const handlePageChange = (page: number) => {
    // Загружаем данные без обновления URL
    fetchProducts(page, pagination.limit, currentCategory, searchQuery);
  };

  const handlePageSizeChange = (newLimit: number) => {
    // Обновляем состояние пагинации
    setPagination(prev => ({ ...prev, limit: newLimit }));
    // Загружаем данные с новым лимитом
    const query: any = { page: '1', limit: String(newLimit) };
    if (currentCategory && currentCategory !== 'all') query.category = currentCategory;
    if (searchQuery && searchQuery.trim()) query.search = searchQuery.trim();
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    fetchProducts(1, newLimit, currentCategory, searchQuery);
  };

  const changeCategory = (catId: string | number) => {
    const catIdStr = String(catId);
    // смена категории
    setCurrentCategory(catIdStr);
    
    const query: any = { page: '1', limit: String(pagination.limit) };
    if (catIdStr && catIdStr !== 'all') query.category = catIdStr;
    if (searchQuery && searchQuery.trim()) query.search = searchQuery.trim();
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    fetchProducts(1, pagination.limit, catIdStr, searchQuery);
  };



  return (
    <div>
      <div className="flex flex-row justify-between items-center gap-2 mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Товары</h1>
        <div className="flex items-center gap-2 no-print">
          {hasAnyRole(['admin', 'director', 'manager', 'brand_manager', 'storekeeper']) && (
            <Link href="/products/new" className="btn text-xs flex items-center gap-2 hover:bg-gray-800 hover:text-white">
              <PlusIcon className="w-4 h-4" />
              Создать
            </Link>
          )}
          <button
            onClick={() => window.print()}
            className="btn text-xs flex items-center justify-center hover:bg-gray-800 hover:text-white hidden sm:flex"
            title="Печать списка"
          >
            <PrinterIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs with search */}
      <div className="mb-4 mt-4 sm:mt-0">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="flex gap-2 pb-2 overflow-x-auto -mx-2 px-2 no-print" aria-label="Tabs">
              {[{id:'all',name:'все'},...categories].map((cat)=>(
                <button
                  key={cat.id}
                  className={`text-xs px-3 py-1 rounded-full border ${
                    currentCategory===String(cat.id)
                      ?'bg-gray-800 text-white'
                      :'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  onClick={()=>changeCategory(cat.id)}
                >
                  {cat.name.toLowerCase()}
                </button>
              ))}
            </div>
            
            <div className="relative w-auto no-print">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input block w-full pl-10 pr-4"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  {['Изобр.', 'Бренд', 'Артикул', 'Название', 'Категория', 'Цвет', 'Цена', 'Старая цена', 'Фото', 'Поп', 'На сайт'].map(
                    (head) => (
                      <th
                        key={head}
                        scope="col"
                        className="table-header"
                      >
                        {head}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="table-body">
                {products.map((p) => (
                  <tr key={p.id} className="table-row-hover">
                    <td className="table-cell no-print">
                      <div
                        className="product-image-container relative rounded overflow-hidden bg-gray-100 cursor-pointer"
                        onClick={() => {
                          router.push(`/products/${p.id}`);
                        }}
                        role="button"
                        aria-label="Открыть карточку товара"
                      >
                        {p.images?.[0] && !imageErrors.has(p.id) ? (
                          <Image
                            src={p.images[0]}
                            alt={p.name}
                            width={48}
                            height={48}
                            className="product-image"
                            priority={p.id <= 10} // Приоритет для первых 10 изображений
                            onError={(e) => {
                              console.error('Ошибка загрузки изображения:', p.images[0], e);
                              setImageErrors(prev => new Set(prev).add(p.id));
                            }}
                          />
                        ) : (
                          <div className="product-image-placeholder">
                            <PhotoIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">{p.brandName||'—'}</td>
                    <td className="table-cell-mono">
                      {p.article && /^[0-9]+$/.test(p.article) ? `L${p.article}` : (p.article || '—')}
                    </td>
                    <td className="table-cell">{cleanProductName(p.name, p.subcategoryName, p.categoryName)}</td>
                    <td className="table-cell">{p.subcategoryName || p.categoryName || '—'}</td>
                    <td className="table-cell">{p.colorName || '—'}</td>
                    <td className="table-cell">
                      {p.price ? `${p.price} ₽` : '-'}
                    </td>
                    <td className="table-cell">
                      {p.old_price ? `${p.old_price} ₽` : '-'}
                    </td>
                    <td className="table-cell">
                      {p.images ? p.images.length : 0}
                    </td>
                    <td className="table-cell">
                      {p.is_popular ? 'Да' : 'Нет'}
                    </td>
                    <td className="table-cell">
                      {p.is_visible ? 'Да' : 'Нет'}
                    </td>

                  </tr>
                ))}
                {products.length === 0 && !loading && (
                  <tr>
                    <td colSpan={11} className="text-center p-8 text-gray-500">
                      <div className="flex flex-col items-center space-y-2">
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <div className="text-lg font-medium">
                          {currentCategory === 'all' 
                            ? 'Товары не найдены' 
                            : `В категории "${categories.find(c => c.id === parseInt(currentCategory))?.name || currentCategory}" нет товаров`
                          }
                        </div>
                        <div className="text-sm text-gray-400">
                          {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Добавьте товары через форму создания'}
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

export default ProductsPage; 