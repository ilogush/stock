/**
 * Функции для проверки достаточности товара в stock
 * Проверяет остатки перед созданием заказов и реализаций
 * 
 * @deprecated Используйте stockService.ts для новой логики
 */

import { supabaseAdmin } from './supabaseAdmin';
import { checkStockAvailability as newCheckStockAvailability } from './stockService';

/**
 * Проверяет достаточность товара в stock
 */
export async function checkStockAvailability(
  productId: number,
  sizeCode: string,
  colorId: number,
  requestedQty: number
): Promise<{
  available: boolean;
  availableQty: number;
  requestedQty: number;
  productName?: string;
  message?: string;
}> {
  // Используем новый сервис с передачей color_id
  return await newCheckStockAvailability(productId, sizeCode, requestedQty, colorId);
}

/**
 * Проверяет массив товаров на достаточность остатков
 */
export async function validateStockForItems(items: Array<{
  product_id: number;
  size_code: string;
  color_id: number;
  qty: number;
}>): Promise<{
  valid: boolean;
  errors: Array<{
    product_id: number;
    size_code: string;
    color_id: number;
    requestedQty: number;
    availableQty: number;
    productName?: string;
    message: string;
  }>;
}> {
  const errors: Array<{
    product_id: number;
    size_code: string;
    color_id: number;
    requestedQty: number;
    availableQty: number;
    productName?: string;
    message: string;
  }> = [];

  for (const item of items) {
    const stockCheck = await checkStockAvailability(
      item.product_id,
      item.size_code,
      item.color_id,
      item.qty
    );

    if (!stockCheck.available) {
      errors.push({
        product_id: item.product_id,
        size_code: item.size_code,
        color_id: item.color_id,
        requestedQty: item.qty,
        availableQty: stockCheck.availableQty,
        productName: stockCheck.productName,
        message: stockCheck.message || 'Недостаточно товара на складе'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
