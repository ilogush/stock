/**
 * Система оптимизации запросов к базе данных
 */

import { supabaseAdmin } from '../supabaseAdmin';
import { cache } from '../unified/cache';

export interface QueryOptimizationConfig {
  enableCache: boolean;
  cacheTTL: number;
  enableBatching: boolean;
  enablePagination: boolean;
  maxBatchSize: number;
}

export interface OptimizedQueryResult<T> {
  data: T[];
  total?: number;
  cached: boolean;
  executionTime: number;
  cacheKey?: string;
}

export interface BatchQueryConfig {
  table: string;
  select: string;
  filters?: Record<string, any>;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

class QueryOptimizer {
  private config: QueryOptimizationConfig;
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor(config: QueryOptimizationConfig = {
    enableCache: true,
    cacheTTL: 300000, // 5 минут
    enableBatching: true,
    enablePagination: true,
    maxBatchSize: 100
  }) {
    this.config = config;
  }

  /**
   * Оптимизированный запрос с кэшированием
   */
  async executeQuery<T>(
    queryBuilder: (client: any) => any,
    cacheKey: string,
    options: { ttl?: number; enableCache?: boolean } = {}
  ): Promise<OptimizedQueryResult<T>> {
    const start = Date.now();
    const ttl = options.ttl || this.config.cacheTTL;
    const enableCache = options.enableCache !== false && this.config.enableCache;

    // Проверяем кэш
    if (enableCache) {
      const cached = cache.getOnly(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          cached: true,
          executionTime: Date.now() - start,
          cacheKey
        };
      }
    }

    // Выполняем запрос
    const { data, error, count } = await queryBuilder(supabaseAdmin);

    if (error) {
      throw new Error(`Query error: ${error.message}`);
    }

    const executionTime = Date.now() - start;

    // Сохраняем в кэш
    if (enableCache && data) {
      cache.set(cacheKey, data, { ttl, tags: ['query'] });
    }

    return {
      data: data || [],
      total: count,
      cached: false,
      executionTime,
      cacheKey
    };
  }

  /**
   * Пакетное выполнение запросов
   */
  async executeBatchQueries<T>(
    queries: BatchQueryConfig[],
    options: { enableCache?: boolean; ttl?: number } = {}
  ): Promise<OptimizedQueryResult<T>[]> {
    if (!this.config.enableBatching || queries.length === 0) {
      return [];
    }

    const start = Date.now();
    const results: OptimizedQueryResult<T>[] = [];

    // Группируем запросы по таблицам для оптимизации
    const queriesByTable = new Map<string, BatchQueryConfig[]>();
    queries.forEach(query => {
      if (!queriesByTable.has(query.table)) {
        queriesByTable.set(query.table, []);
      }
      queriesByTable.get(query.table)!.push(query);
    });

    // Выполняем запросы параллельно
    const promises = Array.from(queriesByTable.entries()).map(async ([table, tableQueries]) => {
      return this.executeTableBatchQueries<T>(table, tableQueries, options);
    });

    const batchResults = await Promise.all(promises);
    const allResults = batchResults.flat();

    console.log(`📊 Batch query executed: ${queries.length} queries in ${Date.now() - start}ms`);

    return allResults;
  }

  /**
   * Выполнение пакетных запросов для одной таблицы
   */
  private async executeTableBatchQueries<T>(
    table: string,
    queries: BatchQueryConfig[],
    options: { enableCache?: boolean; ttl?: number } = {}
  ): Promise<OptimizedQueryResult<T>[]> {
    const results: OptimizedQueryResult<T>[] = [];

    for (const query of queries) {
      const cacheKey = this.generateCacheKey(table, query);
      
      try {
        const result = await this.executeQuery<T>(
          (client) => {
            let queryBuilder = client.from(table).select(query.select, { count: 'exact' });

            // Применяем фильтры
            if (query.filters) {
              Object.entries(query.filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                  queryBuilder = queryBuilder.in(key, value);
                } else {
                  queryBuilder = queryBuilder.eq(key, value);
                }
              });
            }

            // Применяем сортировку
            if (query.orderBy) {
              const [column, direction] = query.orderBy.split(' ');
              queryBuilder = queryBuilder.order(column, { ascending: direction !== 'desc' });
            }

            // Применяем пагинацию
            if (query.limit) {
              const offset = query.offset || 0;
              queryBuilder = queryBuilder.range(offset, offset + query.limit - 1);
            }

            return queryBuilder;
          },
          cacheKey,
          options
        );

        results.push(result);
      } catch (error) {
        console.error(`Error executing batch query for ${table}:`, error);
        results.push({
          data: [],
          cached: false,
          executionTime: 0,
          cacheKey
        });
      }
    }

    return results;
  }

  /**
   * Генерирует ключ кэша для запроса
   */
  private generateCacheKey(table: string, query: BatchQueryConfig): string {
    const key = `${table}:${query.select}:${JSON.stringify(query.filters || {})}:${query.orderBy || ''}:${query.limit || 'all'}:${query.offset || 0}`;
    return `query:${Buffer.from(key).toString('base64').slice(0, 32)}`;
  }

  /**
   * Оптимизированный поиск с полнотекстовым индексом
   */
  async fullTextSearch<T>(
    table: string,
    searchTerm: string,
    searchColumns: string[],
    options: {
      limit?: number;
      offset?: number;
      filters?: Record<string, any>;
      enableCache?: boolean;
    } = {}
  ): Promise<OptimizedQueryResult<T>> {
    const cacheKey = `search:${table}:${searchTerm}:${searchColumns.join(',')}:${JSON.stringify(options.filters || {})}`;
    
    return this.executeQuery<T>(
      (client) => {
        let queryBuilder = client.from(table).select('*', { count: 'exact' });

        // Применяем фильтры
        if (options.filters) {
          Object.entries(options.filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              queryBuilder = queryBuilder.in(key, value);
            } else {
              queryBuilder = queryBuilder.eq(key, value);
            }
          });
        }

        // Полнотекстовый поиск
        if (searchTerm && searchColumns.length > 0) {
          const searchConditions = searchColumns.map(column => 
            `${column}.ilike.%${searchTerm}%`
          ).join(',');
          queryBuilder = queryBuilder.or(searchConditions);
        }

        // Применяем пагинацию
        if (options.limit) {
          const offset = options.offset || 0;
          queryBuilder = queryBuilder.range(offset, offset + options.limit - 1);
        }

        return queryBuilder;
      },
      cacheKey,
      { enableCache: options.enableCache }
    );
  }

  /**
   * Оптимизированная загрузка связанных данных
   */
  async loadRelatedData<T>(
    mainTable: string,
    mainIds: number[],
    relatedTables: Array<{
      table: string;
      foreignKey: string;
      select: string;
      localKey?: string;
    }>,
    options: { enableCache?: boolean } = {}
  ): Promise<Map<number, T>> {
    if (mainIds.length === 0) {
      return new Map();
    }

    const results = new Map<number, T>();
    const cacheKey = `related:${mainTable}:${mainIds.join(',')}:${relatedTables.map(t => t.table).join(',')}`;

    // Проверяем кэш
    if (options.enableCache !== false) {
      const cached = cache.getOnly(cacheKey);
      if (cached) {
        return new Map(cached);
      }
    }

    // Загружаем связанные данные параллельно
    const promises = relatedTables.map(async (related) => {
      const { data, error } = await supabaseAdmin
        .from(related.table)
        .select(related.select)
        .in(related.foreignKey, mainIds);

      if (error) {
        console.error(`Error loading related data from ${related.table}:`, error);
        return [];
      }

      return data || [];
    });

    const relatedDataArrays = await Promise.all(promises);

    // Группируем данные по основным ID
    mainIds.forEach(mainId => {
      const relatedData: any = {};
      
      relatedTables.forEach((related, index) => {
        const relatedDataArray = relatedDataArrays[index];
        const key = related.localKey || related.foreignKey;
        relatedData[related.table] = relatedDataArray.filter((item: any) => 
          item[key] === mainId
        );
      });

      results.set(mainId, relatedData as T);
    });

    // Сохраняем в кэш
    if (options.enableCache !== false) {
      cache.set(cacheKey, Array.from(results.entries()), { ttl: 300000, tags: ['related'] });
    }

    return results;
  }

  /**
   * Очищает кэш запросов
   */
  clearQueryCache(pattern?: string): void {
    if (pattern) {
      cache.invalidateByPattern(pattern);
    } else {
      cache.invalidateByTags(['query', 'related']);
    }
  }

  /**
   * Получает статистику оптимизации
   */
  getOptimizationStats(): {
    cacheSize: number;
    queryCount: number;
    averageExecutionTime: number;
    cacheHitRate: number;
  } {
    const cacheStats = cache.getStats();
    
    return {
      cacheSize: cacheStats.size,
      queryCount: cacheStats.hits + cacheStats.misses,
      averageExecutionTime: 0, // Будет обновлено при выполнении запросов
      cacheHitRate: cacheStats.hitRate
    };
  }
}

// Глобальный экземпляр оптимизатора
export const queryOptimizer = new QueryOptimizer();

/**
 * Хелпер для создания оптимизированного запроса
 */
export function createOptimizedQuery<T>(
  table: string,
  options: {
    select?: string;
    filters?: Record<string, any>;
    orderBy?: string;
    limit?: number;
    offset?: number;
    enableCache?: boolean;
    ttl?: number;
  } = {}
) {
  const cacheKey = queryOptimizer['generateCacheKey'](table, {
    table,
    select: options.select || '*',
    filters: options.filters,
    orderBy: options.orderBy,
    limit: options.limit,
    offset: options.offset
  });

  return queryOptimizer.executeQuery<T>(
    (client) => {
      let queryBuilder = client.from(table).select(options.select || '*', { count: 'exact' });

      // Применяем фильтры
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            queryBuilder = queryBuilder.in(key, value);
          } else {
            queryBuilder = queryBuilder.eq(key, value);
          }
        });
      }

      // Применяем сортировку
      if (options.orderBy) {
        const [column, direction] = options.orderBy.split(' ');
        queryBuilder = queryBuilder.order(column, { ascending: direction !== 'desc' });
      }

      // Применяем пагинацию
      if (options.limit) {
        const offset = options.offset || 0;
        queryBuilder = queryBuilder.range(offset, offset + options.limit - 1);
      }

      return queryBuilder;
    },
    cacheKey,
    { enableCache: options.enableCache, ttl: options.ttl }
  );
}
