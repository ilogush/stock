/**
 * Стандартизированные ответы API
 * Унификация всех endpoints под единый формат
 */

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  errors?: string[];
  pagination?: PaginationInfo;
  meta?: Record<string, any>;
}

export interface ApiSuccess<T = any> {
  data: T;
  pagination?: PaginationInfo;
  meta?: Record<string, any>;
}

export interface ApiError {
  error: string;
  errors?: string[];
  meta?: Record<string, any>;
}

/**
 * Создает стандартный успешный ответ
 */
export function createSuccessResponse<T>(
  data: T, 
  pagination?: PaginationInfo,
  meta?: Record<string, any>
): ApiSuccess<T> {
  const response: ApiSuccess<T> = { data };
  
  if (pagination) {
    response.pagination = pagination;
  }
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
}

/**
 * Создает стандартный ответ с ошибкой
 */
export function createErrorResponse(
  error: string, 
  errors?: string[], 
  meta?: Record<string, any>
): ApiError {
  const response: ApiError = { error };
  
  if (errors && errors.length > 0) {
    response.errors = errors;
  }
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
}

/**
 * Создает пагинацию из параметров запроса
 */
export function createPagination(
  total: number,
  page: number,
  limit: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages
  };
}

/**
 * Парсит параметры пагинации из query
 */
export function parsePaginationParams(query: any): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(query.limit as string) || 20));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

/**
 * Создает мета-информацию для ответа
 */
export function createMeta(additionalInfo?: Record<string, any>): Record<string, any> {
  const meta = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    ...additionalInfo
  };
  
  return meta;
}

/**
 * Обёртка для стандартизации списков с пагинацией
 */
export function createListResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  listKey: string,
  meta?: Record<string, any>
): ApiSuccess<Record<string, T[]>> {
  const pagination = createPagination(total, page, limit);
  const data = { [listKey]: items };
  
  return createSuccessResponse(data, pagination, meta);
}

/**
 * Обёртка для стандартизации одиночных объектов
 */
export function createItemResponse<T>(
  item: T,
  itemKey: string,
  meta?: Record<string, any>
): ApiSuccess<Record<string, T>> {
  const data = { [itemKey]: item };
  
  return createSuccessResponse(data, undefined, meta);
}

// Типы для автокомплита IDE
export type UsersListResponse = ApiSuccess<{ users: any[] }>;
export type ProductsListResponse = ApiSuccess<{ products: any[] }>;
export type ColorsListResponse = ApiSuccess<{ colors: any[] }>;
export type BrandsListResponse = ApiSuccess<{ brands: any[] }>;
export type CategoriesListResponse = ApiSuccess<{ categories: any[] }>;
export type OrdersListResponse = ApiSuccess<{ orders: any[] }>;
export type ReceiptsListResponse = ApiSuccess<{ receipts: any[] }>;

export type UserResponse = ApiSuccess<{ user: any }>;
export type ProductResponse = ApiSuccess<{ product: any }>;
export type ColorResponse = ApiSuccess<{ color: any }>;
export type BrandResponse = ApiSuccess<{ brand: any }>;
export type CategoryResponse = ApiSuccess<{ category: any }>;
export type OrderResponse = ApiSuccess<{ order: any }>;
export type ReceiptResponse = ApiSuccess<{ receipt: any }>;
