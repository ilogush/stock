import { useEffect, useState, useMemo } from 'react';
import type { NextPage } from 'next';
import { DocumentArrowDownIcon, PrinterIcon, MagnifyingGlassIcon, XMarkIcon, PlusIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../components/ToastContext';
import PageHeader from '../../components/PageHeader';
import { useDebouncedCallback } from '../../lib/hooks/useDebounce';
import Paginator from '../../components/Paginator';

interface IncomeReportItem {
  id: number;
  date: string;
  sender: string;
  recipient: string;
  itemsCount: number;
  totalQuantity: number;
  items: Array<{
    product_id: number;
    product_name: string;
    article: string;
    brand: string;
    size_code: string;
    color: string;
    color_id: number | null;
    category_id: number | null;
    qty: number;
  }>;
}

interface ReceiptReportItem {
  id: number;
  date: string;
  transferrer: string;
  itemsCount: number;
  totalQuantity: number;
  items: Array<{
    product_id: number;
    product_name: string;
    article: string;
    brand: string;
    size_code: string;
    color: string;
    color_id: number | null;
    category_id: number | null;
    qty: number;
  }>;
}

interface User {
  id: number;
  first_name?: string;
  last_name?: string;
  email: string;
}

type ReportType = 'receipts' | 'realization' | 'stock' | null;
type DateRangeType = 'all' | 'month' | 'week' | 'day' | 'custom';

const ReportsPage: NextPage = () => {
  const { showToast } = useToast();
  
  // Шаг 1: Тип отчета (по умолчанию - Реализация)
  const [reportType, setReportType] = useState<ReportType>('realization');
  
  // Шаг 2: Период
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(() => {
    // По умолчанию текущая дата
    return new Date().toISOString().split('T')[0];
  });
  
  // Шаг 3: Пользователи (для реализаций и поступлений)
  const [selectedSenderId, setSelectedSenderId] = useState<number | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [recipients, setRecipients] = useState<User[]>([]);
  const [senders, setSenders] = useState<User[]>([]);
  const [transferrers, setTransferrers] = useState<User[]>([]);
  
  // Поиск артикулов
  const [articleSearch, setArticleSearch] = useState<string>('');
  const [debouncedArticleSearch, setDebouncedArticleSearch] = useState<string>('');
  
  // Категория для склада
  const [stockCategory, setStockCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  
  // Пагинация
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Загружаем всех пользователей из базы данных
  useEffect(() => {
    let cancelled = false;
    
    const fetchUsers = async () => {
      try {
        // Загружаем всех пользователей без ограничений
        let allUsers: User[] = [];
        let page = 1;
        let hasMore = true;
        const limit = 1000;

        while (hasMore && !cancelled) {
          const res = await fetch(`/api/users?page=${page}&limit=${limit}`);
          const data = await res.json();
          
          if (cancelled) return;
          
          if (res.ok) {
            // API возвращает { data: { users: [...], pagination: {...} } }
            const usersList = data.data?.users || data.users || [];
            allUsers = [...allUsers, ...usersList];
            
            const pagination = data.data?.pagination || data.pagination;
            if (pagination) {
              hasMore = page < pagination.totalPages;
              page++;
            } else {
              hasMore = usersList.length === limit;
              page++;
            }
          } else {
            console.error('Ошибка загрузки пользователей:', data.error);
            hasMore = false;
          }
        }

        if (!cancelled) {
          setUsers(allUsers);
          console.log(`Загружено пользователей: ${allUsers.length}`);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Ошибка загрузки пользователей:', err);
        }
      }
    };
    fetchUsers();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Загружаем получателей из реализаций
  useEffect(() => {
    let cancelled = false;
    
    const fetchRecipients = async () => {
      try {
        const res = await fetch('/api/reports/recipients');
        const data = await res.json();
        
        if (cancelled) return;
        
        if (res.ok && data.data && data.data.recipients) {
          setRecipients(data.data.recipients);
          console.log(`Загружено получателей: ${data.data.recipients.length}`);
        } else {
          console.error('Ошибка загрузки получателей:', data.error);
          setRecipients([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Ошибка загрузки получателей:', err);
          setRecipients([]);
        }
      }
    };
    fetchRecipients();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Загружаем отправителей из реализаций
  useEffect(() => {
    let cancelled = false;
    
    const fetchSenders = async () => {
      try {
        const res = await fetch('/api/reports/senders');
        const data = await res.json();
        
        if (cancelled) return;
        
        if (res.ok && data.data && data.data.senders) {
          setSenders(data.data.senders);
          console.log(`Загружено отправителей: ${data.data.senders.length}`);
        } else {
          console.error('Ошибка загрузки отправителей:', data.error);
          setSenders([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Ошибка загрузки отправителей:', err);
          setSenders([]);
        }
      }
    };
    fetchSenders();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Загружаем пользователей из поступлений
  useEffect(() => {
    let cancelled = false;
    
    const fetchTransferrers = async () => {
      try {
        const res = await fetch('/api/reports/transferrers');
        const data = await res.json();
        
        if (cancelled) return;
        
        if (res.ok && data.data && data.data.transferrers) {
          setTransferrers(data.data.transferrers);
          console.log(`Загружено передатчиков: ${data.data.transferrers.length}`);
        } else {
          console.error('Ошибка загрузки передатчиков:', data.error);
          setTransferrers([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Ошибка загрузки передатчиков:', err);
          setTransferrers([]);
        }
      }
    };
    fetchTransferrers();
    
    return () => {
      cancelled = true;
    };
  }, []);


  // Устанавливаем даты при изменении типа периода
  useEffect(() => {
    const now = new Date();
    
    if (dateRangeType === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (dateRangeType === 'week') {
      // Начало недели (понедельник)
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const firstDay = new Date(now.setDate(diff));
      firstDay.setHours(0, 0, 0, 0);
      // Конец недели (воскресенье)
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (dateRangeType === 'day') {
      const today = now.toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    } else if (dateRangeType === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (dateRangeType === 'custom') {
      // При выборе "указать даты" устанавливаем дату окончания на текущую, если она не установлена
      if (!endDate) {
        setEndDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [dateRangeType]);

  // Валидация: дата начала не может быть больше даты окончания
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      showToast('Дата начала не может быть больше даты окончания', 'error');
      // Автоматически исправляем: устанавливаем дату окончания равной дате начала
      setEndDate(startDate);
    }
  }, [startDate, endDate, showToast]);

  // Загружаем категории для склада
  useEffect(() => {
    let cancelled = false;
    
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        
        if (cancelled) return;
        
        if (res.ok && data.data && data.data.categories) {
          setCategories(data.data.categories.map((c: any) => ({ id: String(c.id), name: c.name })));
        } else {
          // Fallback категории
          setCategories([
            { id: '322', name: 'женская' },
            { id: '323', name: 'мужская' },
            { id: '324', name: 'детское' }
          ]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Ошибка загрузки категорий:', err);
          // Fallback категории
          setCategories([
            { id: '322', name: 'женская' },
            { id: '323', name: 'мужская' },
            { id: '324', name: 'детское' }
          ]);
        }
      }
    };
    
    fetchCategories();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Сбрасываем reportData при изменении параметров фильтрации
  useEffect(() => {
    setReportData(null);
  }, [reportType, dateRangeType, selectedSenderId, selectedRecipientId, startDate, endDate, stockCategory]);

  const fetchReport = async (abortSignal?: AbortSignal) => {
    if (!reportType) return;

    setLoading(true);
    try {
      let url = '';
      const params = new URLSearchParams();

      if (reportType === 'realization') {
        url = '/api/reports/income';
        if (dateRangeType !== 'all') {
          if (startDate) params.append('startDate', startDate);
          if (endDate) params.append('endDate', endDate);
        }
        if (selectedSenderId) {
          params.append('senderId', selectedSenderId.toString());
        }
        if (selectedRecipientId) {
          params.append('recipientId', selectedRecipientId.toString());
        }
        if (debouncedArticleSearch && debouncedArticleSearch.trim()) {
          params.append('articleSearch', debouncedArticleSearch.trim());
        }
      } else if (reportType === 'receipts') {
        url = '/api/reports/receipts';
        if (dateRangeType !== 'all') {
          if (startDate) params.append('startDate', startDate);
          if (endDate) params.append('endDate', endDate);
        }
        if (selectedSenderId) {
          params.append('userId', selectedSenderId.toString());
        }
        if (debouncedArticleSearch && debouncedArticleSearch.trim()) {
          params.append('articleSearch', debouncedArticleSearch.trim());
        }
      } else if (reportType === 'stock') {
        url = '/api/stock';
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());
        if (stockCategory && stockCategory !== 'all') {
          params.append('category', stockCategory);
        }
        if (debouncedArticleSearch && debouncedArticleSearch.trim()) {
          params.append('search', encodeURIComponent(debouncedArticleSearch.trim()));
        }
      }

      const queryString = params.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;

      const res = await fetch(fullUrl, { 
        signal: abortSignal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // Проверяем, не была ли отмена запроса
      if (abortSignal?.aborted) {
        return;
      }
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка загрузки отчета');
      }
      
      // Для склада данные приходят в другом формате
      if (reportType === 'stock') {
        setReportData({
          items: data.items || [],
          sizes: data.sizes || [],
          pagination: data.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 }
        });
        // Обновляем пагинацию из ответа
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setReportData(data.data);
      }
    } catch (err: any) {
      // Игнорируем ошибки отмены запроса
      if (err.name === 'AbortError') {
        return;
      }
      console.error('Ошибка загрузки отчета:', err);
      showToast(err.message || 'Ошибка загрузки отчета', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (filename: string) => {
    if (!reportData) return;

    let csv = '';
    
    if (reportType === 'realization' && reportData.realizations) {
      csv = 'ID,Дата,Отправитель,Получатель,Количество позиций,Общее количество\n';
      reportData.realizations.forEach((realization: IncomeReportItem) => {
        csv += `${realization.id},"${realization.date}","${realization.sender}","${realization.recipient}",${realization.itemsCount},${realization.totalQuantity}\n`;
      });
    } else if (reportType === 'receipts' && reportData.receipts) {
      csv = 'ID,Дата,Принято от,Количество позиций,Общее количество\n';
      reportData.receipts.forEach((receipt: any) => {
        csv += `${receipt.id},"${receipt.date}","${receipt.transferrer || 'Не указан'}",${receipt.itemsCount},${receipt.totalQuantity}\n`;
      });
    } else if (reportType === 'stock' && reportData.items) {
      const stockSizes = reportData.sizes || [];
      csv = 'Бренд,Артикул,Название,Цвет,' + stockSizes.join(',') + ',Итого\n';
      reportData.items.forEach((row: any) => {
        const sizesStr = stockSizes.map((size: string, idx: number) => row.color?.sizes?.[idx] || 0).join(',');
        csv += `"${row.brandName || ''}","${row.article}","${row.name}","${row.color?.colorName || ''}",${sizesStr},${row.color?.total || 0}\n`;
      });
    }
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Debounce для поиска по артикулу
  const debouncedSearch = useDebouncedCallback((search: string) => {
    setDebouncedArticleSearch(search);
  }, 500);

  // Обновляем debounced значение при изменении поиска
  useEffect(() => {
    debouncedSearch(articleSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleSearch]);

  // Обработчик нажатия на кнопку "Показать отчет"
  const handleGenerateReport = () => {
    if (!reportType) {
      showToast('Выберите тип отчета', 'error');
      return;
    }
    
    // Для custom дат проверяем, что обе даты установлены
    if (dateRangeType === 'custom' && (!startDate || !endDate)) {
      showToast('Укажите даты начала и окончания', 'error');
      return;
    }
    
    // Сбрасываем пагинацию при новом формировании отчета
    setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 });
    
    // Создаем AbortController для отмены предыдущего запроса
    const abortController = new AbortController();
    fetchReport(abortController.signal);
  };

  const getUserDisplayName = (user: User) => {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return name || user.email;
  };

  // Группировка товаров по артикулу и цвету с размерами (как на складе)
  const groupItemsByArticleAndColor = (items: Array<{
    product_id: number;
    product_name: string;
    article: string;
    brand: string;
    size_code: string;
    color: string;
    color_id: number | null;
    category_id: number | null;
    qty: number;
  }>, searchTerm?: string) => {
    // Фильтруем товары по поисковому запросу, если он указан
    let filteredItems = items;
    if (searchTerm && searchTerm.trim()) {
      const search = searchTerm.trim().toLowerCase();
      filteredItems = items.filter(item => 
        item.article && item.article.toLowerCase().includes(search)
      );
    }

    // Получаем все уникальные размеры
    const allSizes = new Set<string>();
    filteredItems.forEach(item => {
      if (item.size_code) allSizes.add(item.size_code);
    });
    const sizes = Array.from(allSizes).sort((a, b) => {
      // Сортируем размеры: сначала детские (числовые), потом взрослые (буквенные)
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      if (!isNaN(aNum)) return -1;
      if (!isNaN(bNum)) return 1;
      return a.localeCompare(b);
    });

    // Группируем по артикулу и цвету
    const grouped: Record<string, {
      article: string;
      name: string;
      brand: string;
      color: string;
      color_id: number | null;
      category_id: number | null;
      product_id: number;
      sizes: Record<string, number>;
      total: number;
    }> = {};

    filteredItems.forEach(item => {
      const key = `${item.article}_${item.color_id || 'null'}`;
      if (!grouped[key]) {
        grouped[key] = {
          article: item.article,
          name: item.product_name,
          brand: item.brand,
          color: item.color,
          color_id: item.color_id,
          category_id: item.category_id,
          product_id: item.product_id,
          sizes: {},
          total: 0
        };
      }
      grouped[key].sizes[item.size_code] = (grouped[key].sizes[item.size_code] || 0) + item.qty;
      grouped[key].total += item.qty;
    });

    return { grouped: Object.values(grouped), sizes };
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex flex-row justify-between items-center gap-2 mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Отчеты</h1>
        <div className="flex items-center gap-3 no-print">
          {/* Показываем "Показать отчет" до формирования, после - "Экспорт CSV" и "Печать" */}
          {!reportData ? (
            <button
              onClick={handleGenerateReport}
              disabled={!reportType || loading}
              className="btn text-xs flex items-center gap-2 hover:bg-gray-800 hover:text-white disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" />
              {loading ? 'Загрузка...' : 'Показать отчет'}
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  if (reportType && reportData) {
                    exportToCSV(`report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`);
                  }
                }}
                disabled={!reportType || !reportData}
                className="btn text-xs flex items-center gap-2 hover:bg-gray-800 hover:text-white disabled:opacity-50"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                Экспорт CSV
              </button>
              <button
                onClick={handlePrint}
                className="btn text-xs flex items-center justify-center hover:bg-gray-800 hover:text-white hidden sm:flex"
                title="Печать"
              >
                <PrinterIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Табы с поиском */}
      <div className="mb-4 mt-4 sm:mt-0">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="flex gap-2 pb-2 overflow-x-auto -mx-2 px-2 no-print" aria-label="Tabs">
            <button
              onClick={() => setDateRangeType('all')}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                dateRangeType === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              за все время
            </button>
            <button
              onClick={() => setDateRangeType('month')}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                dateRangeType === 'month'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              за месяц
            </button>
            <button
              onClick={() => setDateRangeType('week')}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                dateRangeType === 'week'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              за неделю
            </button>
            <button
              onClick={() => setDateRangeType('day')}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                dateRangeType === 'day'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              за сутки
            </button>
            <button
              onClick={() => setDateRangeType('custom')}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                dateRangeType === 'custom'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              указать даты
            </button>
            </div>
            
            <div className="relative w-auto no-print">
              <div className="relative">
                <input
                  type="text"
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="search-input block w-full pl-10 pr-10"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                {articleSearch && (
                  <button
                    onClick={() => setArticleSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    title="Очистить поиск"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {dateRangeType === 'custom' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 no-print">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата начала
                </label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата окончания
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          )}

      {/* Фильтры - скрыты при печати */}
      <div className="space-y-6 no-print">
        {/* Объединенный блок: Выбор типа отчета и пользователя */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          {/* Выбор типа отчета */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип отчета</label>
            <select
              value={reportType || 'realization'}
              onChange={(e) => setReportType(e.target.value as 'receipts' | 'realization' | 'stock')}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="receipts">Поступления</option>
              <option value="realization">Реализация</option>
              <option value="stock">Склад</option>
            </select>
          </div>

          {/* Отправитель - отображается только для реализаций и поступлений */}
          {reportType !== 'stock' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {reportType === 'realization' ? 'Отправитель' : 'Принято от'}
              </label>
              <select
                value={selectedSenderId || ''}
                onChange={(e) => setSelectedSenderId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">
                  {reportType === 'realization' ? 'Все отправители' : 'Все пользователи'}
                </option>
                {(reportType === 'realization' ? senders : transferrers).map(user => (
                  <option key={user.id} value={user.id}>
                    {getUserDisplayName(user)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Категория для склада */}
          {reportType === 'stock' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Категория</label>
              <select
                value={stockCategory}
                onChange={(e) => setStockCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">все</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Получатель - только для реализаций */}
          {reportType === 'realization' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Получатель</label>
              <select
                value={selectedRecipientId || ''}
                onChange={(e) => setSelectedRecipientId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Все получатели</option>
                {recipients.map(user => (
                  <option key={user.id} value={user.id}>
                    {getUserDisplayName(user)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Таблица данных - всегда отображается, включая при печати */}
      <div className="overflow-x-auto mt-4 print:overflow-visible">
          {loading ? (
            <div className="text-center text-gray-500 py-4">Загрузка...</div>
          ) : reportType === 'realization' && reportData && reportData.realizations && reportData.realizations.length > 0 ? (
            (() => {
              // Объединяем все товары из всех реализаций
              const allItems: Array<{
                product_id: number;
                product_name: string;
                article: string;
                brand: string;
                size_code: string;
                color: string;
                color_id: number | null;
                category_id: number | null;
                qty: number;
              }> = [];
              reportData.realizations.forEach((realization: IncomeReportItem) => {
                if (realization.items) {
                  allItems.push(...realization.items);
                }
              });
              const { grouped: allGrouped, sizes } = groupItemsByArticleAndColor(allItems, debouncedArticleSearch);
              
              if (allGrouped.length === 0) {
                return <div className="text-center text-gray-500 py-4">Нет данных</div>;
              }
              
              // Применяем пагинацию
              const totalItems = allGrouped.length;
              const startIndex = (pagination.page - 1) * pagination.limit;
              const endIndex = startIndex + pagination.limit;
              const paginatedGrouped = allGrouped.slice(startIndex, endIndex);
              
              // Обновляем пагинацию
              const totalPages = Math.max(1, Math.ceil(totalItems / pagination.limit));
              if (pagination.total !== totalItems || pagination.totalPages !== totalPages) {
                setPagination(prev => ({ ...prev, total: totalItems, totalPages }));
              }
              
              // Вычисляем итог
              const totalQty = allGrouped.reduce((sum, row) => sum + row.total, 0);
              
              return (
                <>
                  <table className="table-standard">
                    <thead>
                      <tr>
                        <th className="table-header no-print">Фото</th>
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
                      {paginatedGrouped.map((row, index) => {
                        const imageKey = `${row.product_id}_${row.color_id}`;
                        const imageUrl = row.color_id 
                          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/products/${row.product_id}/${row.color_id}/0.jpg`
                          : null;
                        return (
                          <tr key={`${row.article}_${row.color_id}_${index}`} className="table-row-hover">
                            <td className="table-cell no-print">
                              <div className="product-image-container relative rounded overflow-hidden bg-gray-100 w-12 h-12">
                                {imageUrl && !imageErrors.has(imageKey) ? (
                                  <img
                                    src={imageUrl}
                                    alt={`${row.name} - ${row.color}`}
                                    width={48}
                                    height={48}
                                    className="product-image"
                                    onError={() => {
                                      setImageErrors(prev => new Set(prev).add(imageKey));
                                    }}
                                  />
                                ) : (
                                  <div className="product-image-placeholder flex items-center justify-center w-full h-full">
                                    <PhotoIcon className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="table-cell">{row.brand || '—'}</td>
                            <td className="table-cell-mono">{row.article}</td>
                            <td className="table-cell w-60">
                              <div className="break-words whitespace-normal leading-relaxed">{row.name}</div>
                            </td>
                            <td className="table-cell">
                              <span className="font-medium">{row.color}</span>
                            </td>
                            {sizes.map((size) => (
                              <td key={size} className="table-cell text-center">
                                <span className={!row.sizes[size] ? 'text-gray-400' : 'font-semibold'}>
                                  {row.sizes[size] || '—'}
                                </span>
                              </td>
                            ))}
                            <td className="table-cell text-center font-semibold">{row.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Итоги и пагинация */}
                  {allGrouped.length > 0 && (
                    <>
                      <div className="mt-4 mb-2 text-sm text-gray-600 border-t border-gray-200 pt-3">
                        <div className="flex justify-between items-center">
                          <span>
                            Артикулы: <strong>{totalItems}</strong>
                          </span>
                          <span>
                            Итог: <strong>{totalQty}</strong>
                          </span>
                        </div>
                      </div>
                      
                      {totalItems > 0 && (
                        <div className="no-print">
                        <Paginator
                          total={totalItems}
                          page={pagination.page}
                          limit={pagination.limit}
                          onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                          onPageSizeChange={(limit) => setPagination(prev => ({ ...prev, limit, page: 1 }))}
                          pageSizeOptions={[20, 50, 100]}
                        />
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()
          ) : reportType === 'receipts' && reportData && reportData.receipts && reportData.receipts.length > 0 ? (
            (() => {
              // Объединяем все товары из всех поступлений
              const allItems: Array<{
                product_id: number;
                product_name: string;
                article: string;
                brand: string;
                size_code: string;
                color: string;
                color_id: number | null;
                category_id: number | null;
                qty: number;
              }> = [];
              reportData.receipts.forEach((receipt: ReceiptReportItem) => {
                if (receipt.items) {
                  allItems.push(...receipt.items);
                }
              });
              const { grouped: allGrouped, sizes } = groupItemsByArticleAndColor(allItems, debouncedArticleSearch);
              
              if (allGrouped.length === 0) {
                return <div className="text-center text-gray-500 py-4">Нет данных</div>;
              }
              
              // Применяем пагинацию
              const totalItems = allGrouped.length;
              const startIndex = (pagination.page - 1) * pagination.limit;
              const endIndex = startIndex + pagination.limit;
              const paginatedGrouped = allGrouped.slice(startIndex, endIndex);
              
              // Обновляем пагинацию
              const totalPages = Math.max(1, Math.ceil(totalItems / pagination.limit));
              if (pagination.total !== totalItems || pagination.totalPages !== totalPages) {
                setPagination(prev => ({ ...prev, total: totalItems, totalPages }));
              }
              
              // Вычисляем итог
              const totalQty = allGrouped.reduce((sum, row) => sum + row.total, 0);
              
              return (
                <>
                  <table className="table-standard">
                    <thead>
                      <tr>
                        <th className="table-header no-print">Фото</th>
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
                      {paginatedGrouped.map((row, index) => {
                        const imageKey = `${row.product_id}_${row.color_id}`;
                        const imageUrl = row.color_id 
                          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/products/${row.product_id}/${row.color_id}/0.jpg`
                          : null;
                        return (
                          <tr key={`${row.article}_${row.color_id}_${index}`} className="table-row-hover">
                            <td className="table-cell no-print">
                              <div className="product-image-container relative rounded overflow-hidden bg-gray-100 w-12 h-12">
                                {imageUrl && !imageErrors.has(imageKey) ? (
                                  <img
                                    src={imageUrl}
                                    alt={`${row.name} - ${row.color}`}
                                    width={48}
                                    height={48}
                                    className="product-image"
                                    onError={() => {
                                      setImageErrors(prev => new Set(prev).add(imageKey));
                                    }}
                                  />
                                ) : (
                                  <div className="product-image-placeholder flex items-center justify-center w-full h-full">
                                    <PhotoIcon className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="table-cell">{row.brand || '—'}</td>
                            <td className="table-cell-mono">{row.article}</td>
                            <td className="table-cell w-60">
                              <div className="break-words whitespace-normal leading-relaxed">{row.name}</div>
                            </td>
                            <td className="table-cell">
                              <span className="font-medium">{row.color}</span>
                            </td>
                            {sizes.map((size) => (
                              <td key={size} className="table-cell text-center">
                                <span className={!row.sizes[size] ? 'text-gray-400' : 'font-semibold'}>
                                  {row.sizes[size] || '—'}
                                </span>
                              </td>
                            ))}
                            <td className="table-cell text-center font-semibold">{row.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Итоги и пагинация */}
                  {allGrouped.length > 0 && (
                    <>
                      <div className="mt-4 mb-2 text-sm text-gray-600 border-t border-gray-200 pt-3">
                        <div className="flex justify-between items-center">
                          <span>
                            Общее количество позиций: <strong>{totalItems}</strong>
                          </span>
                          <span>
                            Итог: <strong>{totalQty}</strong>
                          </span>
                        </div>
                      </div>
                      
                      {totalItems > 0 && (
                        <div className="no-print">
                        <Paginator
                          total={totalItems}
                          page={pagination.page}
                          limit={pagination.limit}
                          onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                          onPageSizeChange={(limit) => setPagination(prev => ({ ...prev, limit, page: 1 }))}
                          pageSizeOptions={[20, 50, 100]}
                        />
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()
          ) : reportType === 'stock' && reportData && reportData.items && reportData.items.length > 0 ? (
            (() => {
              const stockItems = reportData.items || [];
              const stockSizes = reportData.sizes || [];
              
              // Вычисляем итог
              const totalQty = stockItems.reduce((sum: number, row: any) => sum + (row.color?.total || 0), 0);
              
              return (
                <>
                  <table className="table-standard">
                    <thead>
                      <tr>
                        <th className="table-header">Фото</th>
                        <th className="table-header">Бренд</th>
                        <th className="table-header">Артикул</th>
                        <th className="table-header w-60">Название</th>
                        <th className="table-header">Цвет</th>
                        {stockSizes.map((size: string) => (
                          <th key={size} className="table-header text-center">
                            {size}
                          </th>
                        ))}
                        <th className="table-header text-center">Итого</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {stockItems.map((row: any, index: number) => (
                        <tr key={`${row.article}_${row.color?.colorId}_${index}`} className="table-row-hover">
                          <td className="table-cell">
                            <div className="product-image-container relative rounded overflow-hidden bg-gray-100 w-12 h-12">
                              {row.color?.images?.[0] && !imageErrors.has(`${row.article}_${row.color?.colorId}`) ? (
                                <img
                                  src={row.color.images[0]}
                                  alt={`${row.name} - ${row.color.colorName}`}
                                  width={48}
                                  height={48}
                                  className="product-image"
                                  onError={(e) => {
                                    console.error('Ошибка загрузки изображения:', row.color.images?.[0], e);
                                    setImageErrors((prev: Set<string>) => new Set(prev).add(`${row.article}_${row.color?.colorId}`));
                                  }}
                                />
                              ) : (
                                <div className="product-image-placeholder flex items-center justify-center w-full h-full">
                                  <PhotoIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="table-cell">{row.brandName || '—'}</td>
                          <td className="table-cell-mono">{row.article}</td>
                          <td className="table-cell w-60">
                            <div className="break-words whitespace-normal leading-relaxed">{row.name}</div>
                          </td>
                          <td className="table-cell">
                            <span className="font-medium">{row.color?.colorName || '—'}</span>
                          </td>
                          {stockSizes.map((size: string, sizeIndex: number) => (
                            <td key={sizeIndex} className="table-cell text-center">
                              <span className={(row.color?.sizes?.[sizeIndex] || 0) === 0 ? 'text-gray-400' : 'font-semibold'}>
                                {(row.color?.sizes?.[sizeIndex] || 0) === 0 ? '—' : row.color.sizes[sizeIndex]}
                              </span>
                            </td>
                          ))}
                          <td className="table-cell text-center font-semibold">
                            {row.color?.total || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Итоги и пагинация */}
                  {stockItems.length > 0 && (
                    <>
                      <div className="mt-4 mb-2 text-sm text-gray-600 border-t border-gray-200 pt-3">
                        <div className="flex justify-between items-center">
                          <span>
                            Итог: <strong>{totalQty}</strong>
                          </span>
                          <span>
                            Артикулы: <strong>{stockItems.length}</strong>
                          </span>
                        </div>
                      </div>
                      
                      {reportData.pagination && reportData.pagination.total > 0 && (
                        <div className="no-print">
                        <Paginator
                          total={reportData.pagination.total}
                          page={pagination.page}
                          limit={pagination.limit}
                          onPageChange={(page) => {
                            setPagination(prev => ({ ...prev, page }));
                            // Перезагружаем данные с новой страницей
                            setTimeout(() => {
                              const abortController = new AbortController();
                              fetchReport(abortController.signal);
                            }, 0);
                          }}
                          onPageSizeChange={(limit) => {
                            setPagination(prev => ({ ...prev, limit, page: 1 }));
                            // Перезагружаем данные с новым лимитом
                            setTimeout(() => {
                              const abortController = new AbortController();
                              fetchReport(abortController.signal);
                            }, 0);
                          }}
                          pageSizeOptions={[20, 50, 100]}
                        />
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()
          ) : reportType ? (
            <div className="text-center text-gray-500 py-4">Нет данных</div>
          ) : (
            <table className="table-standard">
              <thead>
                <tr>
                  <th className="table-header">Бренд</th>
                  <th className="table-header">Артикул</th>
                  <th className="table-header w-60">Название</th>
                  <th className="table-header">Цвет</th>
                  <th className="table-header text-center">Итого</th>
                </tr>
              </thead>
              <tbody className="table-body">
                <tr>
                  <td colSpan={5} className="table-cell text-center text-gray-500 py-4">
                    Выберите тип отчета
                  </td>
                </tr>
              </tbody>
            </table>
          )}
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

export default ReportsPage;
