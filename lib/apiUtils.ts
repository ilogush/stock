import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from './supabaseAdmin';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from './actionLogger';

// Типы для универсальных API
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: string;
  limit?: string;
  offset?: string;
}

export interface SearchParams {
  search?: string;
  status?: string;
  category?: string;
  brand?: string;
}

// Универсальная функция для пагинации
export function getPaginationParams(req: NextApiRequest) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

// Универсальная функция для поиска
export function buildSearchQuery(query: any, searchFields: string[], searchTerm?: string) {
  if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim() === '') {
    return query;
  }
  
  const searchPattern = `*${searchTerm.trim()}*`;
  const searchConditions = searchFields.map(field => `${field}.ilike.${searchPattern}`);
  
  return query.or(searchConditions.join(','));
}

// Универсальная функция для создания записи
export async function createRecord<T>(
  tableName: string,
  data: T,
  req: NextApiRequest,
  res: NextApiResponse,
  actionName: string
): Promise<ApiResponse<T>> {
  try {
    const { data: record, error } = await supabaseAdmin
      .from(tableName)
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error(`Ошибка создания ${tableName}:`, error);
      const userId = getUserIdFromCookie(req);
      if (userId) {
        await logUserAction(userId, actionName, 'error', `Ошибка: ${error.message}`);
      }
      
      return { error: `Ошибка создания: ${error.message}` };
    }

    const userId = getUserIdFromCookie(req);
    if (userId) {
      await logUserAction(userId, actionName, 'success', `Создан ${tableName}: ${JSON.stringify(record)}`);
    }

    return { data: record };
  } catch (error) {
    console.error(`Ошибка сервера при создании ${tableName}:`, error);
    return { error: 'Внутренняя ошибка сервера' };
  }
}

// Универсальная функция для обновления записи
export async function updateRecord<T>(
  tableName: string,
  id: string | number,
  data: Partial<T>,
  req: NextApiRequest,
  res: NextApiResponse,
  actionName: string
): Promise<ApiResponse<T>> {
  try {
    const { data: record, error } = await supabaseAdmin
      .from(tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Ошибка обновления ${tableName}:`, error);
      const userId = getUserIdFromCookie(req);
      if (userId) {
        await logUserAction(userId, actionName, 'error', `Ошибка: ${error.message}`);
      }
      
      return { error: `Ошибка обновления: ${error.message}` };
    }

    const userId = getUserIdFromCookie(req);
    if (userId) {
      await logUserAction(userId, actionName, 'success', `Обновлен ${tableName}: ${JSON.stringify(record)}`);
    }

    return { data: record };
  } catch (error) {
    console.error(`Ошибка сервера при обновлении ${tableName}:`, error);
    return { error: 'Внутренняя ошибка сервера' };
  }
}

// Универсальная функция для удаления записи
export async function deleteRecord(
  tableName: string,
  id: string | number,
  req: NextApiRequest,
  res: NextApiResponse,
  actionName: string
): Promise<ApiResponse> {
  try {
    const { error } = await supabaseAdmin
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Ошибка удаления ${tableName}:`, error);
      const userId = getUserIdFromCookie(req);
      if (userId) {
        await logUserAction(userId, actionName, 'error', `Ошибка: ${error.message}`);
      }
      
      return { error: `Ошибка удаления: ${error.message}` };
    }

    const userId = getUserIdFromCookie(req);
    if (userId) {
      await logUserAction(userId, actionName, 'success', `Удален ${tableName} с ID: ${id}`);
    }

    return { data: { success: true } };
  } catch (error) {
    console.error(`Ошибка сервера при удалении ${tableName}:`, error);
    return { error: 'Внутренняя ошибка сервера' };
  }
}

// Универсальная функция для получения списка с пагинацией
export async function getListWithPagination<T>(
  tableName: string,
  req: NextApiRequest,
  options: {
    select?: string;
    orderBy?: string;
    searchFields?: string[];
    filters?: Record<string, any>;
    joins?: string;
  } = {}
): Promise<ApiResponse<T[]>> {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const { search, ...otherFilters } = req.query;
    
    let query = supabaseAdmin
      .from(tableName)
      .select(options.select || '*', { count: 'exact' });

    // Добавляем JOIN если указан
    if (options.joins) {
      query = query.select(options.joins);
    }

    // Применяем поиск
    if (options.searchFields && search) {
      query = buildSearchQuery(query, options.searchFields, search as string);
    }

    // Применяем фильтры
    Object.entries(otherFilters).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        if (value.includes(',')) {
          query = query.in(key, value.split(',').map(v => v.trim()));
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Применяем дополнительные фильтры
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Сортировка
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: false });
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error(`Ошибка получения списка ${tableName}:`, error);
      return { error: `Ошибка получения данных: ${error.message}` };
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      data: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages
      }
    };
  } catch (error) {
    console.error(`Ошибка сервера при получении списка ${tableName}:`, error);
    return { error: 'Внутренняя ошибка сервера' };
  }
}

// Универсальная функция для получения одной записи
export async function getRecord<T>(
  tableName: string,
  id: string | number,
  options: {
    select?: string;
    joins?: string;
  } = {}
): Promise<ApiResponse<T>> {
  try {
    let query = supabaseAdmin
      .from(tableName)
      .select(options.select || '*')
      .eq('id', id);

    if (options.joins) {
      query = query.select(options.joins);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error(`Ошибка получения ${tableName}:`, error);
      return { error: `Запись не найдена: ${error.message}` };
    }

    return { data };
  } catch (error) {
    console.error(`Ошибка сервера при получении ${tableName}:`, error);
    return { error: 'Внутренняя ошибка сервера' };
  }
}

// Универсальная валидация
export function validateRequired(value: any, fieldName: string): void {
  if (!value || (typeof value === 'string' && !value.trim())) {
    throw new Error(`Поле "${fieldName}" обязательно`);
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Некорректный email');
  }
}

export function validatePositiveInteger(value: any, fieldName: string): void {
  const num = parseInt(value);
  if (isNaN(num) || num <= 0) {
    throw new Error(`Поле "${fieldName}" должно быть положительным числом`);
  }
}

// Универсальная обработка ошибок
export function handleApiError(error: any): { message: string; status: number } {
  if (error instanceof Error) {
    return { message: error.message, status: 400 };
  }
  
  if (error?.code) {
    switch (error.code) {
      case '23505': // unique_violation
        return { message: 'Запись с такими данными уже существует', status: 409 };
      case '23503': // foreign_key_violation
        return { message: 'Нарушение целостности данных', status: 400 };
      default:
        return { message: error.message || 'Ошибка базы данных', status: 500 };
    }
  }
  
  return { message: 'Внутренняя ошибка сервера', status: 500 };
}
