// lib/databaseService.ts
import { supabaseAdmin } from './supabaseAdmin';
import { supabase } from './supabaseClient';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class DatabaseService {
  /**
   * Получает данные с пагинацией
   */
  static async getPaginatedData<T>(
    table: string,
    options: PaginationOptions = {},
    select: string = '*',
    filters: Record<string, any> = {}
  ): Promise<PaginationResult<T>> {
    const {
      page = 1,
      limit = 20,
      orderBy = 'created_at',
      orderDirection = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from(table)
      .select(select, { count: 'exact' });

    // Применяем фильтры
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Применяем сортировку и пагинацию
    const { data, error, count } = await query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Ошибка получения данных из ${table}: ${error.message}`);
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
  }

  /**
   * Получает данные по ID
   */
  static async getById<T>(table: string, id: number | string, select: string = '*'): Promise<T | null> {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(select)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Запись не найдена
      }
      throw new Error(`Ошибка получения записи из ${table}: ${error.message}`);
    }

    return data;
  }

  /**
   * Создает новую запись
   */
  static async create<T>(table: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await supabaseAdmin
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка создания записи в ${table}: ${error.message}`);
    }

    return result;
  }

  /**
   * Обновляет запись по ID
   */
  static async update<T>(table: string, id: number | string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await supabaseAdmin
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка обновления записи в ${table}: ${error.message}`);
    }

    return result;
  }

  /**
   * Удаляет запись по ID
   */
  static async delete(table: string, id: number | string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Ошибка удаления записи из ${table}: ${error.message}`);
    }
  }

  /**
   * Получает все записи с фильтрами
   */
  static async getAll<T>(
    table: string,
    select: string = '*',
    filters: Record<string, any> = {},
    orderBy: string = 'created_at',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<T[]> {
    let query = supabaseAdmin
      .from(table)
      .select(select);

    // Применяем фильтры
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    const { data, error } = await query.order(orderBy, { ascending: orderDirection === 'asc' });

    if (error) {
      throw new Error(`Ошибка получения данных из ${table}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Проверяет существование записи
   */
  static async exists(table: string, filters: Record<string, any>): Promise<boolean> {
    let query = supabaseAdmin
      .from(table)
      .select('id', { count: 'exact', head: true });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    });

    const { count, error } = await query;

    if (error) {
      throw new Error(`Ошибка проверки существования записи в ${table}: ${error.message}`);
    }

    return (count || 0) > 0;
  }

  /**
   * Получает количество записей
   */
  static async count(table: string, filters: Record<string, any> = {}): Promise<number> {
    let query = supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    const { count, error } = await query;

    if (error) {
      throw new Error(`Ошибка подсчета записей в ${table}: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Выполняет поиск по тексту
   */
  static async search<T>(
    table: string,
    searchTerm: string,
    searchFields: string[],
    select: string = '*',
    filters: Record<string, any> = {},
    limit: number = 20
  ): Promise<T[]> {
    let query = supabaseAdmin
      .from(table)
      .select(select);

    // Применяем фильтры
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Применяем поиск
    if (searchTerm && searchFields.length > 0) {
      const searchConditions = searchFields.map(field => `${field}.ilike.%${searchTerm}%`).join(',');
      query = query.or(searchConditions);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      throw new Error(`Ошибка поиска в ${table}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Получает связанные данные через JOIN
   */
  static async getWithRelations<T>(
    table: string,
    relations: Record<string, string>,
    filters: Record<string, any> = {},
    select: string = '*'
  ): Promise<T[]> {
    let query = supabaseAdmin
      .from(table)
      .select(select);

    // Применяем фильтры
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Ошибка получения связанных данных из ${table}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Выполняет транзакцию
   */
  static async transaction<T>(operations: (() => Promise<T>)[]): Promise<T[]> {
    const results: T[] = [];
    
    for (const operation of operations) {
      try {
        const result = await operation();
        results.push(result);
      } catch (error) {
        // В случае ошибки откатываем все операции
        throw new Error(`Ошибка в транзакции: ${error}`);
      }
    }
    
    return results;
  }
}
