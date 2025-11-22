// Централизованные типы для всех сущностей с INTEGER ID

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  telegram?: string | null;
  role_id: number;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface Company {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  parent_id?: number | null;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Color {
  id: number;
  code: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  article: string;
  price: number | null;
  old_price: number | null;
  category_id: number | null;
  brand_id: number | null;
  color_id: number | null;
  composition?: string;
  is_popular: boolean;
  is_visible: boolean;
  description?: string;
  care_instructions?: string | null;
  features?: string | null;
  technical_specs?: string | null;
  materials_info?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductStock {
  id: number;
  product_id: number;
  size_code: string;
  color_id: number;
  qty: number;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: number;
  transferrer_id?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptItem {
  id: string;
  brand_id: number;
  category_id: number;
  product_id: number;
  size_code: string;
  color_id: number;
  quantity: number;
  receipt_id?: number; // ID поступления для связи
  created_at?: string; // Дата создания
  // Дополнительные поля для отображения
  product_name?: string;
  product_article?: string;
  size_name?: string;
  color_name?: string;
  brand_name?: string;
}

export interface Order {
  id: number;
  order_number?: string;
  user_id?: number;
  status?: string;
  total_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  size_code: string;
  color_id: number;
  quantity: number;
  price: number;
  created_at: string;
}

export interface Realization {
  id: number;
  realization_number: string;
  shipped_at: string;
  created_at: string;
  sender_id?: number;
  recipient_id?: number;
  sender_name?: string;
  recipient_name?: string;
  total_items?: number;
  notes?: string;
  status?: string;
  shipping_number?: string; // Для обратной совместимости
}

export interface RealizationItem {
  id: number;
  product_id: number;
  size_code: string;
  color_id: number;
  quantity: number;
  realization_id?: number; // ID реализации для связи
  created_at: string;
  // Дополнительные поля для отображения
  product_name?: string;
  size_name?: string;
  color_name?: string;
  brand_name?: string;
}

// Интерфейсы для задач склада (stock tasks)
export interface StockTask {
  id: number;
  name: string;
  position: string;
  quantity: number;
  brand?: string;
  article?: string;
  description?: string;
  status: 'новое' | 'в работе' | 'выполнено';
  created_by: string;
  created_at: string;
  updated_at?: string;
}

// Оставляем старые интерфейсы для обратной совместимости
export interface WarehouseTask extends StockTask {}

// Расширенные типы с связанными данными
export interface ProductWithDetails extends Product {
  brand?: Brand;
  category?: Category;
  subcategory?: Category;
}

export interface ReceiptWithItems extends Receipt {
  receipt_items: ReceiptItem[];
  transferrer?: User;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  user?: User;
}

// Типы для форм
export interface CreateUserForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_id: number;
}

export interface CreateProductForm {
  name: string;
  brand_id?: number;
  category_id?: number;
  subcategory_id?: number;
  article?: string;
  price?: number;
  old_price?: number;
  is_popular?: boolean;
  is_visible?: boolean;
}

export interface CreateReceiptItemForm {
  product_id: number;
  size_code: string;
  color_id: number;
  qty: number;
  price?: number;
}

export interface StockItem {
  id: number;
  product_id: number;
  size_code: string;
  color_id: number;
  qty: number;
  product?: Product;
  category?: Category;
  brand?: Brand;
}

// Оставляем старые интерфейсы для обратной совместимости
export interface WarehouseItem extends StockItem {}

// НОВЫЕ ТИПЫ ДЛЯ API ВАЛИДАЦИИ
export interface CustomerData {
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}

export interface CreateOrderRequest {
  user_id?: number;
  product_id: number;
  quantity: number;
  status?: string;
  customer_data: CustomerData;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SearchParams {
  search?: string;
  page?: string;
  limit?: string;
  status?: string;
}

export interface ColorWithProductCount extends Color {
  product_count: number;
}

export interface BrandWithManagers extends Brand {
  managers: string[];
  company_name?: string;
}

export interface CompanyWithBrands extends Company {
  brands: Brand[];
  brands_count: number;
} 