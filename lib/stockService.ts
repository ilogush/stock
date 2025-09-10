/**
 * Единый сервис для работы со складскими остатками
 * Централизует всю логику расчета остатков
 */

import { supabaseAdmin } from './supabaseAdmin';

export interface StockItem {
  size_code: string;
  color_id: number;
  qty: number;
}

export interface StockDetailsItem {
  size_code: string;
  qty: number;
  color_name?: string;
}

export interface StockCalculationResult {
  totalQuantity: number;
  stockItems: StockItem[];
  stockDetails: StockDetailsItem[];
}

/**
 * Единая функция для расчета складских остатков
 * Заменяет дублированную логику во всех API endpoints
 */
export async function calculateStock(
  productId: number,
  sizeCode?: string,
  includeColorNames: boolean = false
): Promise<StockCalculationResult> {
  try {
    // Получаем данные из поступлений
    let receiptQuery = supabaseAdmin
      .from('receipt_items')
      .select(`
        size_code, 
        color_id, 
        qty
        ${includeColorNames ? ', colors!inner(name)' : ''}
      `)
      .eq('product_id', productId);

    if (sizeCode) {
      receiptQuery = receiptQuery.eq('size_code', sizeCode);
    }

    const { data: receiptItems, error: receiptError } = await receiptQuery;

    if (receiptError) {
      console.error('Ошибка получения поступлений:', receiptError);
      return { totalQuantity: 0, stockItems: [], stockDetails: [] };
    }

    // Получаем данные из реализаций
    let realizationQuery = supabaseAdmin
      .from('realization_items')
      .select('size_code, color_id, qty')
      .eq('product_id', productId);

    if (sizeCode) {
      realizationQuery = realizationQuery.eq('size_code', sizeCode);
    }

    const { data: realizationItems, error: realizationError } = await realizationQuery;

    if (realizationError) {
      console.error('Ошибка получения реализаций:', realizationError);
      return { totalQuantity: 0, stockItems: [], stockDetails: [] };
    }

    // Агрегируем поступления
    const receiptAggregated: Record<string, { qty: number; color_name?: string }> = {};
    (receiptItems || []).forEach((item: any) => {
      const key = `${item.size_code}_${item.color_id}`;
      if (!receiptAggregated[key]) {
        receiptAggregated[key] = { 
          qty: 0, 
          color_name: includeColorNames ? item.colors?.name : undefined 
        };
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
    const stockItems: StockItem[] = [];
    const stockDetails: StockDetailsItem[] = [];
    let totalQuantity = 0;

    Object.entries(receiptAggregated).forEach(([key, data]) => {
      if (data.qty > 0) {
        const [size_code, color_id] = key.split('_');
        stockItems.push({
          size_code,
          color_id: parseInt(color_id),
          qty: data.qty
        });
        
        stockDetails.push({
          size_code,
          qty: data.qty,
          color_name: data.color_name
        });
        
        totalQuantity += data.qty;
      }
    });

    return {
      totalQuantity,
      stockItems,
      stockDetails
    };
  } catch (error) {
    console.error('Ошибка расчета складских остатков:', error);
    return { totalQuantity: 0, stockItems: [], stockDetails: [] };
  }
}

/**
 * Проверяет достаточность товара на складе
 * Заменяет логику из stockValidator.ts
 */
export async function checkStockAvailability(
  productId: number,
  sizeCode: string,
  requestedQty: number,
  colorId?: number
): Promise<{
  available: boolean;
  availableQty: number;
  requestedQty: number;
  productName?: string;
  message?: string;
}> {
  try {
    // Получаем информацию о товаре
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('name')
      .eq('id', productId)
      .single();

    // Рассчитываем остатки
    const stockResult = await calculateStock(productId, sizeCode);
    
    // Находим остаток для конкретного размера и цвета
    let sizeStock;
    if (colorId) {
      sizeStock = stockResult.stockItems.find(item => 
        item.size_code === sizeCode && item.color_id === colorId
      );
    } else {
      sizeStock = stockResult.stockItems.find(item => item.size_code === sizeCode);
    }
    
    const availableQty = sizeStock ? sizeStock.qty : 0;
    const available = availableQty >= requestedQty;

    let message = '';
    if (!available) {
      message = `Недостаточно товара "${product?.name || 'Неизвестный товар'}" на складе. Запрошено: ${requestedQty}, доступно: ${availableQty}`;
    }

    return {
      available,
      availableQty,
      requestedQty,
      productName: product?.name,
      message
    };
  } catch (error) {
    console.error('Ошибка проверки остатков:', error);
    return {
      available: false,
      availableQty: 0,
      requestedQty,
      message: 'Ошибка проверки остатков'
    };
  }
}

/**
 * Получает информацию о складских остатках для отображения
 * Заменяет логику из warehouseChecker.ts
 */
export async function getWarehouseStockInfo(productId: number): Promise<{
  totalQuantity: number;
  stockDetails: StockDetailsItem[];
}> {
  const result = await calculateStock(productId, undefined, true);
  return {
    totalQuantity: result.totalQuantity,
    stockDetails: result.stockDetails
  };
}

/**
 * Проверяет, есть ли товар в складских остатках
 * Заменяет логику из warehouseChecker.ts
 */
export async function checkProductInStock(productId: number): Promise<{
  hasStock: boolean;
  totalQuantity: number;
  stockItems: StockItem[];
}> {
  const result = await calculateStock(productId);
  return {
    hasStock: result.totalQuantity > 0,
    totalQuantity: result.totalQuantity,
    stockItems: result.stockItems
  };
}
