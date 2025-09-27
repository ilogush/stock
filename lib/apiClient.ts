/**
 * Универсальный API клиент
 * Устраняет дублирование логики fetch запросов в 80+ местах
 */

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ApiOptions extends RequestInit {
  params?: Record<string, any>;
  timeout?: number;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  /**
   * Создает URL с параметрами
   */
  private createURL(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseURL || window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * Обрабатывает ответ API
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }
      
      return data;
    } else {
      const text = await response.text();
      
      if (!response.ok) {
        throw new Error(text || `HTTP ${response.status}`);
      }
      
      return { data: text as T };
    }
  }

  /**
   * Выполняет запрос с таймаутом
   */
  private async fetchWithTimeout(url: string, options: ApiOptions = {}): Promise<Response> {
    const { timeout = 30000, ...fetchOptions } = options;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Запрос превысил время ожидания');
      }
      throw error;
    }
  }

  /**
   * GET запрос
   */
  async get<T = any>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options;
    const url = this.createURL(endpoint, params);
    
    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      ...fetchOptions,
    });
    
    return this.handleResponse<T>(response);
  }

  /**
   * POST запрос
   */
  async post<T = any>(endpoint: string, data?: any, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options;
    const url = this.createURL(endpoint, params);
    
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...fetchOptions,
    });
    
    return this.handleResponse<T>(response);
  }

  /**
   * PUT запрос
   */
  async put<T = any>(endpoint: string, data?: any, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options;
    const url = this.createURL(endpoint, params);
    
    const response = await this.fetchWithTimeout(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...fetchOptions,
    });
    
    return this.handleResponse<T>(response);
  }

  /**
   * PATCH запрос
   */
  async patch<T = any>(endpoint: string, data?: any, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options;
    const url = this.createURL(endpoint, params);
    
    const response = await this.fetchWithTimeout(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...fetchOptions,
    });
    
    return this.handleResponse<T>(response);
  }

  /**
   * DELETE запрос
   */
  async delete<T = any>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options;
    const url = this.createURL(endpoint, params);
    
    const response = await this.fetchWithTimeout(url, {
      method: 'DELETE',
      ...fetchOptions,
    });
    
    return this.handleResponse<T>(response);
  }

  /**
   * Загрузка файла
   */
  async upload<T = any>(endpoint: string, formData: FormData, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options;
    const url = this.createURL(endpoint, params);
    
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      body: formData,
      ...fetchOptions,
    });
    
    return this.handleResponse<T>(response);
  }
}

// Экспортируем экземпляр по умолчанию
export const apiClient = new ApiClient();

// Экспортируем класс для создания кастомных клиентов
export { ApiClient };
