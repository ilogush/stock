import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../components/AuthContext';
import PageHeader from '../../components/PageHeader';
import { translateSupabaseError } from '../../lib/supabaseErrorTranslations';
import { getSizeOrder } from '../../lib/utils/normalize';


interface Product {
  id: number;
  name: string;
  article: string;
  category_id?: number;
  subcategory_id?: number;
  brand_id?: number;
  color_id?: number;
  brand?: { name: string };
  category?: { name: string };
  subcategory?: { name: string };
}

interface Brand {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  parent_id?: number;
}

interface Color {
  id: number;
  name: string;
  hex_value: string;
}

interface Size {
  code: string;
  name: string;
}

interface ReceiptItem {
  id: string; // временный ID для таблицы
  brand_id: number;
  category_id: number;
  subcategory_id: number;
  product_id: number;
  size_code: string;
  color_id: number;
  quantity: number;
  // Дополнительные поля для отображения
  product_name?: string;
  product_article?: string;
  size_name?: string;
  color_name?: string;
  brand_name?: string;
}

interface User {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

// Форматирует имя пользователя: сначала ФИО, если отсутствует — красивое имя из email
const getUserDisplayName = (u: User): string => {
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  const local = (u.email || '').split('@')[0];
  const pretty = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return pretty || local || '—';
};

const NewReceiptPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Состояние для цветов конкретного товара
  const [productColors, setProductColors] = useState<Color[]>([]);
  
  const { user } = useAuth();

  const [form, setForm] = useState({
    transferrer_id: '', // ID пользователя, который Принято от
    notes: '', // Примечания к поступлению
  });

  // Состояние для выбора товара
  const [selectedProduct, setSelectedProduct] = useState({
    product_id: 0,
  });

  // Состояние для текущего добавляемого элемента
  const [currentItem, setCurrentItem] = useState({
    size_code: '',
    color_id: 0,
    quantity: 0,
  });

  // Поиск по артикулу
  const [articleQuery, setArticleQuery] = useState<string>('');
  const [productPreview, setProductPreview] = useState<Product | null>(null);
  const [articleError, setArticleError] = useState<string>('');

  // Подсказки по артикулу (по цифрам)
  const [articleSuggestions, setArticleSuggestions] = useState<Product[]>([]);
  const [showArticleSuggestions, setShowArticleSuggestions] = useState(false);

  // Список добавленных позиций
  const [items, setItems] = useState<ReceiptItem[]>([]);

  // Загрузка справочников и текущего пользователя
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Пользователь берется из AuthContext - не нужно получать из localStorage

        const [brandsRes, categoriesRes, colorsRes, usersRes, productsRes] = await Promise.all([
          fetch('/api/brands'),
          fetch('/api/categories'),
          fetch('/api/colors'),
          fetch('/api/users?limit=1000'),
          fetch('/api/products?limit=10000')
        ]);

        const [brandsData, categoriesData, colorsData, usersData, productsData] = await Promise.all([
          brandsRes.json(),
          categoriesRes.json(),
          colorsRes.json(),
          usersRes.json(),
          productsRes.json()
        ]);

        setBrands(brandsData.data?.brands || []);
        
        // Проверяем что categoriesData это массив, а не объект с ошибкой
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        
        setProducts(productsData.data?.products || []);
        setColors(colorsData.data?.colors || []);
        setUsers(usersData.data?.users || []);
        
        // Загружаем размеры по умолчанию (взрослые)
        const sizesRes = await fetch('/api/sizes');
        const sizesData = await sizesRes.json();
        setSizes(sizesData.sizes || []);

      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      }
    };

    fetchData();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCurrentItemChange = (field: string, value: string | number) => {
    setCurrentItem(prev => ({ ...prev, [field]: value }));
  };











  // Функция для проверки артикула в реальном времени
  const checkArticle = (article: string) => {
    if (!article.trim()) {
      setProductPreview(null);
      setArticleError('');
      setProductColors([]); // Очищаем цвета при пустом артикуле
      return;
    }

    const productMatch = products.find(p => 
      p.article.toLowerCase() === article.trim().toLowerCase()
    );

    if (productMatch) {
      setProductPreview(productMatch);
      setArticleError('');
      // Загружаем размеры по категории товара
      if (productMatch.category_id) {
        loadCategorySizes(productMatch.category_id);
      }
      // Загружаем цвета для найденного товара
      loadProductColors(productMatch.id);
    } else {
      setProductPreview(null);
      setArticleError('Товар с таким артикулом не найден');
      setProductColors([]); // Очищаем цвета если товар не найден
    }
  };

  // Обработчик изменения артикула
  const handleArticleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setArticleQuery(value);
    checkArticle(value);
    searchArticles(value);
    setShowArticleSuggestions(true);
  };

  // Обработчик выбора товара из подсказок
  const handleProductSelect = (product: Product) => {
    setArticleQuery(product.article);
    setProductPreview(product);
    setArticleError('');
    setShowArticleSuggestions(false);
    
    // Сбрасываем выбранный цвет при смене товара
    setCurrentItem(prev => ({ ...prev, color_id: 0 }));
    
    // Загружаем размеры по категории товара
    if (product.category_id) {
      loadCategorySizes(product.category_id);
    }
    
    // Загружаем цвета для выбранного товара
    loadProductColors(product.id);
  };

  // Добавить позицию в поступление
  const addItemToReceipt = () => {
    // Определяем товар по артикулу
    const productMatch = products.find(p => p.article.toLowerCase() === articleQuery.trim().toLowerCase());

    if (!productMatch) {
      showToast('Товар с таким артикулом не найден', 'error');
      return;
    }

    const productId = productMatch.id;

    if (!productId || !currentItem.size_code || currentItem.quantity <= 0 || (productColors.length > 0 && !currentItem.color_id) || !form.transferrer_id) {
      showToast('Заполните все обязательные поля', 'error');
      return;
    }

    // Проверяем, нет ли уже такой позиции
    const existingItem = items.find(item => 
      item.product_id === productId &&
      item.size_code === currentItem.size_code &&
      item.color_id === currentItem.color_id
    );

    if (existingItem) {
      showToast('Такая позиция уже добавлена', 'error');
      return;
    }

    // Находим данные для отображения
    const product = productMatch;
    const size = sizes.find(s => s.code === currentItem.size_code);
    const brand = brands.find(b => b.id === product.brand_id);

    const newItem: ReceiptItem = {
      id: Date.now().toString(), // временный ID
      product_id: productId,
      brand_id: product.brand_id || 0,
      category_id: product.category_id || 0,
      subcategory_id: product.subcategory_id || 0,
      ...currentItem,
      product_name: product?.name || '',
      product_article: product?.article || '',
      size_name: size?.code || currentItem.size_code || '',
      color_name: productColors.find(c => c.id === currentItem.color_id)?.name || `ID: ${currentItem.color_id}`,
      brand_name: brand?.name || ''
    };

    setItems(prev => [...prev, newItem]);
    
    // Сбрасываем только размер, цвет и количество
    setCurrentItem({
      size_code: '',
              color_id: 0,
      quantity: 0,
    });

    showToast('Позиция добавлена', 'success');
  };

  // Удалить позицию
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Обновить количество в позиции
  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) return;
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  // Увеличить количество в позиции
  const increaseQuantity = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: item.quantity + 1 };
      }
      return item;
    }));
  };

  // Уменьшить количество в позиции
  const decreaseQuantity = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(item.quantity - 1, 1);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      showToast('Добавьте хотя бы одну позицию в поступление', 'error');
      return;
    }

    if (!form.transferrer_id) {
      showToast('Выберите, от кого принято товар', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/receipts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferrer_id: form.transferrer_id,
          notes: form.notes,
          items: items.map(item => ({
            product_id: item.product_id,
            size_code: item.size_code,
            color_id: item.color_id,
            quantity: item.quantity
          })),
          created_by: user?.id
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      showToast('Поступление создано успешно', 'success');
      router.push('/receipts');
    } catch (error: any) {
      showToast(translateSupabaseError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Фильтруем товары по выбранной подкатегории
  const getFilteredProducts = () => {
    if (!selectedProduct.product_id) return [];
    let list = products.filter(product => product.id === selectedProduct.product_id);
    if (articleQuery.trim()) {
      const q = articleQuery.toLowerCase();
      list = list.filter(p => p.article?.toLowerCase().includes(q));
    }
    return list;
  };

  // Поиск артикулов по вводу (поддержка цифр)
  const searchArticles = (query: string) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      setArticleSuggestions([]);
      setShowArticleSuggestions(false);
      return;
    }
    // Фильтруем по включению подстроки (цифр/букв) в артикуле или имени
    // Убираем дубли по артикулу - показываем только один товар на артикул
    const filtered = products
      .filter(p => p.article && p.article.toLowerCase().includes(q))
      .filter((p, index, self) => 
        // Оставляем только первый товар с уникальным артикулом
        index === self.findIndex(item => item.article === p.article)
      )
      .slice(0, 10);
    setArticleSuggestions(filtered);
    setShowArticleSuggestions(filtered.length > 0);
  };

  const selectArticle = (product: Product) => {
    setArticleQuery(product.article);
    setProductPreview(product);
    setArticleError('');
    setShowArticleSuggestions(false);
    
    // Сбрасываем выбранный цвет при смене товара
    setCurrentItem(prev => ({ ...prev, color_id: 0 }));
    
    // Загружаем цвета для выбранного товара
    loadProductColors(product.id);
    
    // Загружаем размеры по категории товара
    if (product.category_id) {
      loadCategorySizes(product.category_id);
    }
  };

  // Функция для загрузки цветов конкретного товара из справочника цветов
  const loadProductColors = async (productId: number) => {
    try {
      const response = await fetch(`/api/products/${productId}/colors`);
      const data = await response.json();
      
      if (response.ok) {
        setProductColors(data.colors || []);
      } else {
        console.error('Ошибка загрузки цветов товара:', data.error);
        setProductColors([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки цветов товара:', error);
      setProductColors([]);
    }
  };

  // Функция для загрузки размеров по категории товара
  const loadCategorySizes = async (categoryId: number) => {
    try {
      const response = await fetch(`/api/sizes/by-category?category_id=${categoryId}`);
      const data = await response.json();
      
      if (response.ok) {
        setSizes(data.sizes || []);
      } else {
        console.error('Ошибка загрузки размеров по категории:', data.error);
        setSizes([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки размеров по категории:', error);
      setSizes([]);
    }
  };

  return (
    <div>
      <PageHeader 
        title="Новое поступление"
        showBackButton={true}
        backHref="/receipts"
        action={{
          label: loading ? 'Сохранение...' : 'Сохранить',
          onClick: handleSubmit
        }}
      >
        <button
          type="button"
          onClick={addItemToReceipt}
          disabled={!productPreview || !currentItem.size_code || (currentItem.quantity || 0) <= 0 || (productColors.length > 0 && !currentItem.color_id) || !form.transferrer_id}
          className={`btn text-xs flex items-center disabled:opacity-50 ${
                          !productPreview || !currentItem.size_code || (currentItem.quantity || 0) <= 0 || (productColors.length > 0 && !currentItem.color_id) || !form.transferrer_id
              ? 'cursor-not-allowed'
              : ''
          }`}
        >
          Добавить позицию
        </button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Выбор товара */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Артикул */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">Артикул *</label>
              <input
                type="text"
                value={articleQuery}
                onChange={handleArticleChange}
                onFocus={() => searchArticles(articleQuery)}
                onBlur={() => setTimeout(() => setShowArticleSuggestions(false), 100)}
                className={`mt-1 block w-full rounded-md px-3 py-2  ${
                  articleError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Введите артикул"
                required
              />
              {showArticleSuggestions && articleSuggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {articleSuggestions.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                      onMouseDown={() => selectArticle(p)}
                    >
                      <div className="text-sm text-gray-900 font-mono">{p.article}</div>
                      <div className="text-xs text-gray-500">{p.name}</div>
                    </div>
                  ))}
                </div>
              )}
              {articleError && (
                <p className="mt-1 text-sm text-red-600">{articleError}</p>
              )}
            </div>

            {/* Размер */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Размер *</label>
              <select
                value={currentItem.size_code}
                onChange={(e) => handleCurrentItemChange('size_code', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 "
                required
              >
                <option value="">Выберите размер</option>
                {sizes
                  .sort((a, b) => {
                    // Защита от undefined
                    if (!a || !a.code || !b || !b.code) return 0;
                    
                    const categoryId = productPreview?.category_id;
                    const aValue = getSizeOrder(a.code, categoryId);
                    const bValue = getSizeOrder(b.code, categoryId);
                    return aValue - bValue; // Сортировка от меньшего к большему
                  })
                  .map(size => (
                    <option key={size.code} value={size.code}>
                      {size.code}
                    </option>
                  ))}
              </select>
            </div>

            {/* Цвет */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Цвет *</label>
              <select
                value={currentItem.color_id}
                onChange={(e) => handleCurrentItemChange('color_id', parseInt(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 "
                required
              >
                <option value="">Выберите цвет</option>
                {productColors.map(color => (
                  <option key={color.id} value={color.id}>
                    {color.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Количество */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Количество *</label>
              <input
                type="number"
                min="1"
                value={currentItem.quantity || ''}
                onChange={(e) => handleCurrentItemChange('quantity', parseInt(e.target.value) || 1)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 "
                required
              />
            </div>
          </div>

          {/* Принято от товар */}
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Принято от товар */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Принято от *</label>
                <select
                  value={form.transferrer_id}
                  onChange={handleFormChange}
                  name="transferrer_id"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 "
                  required
                >
                  <option value="">Выберите пользователя</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {getUserDisplayName(user)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Примечания */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Примечания</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleFormChange}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 "
                placeholder="Дополнительная информация о поступлении..."
              />
            </div>
          </div>

          {/* Кнопка перенесена в заголовок */}

        </div>

        {/* Список добавленных позиций */}
        {items.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Добавленные позиции</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Товар</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Артикул</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Бренд</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Размер</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цвет</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Количество</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-sm text-gray-900">{item.product_name}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 font-mono">{item.product_article}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{item.brand_name}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{item.size_name}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{item.color_name}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-20 rounded border border-gray-300 p-1 text-center "
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.id)}
                          className="btn text-xs"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          className="btn text-xs ml-1"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="btn text-xs ml-1"
                        >
                          удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


      </form>
    </div>
  );
};

export default NewReceiptPage; 