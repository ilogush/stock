import React from 'react';

/**
 * Утилиты для оптимизации производительности
 */

// Дебаунс функция для оптимизации поиска
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle функция для ограничения частоты вызовов
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Мемоизация для дорогих вычислений
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Ленивая загрузка компонентов
export function lazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = React.lazy(importFunc);
  
  const LazyLoader: React.FC<React.ComponentProps<T>> = (props) => {
    const FallbackComponent = fallback || React.createElement('div', { 
      className: 'animate-pulse bg-gray-200 rounded h-8' 
    });
    
    return React.createElement(React.Suspense, { 
      fallback: FallbackComponent 
    }, React.createElement(LazyComponent, props));
  };

  LazyLoader.displayName = 'LazyLoader';

  return LazyLoader;
}

// Оптимизация изображений
export function optimizeImageUrl(url: string, width: number = 800): string {
  if (!url) return url;
  
  // Для Supabase Storage добавляем параметры оптимизации
  if (url.includes('supabase.co')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&quality=80&format=webp`;
  }
  
  return url;
}

// Виртуализация для больших списков
export function useVirtualization<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
  
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
}

// Оптимизация рендеринга таблиц
export function useTableOptimization<T>(
  data: T[],
  pageSize: number = 20
) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortField, setSortField] = React.useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  
  // Сортировка данных
  const sortedData = React.useMemo(() => {
    if (!sortField) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);
  
  // Пагинация
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);
  
  const totalPages = Math.ceil(sortedData.length / pageSize);
  
  return {
    data: paginatedData,
    currentPage,
    totalPages,
    sortField,
    sortDirection,
    setCurrentPage,
    setSortField,
    setSortDirection,
    totalItems: sortedData.length
  };
}

// Оптимизация форм
export function useFormOptimization<T extends Record<string, any>>(
  initialData: T,
  onSubmit: (data: T) => void | Promise<void>
) {
  const [data, setData] = React.useState<T>(initialData);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const updateField = React.useCallback((field: keyof T, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);
  
  const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [data, onSubmit, isSubmitting]);
  
  return {
    data,
    errors,
    isSubmitting,
    updateField,
    handleSubmit,
    setErrors
  };
}

// Оптимизация API запросов
export function useApiOptimization<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = [],
  options: {
    enabled?: boolean;
    cacheTime?: number;
    staleTime?: number;
  } = {}
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  const { enabled = true, cacheTime = 0, staleTime = 0 } = options;
  
  const fetchData = React.useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, enabled, dependencies]);
  
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refetch: fetchData };
}
