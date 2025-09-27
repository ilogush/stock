/**
 * Типизированный API клиент для проекта Logush
 * Автоматическая обработка ошибок, кэширование, retry логика
 */

import { useEffect, useState } from 'react';
import { ApiResponse, PaginationInfo } from './standardResponse';

// ===============================================
// БАЗОВЫЕ ТИПЫ
// ===============================================

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  signal?: AbortSignal;
}

export interface ApiErrorInterface {
  message: string;
  code?: string;
  status: number;
  details?: any;
}

export interface ListResponse<T> {
  data: { [key: string]: T[] };
  pagination?: PaginationInfo;
  meta?: Record<string, any>;
}

export interface ItemResponse<T> {
  data: { [key: string]: T };
  meta?: Record<string, any>;
}

// ===============================================
// ТИПЫ ДАННЫХ
// ===============================================

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  telegram?: string;
  role_id: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  role?: {
    id: number;
    name: string;
    display_name: string;
  };
  role_name?: string;
  full_name?: string;
}

export interface Product {
  id: number;
  name: string;
  article: string;
  brand_id: number;
  category_id: number;
  color_id: number;
  price?: number;
  old_price?: number;
  is_popular: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  brand?: { id: number; name: string };
  category?: { id: number; name: string };
  images?: string[];
  brandName?: string;
  categoryName?: string;
  colorName?: string;
}

export interface Color {
  id: number;
  name: string;
  created_at: string;
  product_count?: number;
}

export interface Brand {
  id: number;
  name: string;
  company_id?: number;
  description?: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

// ===============================================
// API КЛИЕНТ
// ===============================================

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;
  private defaultRetries: number;

  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.defaultTimeout = 10000; // 10 секунд
    this.defaultRetries = 3;
  }

  /**
   * Выполняет HTTP запрос с обработкой ошибок и retry
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      signal
    } = config;

    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    // Создаем AbortController для timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Используем переданный signal или создаем новый
    const finalSignal = signal || controller.signal;

    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          signal: finalSignal,
          ...(method !== 'GET' && config.body && { body: JSON.stringify(config.body) })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new ApiError(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`,
            errorData.code,
            response.status,
            errorData.details
          );
        }

        const data = await response.json();
        return data as T;

      } catch (error) {
        lastError = error;

        // Не повторяем запрос при отмене или клиентских ошибках
        if (
          (error as any)?.name === 'AbortError' ||
          (error instanceof ApiError && error.status >= 400 && error.status < 500)
        ) {
          break;
        }

        // Ждем перед повтором
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    clearTimeout(timeoutId);
    throw lastError;
  }

  // ===============================================
  // ПОЛЬЗОВАТЕЛИ
  // ===============================================

  users = {
    /**
     * Получить список пользователей
     */
    list: async (params?: {
      page?: number;
      limit?: number;
      role?: string;
      search?: string;
    }): Promise<ListResponse<User>> => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.role) queryParams.set('role', params.role);
      if (params?.search) queryParams.set('search', params.search);

      const query = queryParams.toString();
      return this.request<ListResponse<User>>(`/users${query ? `?${query}` : ''}`);
    },

    /**
     * Получить пользователя по ID
     */
    get: async (id: number): Promise<ItemResponse<User>> => {
      return this.request<ItemResponse<User>>(`/users/${id}`);
    },

    /**
     * Создать пользователя
     */
    create: async (data: Partial<User>): Promise<ItemResponse<User>> => {
      return this.request<ItemResponse<User>>('/users/create', {
        method: 'POST',
        body: data
      });
    },

    /**
     * Обновить пользователя
     */
    update: async (id: number, data: Partial<User>): Promise<ItemResponse<User>> => {
      return this.request<ItemResponse<User>>(`/users/${id}`, {
        method: 'PUT',
        body: data
      });
    },

    /**
     * Удалить пользователя
     */
    delete: async (id: number): Promise<void> => {
      return this.request<void>(`/users/${id}`, { method: 'DELETE' });
    }
  };

  // ===============================================
  // ТОВАРЫ
  // ===============================================

  products = {
    /**
     * Получить список товаров
     */
    list: async (params?: {
      page?: number;
      limit?: number;
      category?: string;
      brand?: string;
      search?: string;
      fields?: string;
    }): Promise<ListResponse<Product>> => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.category) queryParams.set('category', params.category);
      if (params?.brand) queryParams.set('brand', params.brand);
      if (params?.search) queryParams.set('search', params.search);
      if (params?.fields) queryParams.set('fields', params.fields);

      const query = queryParams.toString();
      return this.request<ListResponse<Product>>(`/products${query ? `?${query}` : ''}`);
    },

    /**
     * Получить товар по ID
     */
    get: async (id: number): Promise<ItemResponse<Product>> => {
      return this.request<ItemResponse<Product>>(`/products/${id}`);
    },

    /**
     * Создать товар
     */
    create: async (data: Partial<Product>): Promise<ItemResponse<Product>> => {
      return this.request<ItemResponse<Product>>('/products/create', {
        method: 'POST',
        body: data
      });
    },

    /**
     * Обновить товар
     */
    update: async (id: number, data: Partial<Product>): Promise<ItemResponse<Product>> => {
      return this.request<ItemResponse<Product>>(`/products/${id}`, {
        method: 'PUT',
        body: data
      });
    },

    /**
     * Загрузить изображения товара
     */
    uploadImages: async (id: number, files: File[]): Promise<any> => {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));

      return fetch(`/api/products/images/upload`, {
        method: 'POST',
        body: formData
      }).then(res => res.json());
    }
  };

  // ===============================================
  // ЦВЕТА
  // ===============================================

  colors = {
    /**
     * Получить список цветов
     */
    list: async (params?: {
      page?: number;
      limit?: number;
      search?: string;
    }): Promise<ListResponse<Color>> => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.search) queryParams.set('search', params.search);

      const query = queryParams.toString();
      return this.request<ListResponse<Color>>(`/colors${query ? `?${query}` : ''}`);
    },

    /**
     * Получить цвет по ID
     */
    get: async (id: number): Promise<ItemResponse<Color>> => {
      return this.request<ItemResponse<Color>>(`/colors/${id}`);
    },

    /**
     * Создать цвет
     */
    create: async (data: { name: string; hex_value?: string }): Promise<ItemResponse<Color>> => {
      return this.request<ItemResponse<Color>>('/colors/create', {
        method: 'POST',
        body: data
      });
    },

    /**
     * Обновить цвет
     */
    update: async (id: number, data: Partial<Color>): Promise<ItemResponse<Color>> => {
      return this.request<ItemResponse<Color>>(`/colors/${id}`, {
        method: 'PUT',
        body: data
      });
    },

    /**
     * Удалить цвет
     */
    delete: async (id: number): Promise<void> => {
      return this.request<void>(`/colors/${id}`, { method: 'DELETE' });
    }
  };

  // ===============================================
  // БРЕНДЫ
  // ===============================================

  brands = {
    /**
     * Получить список брендов
     */
    list: async (): Promise<ListResponse<Brand>> => {
      return this.request<ListResponse<Brand>>('/brands');
    },

    /**
     * Получить бренд по ID
     */
    get: async (id: number): Promise<ItemResponse<Brand>> => {
      return this.request<ItemResponse<Brand>>(`/brands/${id}`);
    },

    /**
     * Создать бренд
     */
    create: async (data: Partial<Brand>): Promise<ItemResponse<Brand>> => {
      return this.request<ItemResponse<Brand>>('/brands/create', {
        method: 'POST',
        body: data
      });
    }
  };

  // ===============================================
  // КАТЕГОРИИ
  // ===============================================

  categories = {
    /**
     * Получить список категорий
     */
    list: async (): Promise<Category[]> => {
      return this.request<Category[]>('/categories');
    }
  };

  // ===============================================
  // АВТОРИЗАЦИЯ
  // ===============================================

  auth = {
    /**
     * Авторизация
     */
    login: async (email: string, password: string): Promise<{ user: User }> => {
      return this.request<{ user: User }>('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
    },

    /**
     * Выход
     */
    logout: async (): Promise<void> => {
      return this.request<void>('/auth/logout', { method: 'POST' });
    },

    /**
     * Получить текущего пользователя
     */
    me: async (): Promise<{ user: User }> => {
      return this.request<{ user: User }>('/auth/me');
    }
  };
}

// ===============================================
// КАСТОМНАЯ ОШИБКА API
// ===============================================

class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ===============================================
// ЭКСПОРТ
// ===============================================

export const apiClient = new ApiClient();
export { ApiError };

// React hooks для удобного использования
export function useApiClient() {
  return apiClient;
}

/**
 * Hook для загрузки данных с автоматическим состоянием
 */
export function useApiData<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await fetcher();
        
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return { data, loading, error, refetch: () => fetcher() };
}
