/**
 * Функции для проверки достаточности товара на складе
 * Проверяет остатки перед созданием заказов и реализаций
 */

import { supabaseAdmin } from './supabaseAdmin';

/**
 * Проверяет достаточность товара на складе
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
  try {
    // Получаем информацию о товаре
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('name')
      .eq('id', productId)
      .single();

    // Получаем остатки на складе из поступлений (receipt_items)
    const { data: receiptItems } = await supabaseAdmin
      .from('receipt_items')
      .select('qty')
      .eq('product_id', productId)
      .eq('size_code', sizeCode)
      .eq('color_id', colorId);

    // Суммируем количество из поступлений
    const availableQty = (receiptItems || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0);

    // Вычитаем количество из реализаций
    const { data: realizationItems } = await supabaseAdmin
      .from('realization_items')
      .select('qty')
      .eq('product_id', productId)
      .eq('size_code', sizeCode)
      .eq('color_id', colorId);

    const realizedQty = (realizationItems || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
    const finalAvailableQty = availableQty - realizedQty;
    const available = finalAvailableQty >= requestedQty;

    let message = '';
    if (!available) {
      message = `Недостаточно товара "${product?.name || 'Неизвестный товар'}" на складе. Запрошено: ${requestedQty}, доступно: ${availableQty}`;
    }

    return {
      available,
      availableQty: finalAvailableQty,
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
      message: 'Ошибка проверки остатков на складе'
    };
  }
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
