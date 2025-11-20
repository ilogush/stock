import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../components/AuthContext';
import { useToast } from '../../components/ToastContext';
import PageHeader from '../../components/PageHeader';
interface ProductStock {
  product_id: number;
  name: string;
  article: string;
  size_code: string;
  color_id: number;
  color_name: string;
  qty: number;
}

interface RealizationItem {
  id: string;
  product_id: number;
  size_code: string;
  color_id: number;
  color_name: string;
  qty: number;
  product_name?: string;
  article?: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Product {
  id: number;
  name: string;
  article: string;
}

const NewRealizationPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [stock, setStock] = useState<ProductStock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<RealizationItem[]>([]);
  
  const [form, setForm] = useState({
    recipient_id: '',
    notes: ''
  });

  const [currentItem, setCurrentItem] = useState({
    article: '',
    product_id: 0,
    size_code: '',
    color_id: 0,
    qty: 0
  });

  const [articleQuery, setArticleQuery] = useState('');
  const [articleSuggestions, setArticleSuggestions] = useState<{article: string; name: string}[]>([]);
  const [showArticleSuggestions, setShowArticleSuggestions] = useState(false);
  const [articleError, setArticleError] = useState<string>('');

  // Автодополнение для цветов
  const [colorSuggestions, setColorSuggestions] = useState<{id: number, name: string}[]>([]);
  const [showColorSuggestions, setShowColorSuggestions] = useState(false);

  // Подсказки по артикулу (по цифрам/символам) на основе товаров в наличии
  const searchArticles = (query: string, showAll: boolean = false) => {
    if (!query.trim() && !showAll) {
      setArticleSuggestions([]);
      setShowArticleSuggestions(false);
      return;
    }

    const allArticles = Array.from(
      new Map(stock.map(item => [item.article, {
        article: item.article,
        name: item.name
      }])).values()
    );

    const suggestions = showAll || !query.trim()
      ? allArticles.slice(0, 10)
      : allArticles
          .filter(s =>
            s.article.toLowerCase().includes(query.toLowerCase()) ||
            s.name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 10);

    setArticleSuggestions(suggestions);
    setShowArticleSuggestions(suggestions.length > 0);
  };

  const handleArticleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const article = e.target.value;
    setArticleQuery(article);
    setArticleError('');

    const trimmedArticle = article.trim();

    const hasExactArticle = trimmedArticle ? stock.some(s => s.article === trimmedArticle) : false;

    setCurrentItem(prev => ({
      article: hasExactArticle ? trimmedArticle : '',
      product_id: hasExactArticle && prev.article === trimmedArticle ? prev.product_id : 0,
      size_code: '',
      color_id: 0,
      qty: 0
    }));

    searchArticles(article);
  };

  const selectArticle = (product: {article:string; name:string}) => {
    setArticleQuery(product.article);
    setCurrentItem({ article: product.article, product_id: 0, size_code: '', color_id: 0, qty: 0 });
    setArticleError('');
    setShowArticleSuggestions(false);
  };

  // Получаем цвета для выбранного товара и размера
  const articleVariants = useMemo(() => (
    currentItem.article ? stock.filter((s) => s.article === currentItem.article) : []
  ), [stock, currentItem.article]);

  const availableSizes = useMemo(() => {
    const uniqueSizes = Array.from(new Set(articleVariants.map((s) => s.size_code)));

    const getSizeValue = (sizeName: string) => {
      if (!sizeName) return 0;
      const name = sizeName.toLowerCase();

      if (name.includes('xs')) return 1;
      if (name.includes('s') && !name.includes('xs')) return 2;
      if (name.includes('m') && !name.includes('xl')) return 3;
      if (name.includes('l') && !name.includes('xl')) return 4;
      if (name.includes('xl') && !name.includes('xxl')) return 5;
      if (name.includes('xxl') && !name.includes('xxxl')) return 6;
      if (name.includes('xxxl')) return 7;

      const numMatch = sizeName.match(/\d+/);
      if (numMatch) return parseInt(numMatch[0], 10);

      return 0;
    };

    return uniqueSizes.sort((a, b) => getSizeValue(a) - getSizeValue(b));
  }, [articleVariants]);

  const availableColors = useMemo(() => {
    // Показываем все цвета артикула, независимо от размера
    // Это позволяет видеть все доступные цвета, даже если для выбранного размера нет остатков
    const colors = articleVariants
      .map((s) => ({ id: s.color_id, name: s.color_name }));

    const unique: { id: number; name: string }[] = [];
    colors.forEach((color) => {
      if (!unique.some((u) => u.id === color.id)) {
        unique.push(color);
      }
    });

    return unique.sort((a, b) => a.name.localeCompare(b.name));
  }, [articleVariants]);

  const selectedVariant = useMemo(() => (
    articleVariants.find((s) =>
      s.size_code === currentItem.size_code &&
      s.color_id === currentItem.color_id
    ) || null
  ), [articleVariants, currentItem.size_code, currentItem.color_id]);

  const maxQty = selectedVariant?.qty || 0;

  useEffect(() => {
    setCurrentItem(prev => {
      if (selectedVariant) {
        const nextQty = prev.qty > 0 ? Math.min(prev.qty, selectedVariant.qty) : selectedVariant.qty;
        if (prev.product_id === selectedVariant.product_id && prev.qty === nextQty) {
          return prev;
        }
        return {
          ...prev,
          product_id: selectedVariant.product_id,
          qty: nextQty
        };
      }

      if (prev.product_id !== 0 || prev.qty !== 0) {
        return {
          ...prev,
          product_id: 0,
          qty: 0
        };
      }

      return prev;
    });
  }, [selectedVariant]);

  const addItem = () => {
    if (!selectedVariant || !currentItem.size_code || !currentItem.color_id || currentItem.color_id === 0 || currentItem.qty <= 0) {
      showToast('Заполните все поля позиции', 'error');
      return;
    }

    if (currentItem.qty > selectedVariant.qty) {
      showToast(`Максимальное количество: ${selectedVariant.qty}`, 'error');
      return;
    }

    // Проверяем, что позиция еще не добавлена
    const existingItem = items.find(item => 
      item.product_id === selectedVariant.product_id &&
      item.size_code === currentItem.size_code &&
      item.color_id === currentItem.color_id
    );

    if (existingItem) {
      showToast('Эта позиция уже добавлена', 'error');
      return;
    }

    const newItem: RealizationItem = {
      id: Date.now().toString(),
      product_id: selectedVariant.product_id,
      size_code: currentItem.size_code,
      color_id: currentItem.color_id,
      color_name: selectedVariant.color_name,
      qty: currentItem.qty,
      product_name: selectedVariant.name || '',
      article: selectedVariant.article || ''
    };

    setItems(prev => [...prev, newItem]);
    setCurrentItem({ article: selectedVariant.article, product_id: 0, size_code: '', color_id: 0, qty: 0 });
    setArticleQuery(selectedVariant.article);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItemQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(id);
      return;
    }

    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const stockItem = stock.find(s => 
          s.product_id === item.product_id && 
          s.size_code === item.size_code && 
          s.color_id === item.color_id
        );
        const maxQty = stockItem?.qty || 0;
        
        if (newQty > maxQty) {
          showToast(`Максимальное количество: ${maxQty}`, 'error');
          return { ...item, qty: maxQty };
        }
        
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const increaseQuantity = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const stockItem = stock.find(s => 
          s.product_id === item.product_id && 
          s.size_code === item.size_code && 
          s.color_id === item.color_id
        );
        const maxQty = stockItem?.qty || 0;
        
        if (item.qty >= maxQty) {
          showToast(`Максимальное количество: ${maxQty}`, 'error');
          return item;
        }
        
        return { ...item, qty: item.qty + 1 };
      }
      return item;
    }));
  };

  const decreaseQuantity = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(item.qty - 1, 1);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  // Поиск цветов для автодополнения
  const searchColors = (query: string) => {
    if (!query.trim()) {
      setColorSuggestions([]);
      setShowColorSuggestions(false);
      return;
    }

    // Получаем уникальные цвета из склада, убирая дубликаты по названию
    const uniqueColors = stock
      .map(s => ({ id: s.color_id, name: s.color_name }))
      .reduce((acc: {id: number, name: string}[], color) => {
        if (!acc.some(c => c.id === color.id)) {
          acc.push(color);
        }
        return acc;
      }, [])
      .filter(color => 
        color.name.toLowerCase().includes(query.toLowerCase()) ||
        color.id.toString().includes(query.toLowerCase())
      )
      .slice(0, 10); // Ограничиваем до 10 результатов

    setColorSuggestions(uniqueColors);
    setShowColorSuggestions(uniqueColors.length > 0);
  };

  // Выбор цвета из подсказки
  const selectColor = (color: {id: number, name: string}) => {
    setCurrentItem(prev => ({ 
      ...prev, 
      color_id: color.id,
      qty: 0
    }));
    setShowColorSuggestions(false);
  };

  // Обработчик изменения цвета
  const handleColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const colorId = parseInt(e.target.value);
    setCurrentItem(prev => ({
      ...prev,
      color_id: colorId,
      qty: 0
    }));
  };

  const getUserDisplayName = (user: User) => {
    return `${user.first_name} ${user.last_name}`.trim() || user.email;
  };

  const handleSubmit = async () => {
    if (!form.recipient_id) {
      showToast('Выберите получателя', 'error');
      return;
    }

    if (items.length === 0) {
      showToast('Добавьте хотя бы одну позицию', 'error');
      return;
    }

    // Проверяем, что все позиции имеют корректные данные
    for (const item of items) {
      if (!item.product_id || !item.size_code || !item.color_id || item.qty <= 0) {
        showToast('Заполните все обязательные поля для всех позиций', 'error');
        return;
      }
    }

    setLoading(true);

    try {
      const requestData = { 
        recipient_id: form.recipient_id,
        notes: form.notes,
        items: items.map(item => ({
          product_id: item.product_id,
          size_code: item.size_code,
          color_id: item.color_id,
          qty: item.qty
        }))
      };
      
      const response = await fetch('/api/realization/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Если есть детали ошибок валидации, показываем их
        if (data.details && Array.isArray(data.details)) {
          const errorMessage = data.details.join('; ');
          throw new Error(errorMessage);
        }
        throw new Error(data.error);
      }
      
      showToast('Реализация создана успешно', 'success');
      router.push('/realization');
    } catch (e: any) {
      console.error('Ошибка создания реализации:', e);
      showToast(e.message || 'Ошибка создания реализации', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, stockRes, productsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/stock/stock-details'),
          fetch('/api/products')
        ]);

        const [usersData, stockData, productsData] = await Promise.all([
          usersRes.json(),
          stockRes.json(),
          productsRes.json()
        ]);

        if (usersData.data?.users) setUsers(usersData.data.users);
        else if (usersData.users) setUsers(usersData.users);
        
        if (stockData.items) {
          setStock(stockData.items);
          console.log('Загружено товаров со склада:', stockData.items.length);
        } else {
          console.warn('Данные склада не получены:', stockData);
          setStock([]);
        }
        
        if (productsData.data?.products) setProducts(productsData.data.products);
        else if (productsData.products) setProducts(productsData.products);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showToast('Ошибка загрузки данных', 'error');
      }
    };

    fetchData();
  }, [showToast]);

  return (
    <div>
      <PageHeader
        title="Создать реализацию"
        showBackButton
        backHref="/realization"
        action={{ 
          label: loading ? 'Сохранение...' : 'Сохранить', 
          onClick: handleSubmit,
          disabled: loading 
        }}
      >
        <button 
          type="button" 
          onClick={addItem} 
          className="btn text-xs disabled:opacity-50"
          disabled={!currentItem.product_id || !currentItem.size_code || !currentItem.color_id || currentItem.color_id === 0 || (currentItem.qty||0) <= 0}
        >
          Добавить позицию
        </button>
      </PageHeader>

      <div className="space-y-6">
        {/* Получатель */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Кому передали *
            </label>
            <select
              value={form.recipient_id}
              onChange={(e) => setForm(prev => ({ ...prev, recipient_id: e.target.value }))}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Выберите получателя</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {getUserDisplayName(u)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Добавление позиций */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Добавить товар
            <span className="text-sm font-normal text-gray-600 ml-2">
              (всего на складе: {stock.length} позиций, {[...new Set(stock.map(s => s.article))].length} артикулов)
            </span>
          </h3>
          
          {stock.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Товары не загружены</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    Пожалуйста, подождите, пока загрузятся данные склада, или обновите страницу.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Артикул */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Артикул * 
                <span className="text-xs text-gray-500 ml-1">
                  (доступно {[...new Set(stock.map(s => s.article))].length} артикулов)
                </span>
              </label>
              <input
                type="text"
                value={articleQuery}
                onChange={handleArticleChange}
                onFocus={() => {
                  // Показываем подсказки при фокусе
                  if (articleQuery.trim()) {
                    searchArticles(articleQuery);
                  } else {
                    // Показываем все доступные артикулы при фокусе, если поле пустое
                    searchArticles('', true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowArticleSuggestions(false), 100);
                  // Дополнительный поиск при потере фокуса
                  if (articleQuery.trim()) {
                    const stockItem = stock.find(s => s.article === articleQuery.trim());
                    if (stockItem && currentItem.article !== stockItem.article) {
                      setCurrentItem({ article: stockItem.article, product_id: 0, size_code: '', color_id: 0, qty: 0 });
                    } else if (!stockItem) {
                      setCurrentItem({ article: '', product_id: 0, size_code: '', color_id: 0, qty: 0 });
                    }
                  }
                }}
                className={`block w-full rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                  articleError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Начните вводить артикул или название товара..."
                required
              />
              {articleError && (
                <p className="mt-1 text-sm text-red-600">{articleError}</p>
              )}
              {showArticleSuggestions && articleSuggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {articleSuggestions.map(p => (
                    <div
                      key={p.article}
                      className="p-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                      onMouseDown={() => selectArticle(p)}
                    >
                      <div className="text-sm text-gray-900 font-mono">{p.article}</div>
                      <div className="text-xs text-gray-500">{p.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Размер */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Размер *</label>
              <select
                value={currentItem.size_code}
                onChange={(e) => setCurrentItem(prev => ({ 
                  ...prev, 
                  size_code: e.target.value,
                  color_id: 0,
                  qty: 0
                }))}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                required
                disabled={!currentItem.article}
              >
                <option value="">Выберите размер</option>
                {currentItem.article ? availableSizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                )) : []}
              </select>
            </div>

            {/* Цвет */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Цвет *</label>
              <select
                value={currentItem.color_id || ''}
                onChange={handleColorChange}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                required
                disabled={!currentItem.article || !currentItem.size_code}
              >
                <option value="">Выберите цвет</option>
                {currentItem.article && currentItem.size_code ? availableColors.map(color => (
                  <option key={color.id} value={color.id}>
                    {color.name}
                  </option>
                )) : []}
              </select>
            </div>

            {/* Количество */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество * 
                {maxQty > 0 && (
                  <span className="text-xs text-gray-500 ml-2">(на складе: {maxQty})</span>
                )}
              </label>
              <input
                type="number"
                value={currentItem.qty || ''}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, qty: parseInt(e.target.value) || 0 }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                required
                disabled={!selectedVariant}
                max={maxQty}
                placeholder={maxQty > 0 ? `Максимум: ${maxQty}` : ''}
              />
            </div>
          </div>
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
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Размер</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цвет</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Количество</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map(item => (
                    <React.Fragment key={item.id}>
                      <tr>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.product_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 font-mono">{item.article}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.size_code}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.color_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-20 rounded border border-gray-300 p-1 text-center focus:border-blue-500 focus:ring-blue-500"
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
                      {stock.filter(s => s.article === item.article && s.size_code === item.size_code && s.color_id === item.color_id).map(s => (
                        <tr key={`${item.id}-stock-${s.product_id}`} className="bg-gray-50 text-xs text-gray-500">
                          <td colSpan={4} className="px-3 py-1 text-right">На складе:</td>
                          <td className="px-3 py-1">{s.qty}</td>
                          <td colSpan={2}></td>
                        </tr>
                      ))}
                      {stock.filter(s => s.article === item.article && s.size_code === item.size_code && s.color_id === item.color_id).length === 0 && (
                        <tr key={`${item.id}-no-stock`} className="bg-red-50 text-xs text-red-500">
                          <td colSpan={7} className="px-3 py-1 text-center">Нет в наличии на складе</td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewRealizationPage;
