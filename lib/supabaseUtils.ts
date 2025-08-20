import { supabaseAdmin } from './supabaseAdmin';

/**
 * Утилиты для типичных Supabase операций
 * Упрощает работу с базой данных и устраняет дублирование кода
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface FilterOptions {
  [key: string]: any;
}

export interface SelectOptions {
  columns?: string;
  count?: boolean;
}

export interface SupabaseQueryOptions extends PaginationOptions {
  filters?: FilterOptions;
  select?: SelectOptions;
}

/**
 * Утилиты для работы с Supabase
 */
export const supabaseUtils = {
  /**
   * Получение данных с пагинацией
   */
  getWithPagination: <T = any>(
    table: string, 
    options: SupabaseQueryOptions = {}
  ) => {
    const {
      page = 1,
      limit = 20,
      orderBy,
      orderDirection = 'asc',
      filters = {},
      select = { columns: '*' }
    } = options;

    let query = supabaseAdmin
      .from(table)
      .select(select.columns, { count: select.count ? 'exact' : undefined });

    // Применяем фильтры
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Применяем сортировку
    if (orderBy) {
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });
    }

    // Применяем пагинацию
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    return query;
  },

  /**
   * Получение одной записи по ID
   */
  getById: <T = any>(table: string, id: number | string, columns = '*') => {
    return supabaseAdmin
      .from(table)
      .select(columns)
      .eq('id', id)
      .single();
  },

  /**
   * Создание записи
   */
  create: <T = any>(table: string, data: Partial<T>) => {
    return supabaseAdmin
      .from(table)
      .insert(data)
      .select()
      .single();
  },

  /**
   * Обновление записи по ID
   */
  updateById: <T = any>(table: string, id: number | string, data: Partial<T>) => {
    return supabaseAdmin
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },

  /**
   * Удаление записи по ID
   */
  deleteById: (table: string, id: number | string) => {
    return supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id);
  },

  /**
   * Обновление с обработкой ошибок
   */
  updateWithErrorHandling: async <T = any>(
    table: string, 
    id: number | string, 
    data: Partial<T>
  ): Promise<T> => {
    const { data: result, error } = await supabaseAdmin
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка обновления записи: ${error.message}`);
    }

    return result;
  },

  /**
   * Создание с обработкой ошибок
   */
  createWithErrorHandling: async <T = any>(
    table: string, 
    data: Partial<T>
  ): Promise<T> => {
    const { data: result, error } = await supabaseAdmin
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка создания записи: ${error.message}`);
    }

    return result;
  },

  /**
   * Получение с обработкой ошибок
   */
  getWithErrorHandling: async <T = any>(
    table: string, 
    options: SupabaseQueryOptions = {}
  ): Promise<{ data: T[]; count?: number }> => {
    const { data, error, count } = await supabaseUtils.getWithPagination<T>(table, options);

    if (error) {
      throw new Error(`Ошибка получения данных: ${error.message}`);
    }

    return { data: data || [], count };
  },

  /**
   * Поиск по тексту
   */
  searchByText: <T = any>(
    table: string,
    searchTerm: string,
    searchColumns: string[],
    options: Omit<SupabaseQueryOptions, 'filters'> = {}
  ) => {
    let query = supabaseUtils.getWithPagination<T>(table, options);

    // Добавляем поиск по нескольким колонкам
    if (searchTerm.trim()) {
      const searchValue = `%${searchTerm.trim()}%`;
      searchColumns.forEach((column, index) => {
        if (index === 0) {
          query = query.ilike(column, searchValue);
        } else {
          query = query.or(`${column}.ilike.${searchValue}`);
        }
      });
    }

    return query;
  },

  /**
   * Получение связанных данных
   */
  getWithRelations: <T = any>(
    table: string,
    relations: string[],
    options: SupabaseQueryOptions = {}
  ) => {
    const { select, ...otherOptions } = options;
    
    // Формируем строку для select с отношениями
    const selectString = select?.columns || '*';
    const relationsString = relations.join(',');
    const fullSelect = selectString === '*' ? relationsString : `${selectString},${relationsString}`;

    return supabaseUtils.getWithPagination<T>(table, {
      ...otherOptions,
      select: { ...select, columns: fullSelect }
    });
  },

  /**
   * Проверка существования записи
   */
  exists: async (table: string, filters: FilterOptions): Promise<boolean> => {
    let query = supabaseAdmin
      .from(table)
      .select('id', { count: 'exact', head: true });

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { count, error } = await query;

    if (error) {
      throw new Error(`Ошибка проверки существования: ${error.message}`);
    }

    return (count || 0) > 0;
  },

  /**
   * Подсчет записей
   */
  count: async (table: string, filters: FilterOptions = {}): Promise<number> => {
    let query = supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true });

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { count, error } = await query;

    if (error) {
      throw new Error(`Ошибка подсчета записей: ${error.message}`);
    }

    return count || 0;
  },

  /**
   * Пакетное обновление
   */
  batchUpdate: async <T = any>(
    table: string,
    updates: Array<{ id: number | string; data: Partial<T> }>
  ): Promise<T[]> => {
    const { data, error } = await supabaseAdmin
      .from(table)
      .upsert(updates.map(({ id, data }) => ({ id, ...data })))
      .select();

    if (error) {
      throw new Error(`Ошибка пакетного обновления: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Пакетное удаление
   */
  batchDelete: async (table: string, ids: (number | string)[]): Promise<void> => {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .in('id', ids);

    if (error) {
      throw new Error(`Ошибка пакетного удаления: ${error.message}`);
    }
  }
};
