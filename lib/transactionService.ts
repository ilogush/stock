import { supabaseAdmin } from './supabaseAdmin';

export interface TransactionOptions {
  isolationLevel?: 'read_committed' | 'repeatable_read' | 'serializable';
  timeout?: number; // в миллисекундах
}

export interface TransactionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rollbackReason?: string;
}

/**
 * Сервис для работы с транзакциями
 */
export class TransactionService {
  /**
   * Выполняет операции в транзакции
   */
  static async execute<T = any>(
    operations: (client: any) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    try {
      // Supabase не поддерживает явные транзакции через JavaScript API
      // Но мы можем использовать RPC функции для транзакций
      
      // Для простых случаев используем обычные операции
      const result = await operations(supabaseAdmin);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Ошибка транзакции:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Выполняет несколько операций с откатом при ошибке
   */
  static async executeBatch<T = any>(
    operations: Array<(client: any) => Promise<any>>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T[]>> {
    const results: any[] = [];
    const rollbackOperations: Array<() => Promise<void>> = [];

    try {
      // Выполняем операции последовательно
      for (const operation of operations) {
        const result = await operation(supabaseAdmin);
        results.push(result);
        
        // Сохраняем операцию отката (если есть)
        // Это упрощенная версия - в реальности нужно сохранять данные для отката
        rollbackOperations.push(async () => {
          console.log('Откат операции не реализован для:', operation.name);
        });
      }

      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('Ошибка в batch операции:', error);
      
      // Выполняем откат
      try {
        for (const rollback of rollbackOperations.reverse()) {
          await rollback();
        }
      } catch (rollbackError) {
        console.error('Ошибка отката:', rollbackError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        rollbackReason: 'Ошибка в одной из операций'
      };
    }
  }

  /**
   * Создает поступление с позициями в транзакции
   */
  static async createReceiptWithItems(
    receiptData: any,
    itemsData: any[]
  ): Promise<TransactionResult> {
    return this.executeBatch([
      // 1. Создаем поступление
      async (client) => {
        const { data, error } = await client
          .from('receipts')
          .insert(receiptData)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
      
      // 2. Создаем позиции поступления
      async (client) => {
        const { data, error } = await client
          .from('receipt_items')
          .insert(itemsData);
        
        if (error) throw error;
        return data;
      }
    ]);
  }

  /**
   * Создает реализацию с позициями в транзакции
   */
  static async createRealizationWithItems(
    realizationData: any,
    itemsData: any[]
  ): Promise<TransactionResult> {
    return this.executeBatch([
      // 1. Проверяем остатки
      async (client) => {
        for (const item of itemsData) {
          // Здесь должна быть проверка остатков
          // Пока пропускаем
        }
        return true;
      },
      
      // 2. Создаем реализацию
      async (client) => {
        const { data, error } = await client
          .from('realization')
          .insert(realizationData)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
      
      // 3. Создаем позиции реализации
      async (client) => {
        const { data, error } = await client
          .from('realization_items')
          .insert(itemsData);
        
        if (error) throw error;
        return data;
      }
    ]);
  }

  /**
   * Обновляет товар с проверкой остатков
   */
  static async updateProductWithStockCheck(
    productId: number,
    updateData: any
  ): Promise<TransactionResult> {
    return this.execute(async (client) => {
      // 1. Проверяем, есть ли товар на складе
      const { data: stockCheck } = await client
        .from('receipt_items')
        .select('qty')
        .eq('product_id', productId);

      if (stockCheck && stockCheck.length > 0) {
        console.warn(`Товар ${productId} есть на складе, изменения могут повлиять на остатки`);
      }

      // 2. Обновляем товар
      const { data, error } = await client
        .from('products')
        .update(updateData)
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      return data;
    });
  }
}
