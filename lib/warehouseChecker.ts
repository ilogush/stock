/**
 * Функции для проверки stock остатков товаров
 * Проверяет наличие товара в stock перед изменением цвета
 * Обновлено для работы без таблицы stock (ранее product_stock)
 */

import { supabaseAdmin } from './supabaseAdmin';

export interface StockItem {
  size_code: string;
  color_id: number;
  qty: number;
}

export interface StockDetailsItem {
  size_code: string;
  color_id: number;
  qty: number;
  color_name?: string;
}

/**
 * Проверяет, есть ли товар в stock остатках
 */
export async function checkProductInStock(productId: number): Promise<{
  hasStock: boolean;
  totalQuantity: number;
  stockItems: StockItem[];
}> {
  try {
    // Получаем данные из поступлений
    const { data: receiptItems, error: receiptError } = await supabaseAdmin
      .from('receipt_items')
      .select('size_code, color_id, qty')
      .eq('product_id', productId);

    if (receiptError) {
      console.error('Ошибка проверки поступлений:', receiptError);
      return { hasStock: false, totalQuantity: 0, stockItems: [] };
    }

    // Получаем данные из реализаций
    const { data: realizationItems, error: realizationError } = await supabaseAdmin
      .from('realization_items')
      .select('size_code, color_id, qty')
      .eq('product_id', productId);

    if (realizationError) {
      console.error('Ошибка проверки реализаций:', realizationError);
      return { hasStock: false, totalQuantity: 0, stockItems: [] };
    }

    // Агрегируем поступления
    const receiptAggregated: Record<string, number> = {};
    (receiptItems || []).forEach((item: any) => {
      const key = `${item.size_code}_${item.color_id}`;
      if (!receiptAggregated[key]) {
        receiptAggregated[key] = 0;
      }
      receiptAggregated[key] += item.qty || 0;
    });

    // Вычитаем реализации
    (realizationItems || []).forEach((item: any) => {
      const key = `${item.size_code}_${item.color_id}`;
      if (receiptAggregated[key] !== undefined) {
        receiptAggregated[key] = Math.max(0, receiptAggregated[key] - (item.qty || 0));
      }
    });

    // Фильтруем только положительные остатки
    const stockItems: StockItem[] = Object.entries(receiptAggregated)
      .filter(([_, qty]) => qty > 0)
      .map(([key, qty]) => {
        const [size_code, color_id] = key.split('_');
        return { size_code, color_id: parseInt(color_id), qty };
      });

    const totalQuantity = stockItems.reduce((sum, item) => sum + item.qty, 0);

    return {
      hasStock: totalQuantity > 0,
      totalQuantity,
      stockItems
    };
  } catch (error) {
    console.error('Ошибка проверки stock остатков:', error);
    return { hasStock: false, totalQuantity: 0, stockItems: [] };
  }
}

// Алиас для обратной совместимости
export const checkProductInWarehouse = checkProductInStock;

/**
 * Проверяет, можно ли изменить цвет товара
 */
export async function canChangeProductColor(productId: number): Promise<{
  canChange: boolean;
  reason?: string;
  stockInfo?: {
    totalQuantity: number;
    stockItems: StockItem[];
  };
}> {
  const stockCheck = await checkProductInWarehouse(productId);

  if (stockCheck.hasStock) {
    return {
      canChange: false,
      reason: `Нельзя изменить цвет товара. На складе есть остатки: ${stockCheck.totalQuantity} шт.`,
      stockInfo: {
        totalQuantity: stockCheck.totalQuantity,
        stockItems: stockCheck.stockItems
      }
    };
  }

  return {
    canChange: true
  };
}

/**
 * Получает информацию о складских остатках для отображения
 */
export async function getWarehouseStockInfo(productId: number): Promise<{
  totalQuantity: number;
  stockDetails: StockDetailsItem[];
}> {
  try {
    // Получаем данные из поступлений
    const { data: receiptItems, error: receiptError } = await supabaseAdmin
      .from('receipt_items')
      .select(`
        size_code, 
        color_id, 
        qty,
        colors!inner(name)
      `)
      .eq('product_id', productId);

    if (receiptError) {
      console.error('Ошибка получения поступлений:', receiptError);
      return { totalQuantity: 0, stockDetails: [] };
    }

    // Получаем данные из реализаций
    const { data: realizationItems, error: realizationError } = await supabaseAdmin
      .from('realization_items')
      .select('size_code, color_id, qty')
      .eq('product_id', productId);

    if (realizationError) {
      console.error('Ошибка получения реализаций:', realizationError);
      return { totalQuantity: 0, stockDetails: [] };
    }

    // Агрегируем поступления
    const receiptAggregated: Record<string, { qty: number; color_name?: string }> = {};
    (receiptItems || []).forEach((item: any) => {
      const key = `${item.size_code}_${item.color_id}`;
      if (!receiptAggregated[key]) {
        receiptAggregated[key] = { qty: 0, color_name: item.colors?.name };
      }
      receiptAggregated[key].qty += item.qty || 0;
    });

    // Вычитаем реализации
    (realizationItems || []).forEach((item: any) => {
      const key = `${item.size_code}_${item.color_id}`;
      if (receiptAggregated[key] !== undefined) {
        receiptAggregated[key].qty = Math.max(0, receiptAggregated[key].qty - (item.qty || 0));
      }
    });

    // Фильтруем только положительные остатки
    const stockDetails: StockDetailsItem[] = Object.entries(receiptAggregated)
      .filter(([_, data]) => data.qty > 0)
      .map(([key, data]) => {
        const [size_code, color_id] = key.split('_');
        return {
          size_code,
          color_id: parseInt(color_id),
          qty: data.qty,
          color_name: data.color_name
        };
      });

    const totalQuantity = stockDetails.reduce((sum, item) => sum + item.qty, 0);

    return {
      totalQuantity,
      stockDetails
    };
  } catch (error) {
    console.error('Ошибка получения информации о складе:', error);
    return { totalQuantity: 0, stockDetails: [] };
  }
}

export async function getStockDetails(productId: number, sizeCode?: string, colorCode?: string) {
  try {
    // Получаем данные из поступлений
    const { data: receiptItems, error: receiptError } = await supabaseAdmin
      .from('receipt_items')
      .select(`
        size_code, 
        color_id, 
        qty,
        colors!inner(name)
      `)
      .eq('product_id', productId);

    if (receiptError) {
      console.error('Ошибка получения поступлений:', receiptError);
      return { totalQuantity: 0, stockDetails: [] };
    }

    // Получаем данные из реализаций
    const { data: realizationItems, error: realizationError } = await supabaseAdmin
      .from('realization_items')
      .select('size_code, color_id, qty')
      .eq('product_id', productId);

    if (realizationError) {
      console.error('Ошибка получения реализаций:', realizationError);
      return { totalQuantity: 0, stockDetails: [] };
    }

    // Агрегируем поступления
    const receiptAggregated: Record<string, { qty: number; color_name?: string }> = {};
    (receiptItems || []).forEach((item: any) => {
      const key = `${item.size_code}_${item.color_id}`;
      if (!receiptAggregated[key]) {
        receiptAggregated[key] = { qty: 0, color_name: item.colors?.name };
      }
      receiptAggregated[key].qty += item.qty || 0;
    });

    // Вычитаем реализации
    (realizationItems || []).forEach((item: any) => {
      const key = `${item.size_code}_${item.color_id}`;
      if (receiptAggregated[key] !== undefined) {
        receiptAggregated[key].qty = Math.max(0, receiptAggregated[key].qty - (item.qty || 0));
      }
    });

    // Фильтруем только положительные остатки
    const stockDetails: StockDetailsItem[] = Object.entries(receiptAggregated)
      .filter(([_, data]) => data.qty > 0)
      .map(([key, data]) => {
        const [size_code, color_id] = key.split('_');
        return {
          size_code,
          color_id: parseInt(color_id),
          qty: data.qty,
          color_name: data.color_name
        };
      });

    const totalQuantity = stockDetails.reduce((sum, item) => sum + item.qty, 0);

    return {
      totalQuantity,
      stockDetails
    };
  } catch (error) {
    console.error('Ошибка получения информации о складе:', error);
    return { totalQuantity: 0, stockDetails: [] };
  }
}