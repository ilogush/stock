import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from './supabaseAdmin';

export interface ActionLogData {
  user_id: number;
  action_name: string;
  status: 'success' | 'error' | 'warning' | 'info';
  details?: string;
}

/**
 * Логирует действие пользователя
 */
export const logAction = async (actionData: ActionLogData): Promise<void> => {
  try {
    // Не логируем действия без пользователя или с некорректным user_id
    if (!actionData.user_id || actionData.user_id <= 0) {
      console.warn('Пропуск логирования действия: некорректный user_id', actionData);
      return;
    }

    const { error } = await supabaseAdmin
      .from('user_actions')
      .insert({
        user_id: actionData.user_id,
        action_name: actionData.action_name,
        status: actionData.status,
        details: actionData.details,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Ошибка логирования действия:', error);
    }
  } catch (error) {
    console.error('Ошибка логирования действия:', error);
  }
};

/**
 * Предустановленные действия для быстрого логирования
 */
export const ActionTypes = {
  // Авторизация
  LOGIN: 'Вход в систему',
  LOGOUT: 'Выход из системы',
  
  // Пользователи
  USER_CREATE: 'Создание пользователя',
  USER_UPDATE: 'Редактирование пользователя',
  USER_DELETE: 'Удаление пользователя',
  
  // Товары
  PRODUCT_CREATE: 'Создание товара',
  PRODUCT_UPDATE: 'Редактирование товара',
  PRODUCT_DELETE: 'Удаление товара',
  
  // Склад
  WAREHOUSE_RECEIVE: 'Прием товара на склад',
  WAREHOUSE_SHIP: 'Отгрузка товара со склада',
  
  // Поступления
  RECEIPT_CREATE: 'Создание поступления',
  RECEIPT_UPDATE: 'Редактирование поступления',
  RECEIPT_DELETE: 'Удаление поступления',
  
  // Заказы
  ORDER_CREATE: 'Создание заказа',
  ORDER_UPDATE: 'Редактирование заказа',
  ORDER_DELETE: 'Удаление заказа',
  
  // Доставка
  SHIPPING_CREATE: 'Создание доставки',
  SHIPPING_UPDATE: 'Редактирование доставки',
  
  // Компании и бренды
  COMPANY_CREATE: 'Создание компании',
  COMPANY_UPDATE: 'Редактирование компании',
  COMPANY_DELETE: 'Удаление компании',
  BRAND_CREATE: 'Создание бренда',
  BRAND_UPDATE: 'Редактирование бренда',
  
  // Системные
  ACCESS_DENIED: 'Отказ в доступе',
  SYSTEM_ERROR: 'Системная ошибка',
  DATA_EXPORT: 'Экспорт данных',
  DATA_IMPORT: 'Импорт данных',
} as const;

/**
 * Быстрые функции для логирования
 */
export const logUserAction = {
  login: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.LOGIN, status: 'success', details }),
  
  logout: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.LOGOUT, status: 'success', details }),
  
  accessDenied: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.ACCESS_DENIED, status: 'error', details }),
  
  systemError: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.SYSTEM_ERROR, status: 'error', details }),
  
  productCreate: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.PRODUCT_CREATE, status: 'success', details }),
  
  productUpdate: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.PRODUCT_UPDATE, status: 'success', details }),
  
  productDelete: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.PRODUCT_DELETE, status: 'warning', details }),
  
  userCreate: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.USER_CREATE, status: 'success', details }),
  
  userUpdate: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.USER_UPDATE, status: 'success', details }),
  
  userDelete: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.USER_DELETE, status: 'warning', details }),
  
  receiptCreate: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.RECEIPT_CREATE, status: 'success', details }),
  
  orderCreate: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.ORDER_CREATE, status: 'success', details }),
  
  orderUpdate: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.ORDER_UPDATE, status: 'success', details }),
  
  shippingCreate: (userId: number, details?: string) => 
    logAction({ user_id: userId, action_name: ActionTypes.SHIPPING_CREATE, status: 'success', details }),
};

/**
 * Middleware для логирования действий пользователей
 */
export const withActionLogging = (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  actionName: string
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const originalSend = res.send;
    let responseBody: any;
    let statusCode: number = 200;

    // Перехватываем ответ
    res.send = function(body: any) {
      responseBody = body;
      statusCode = res.statusCode;
      return originalSend.call(this, body);
    };

    try {
      // Получаем user_id из куки
      const userId = getUserIdFromCookie(req);

      // Выполняем основной обработчик
      await handler(req, res);

      // Логируем действие только если есть пользователь
      if (userId) {
        try {
          const status = statusCode >= 400 ? 'error' : 'success';
          const details = statusCode >= 400 ? 
            `HTTP ${statusCode}: ${typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)}` : 
            undefined;

          await logAction({
            user_id: userId,
            action_name: actionName,
            status,
            details
          });
        } catch (logError) {
          console.error('Ошибка логирования действия:', logError);
        }
      }

    } catch (error) {
      // Логируем ошибку только если есть пользователь
      const userId = getUserIdFromCookie(req);
      if (userId) {
        try {
          await logAction({
            user_id: userId,
            action_name: actionName,
            status: 'error',
            details: `Ошибка: ${error instanceof Error ? error.message : String(error)}`
          });
        } catch (logError) {
          console.error('Ошибка логирования ошибки:', logError);
        }
      }

      throw error;
    }
  };
};

/**
 * Утилита для логирования действий в существующих API
 */
export const logUserActionDirect = async (
  userId: number, 
  actionName: string, 
  status: 'success' | 'error' | 'warning' | 'info' = 'success',
  details?: string
) => {
  try {
    await supabaseAdmin
      .from('user_actions')
      .insert({
        user_id: userId,
        action_name: actionName,
        status,
        details,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Ошибка логирования действия:', error);
  }
};

/**
 * Получение user_id из куки
 */
export const getUserIdFromCookie = (req: NextApiRequest): number | null => {
  try {
    const cookies = req.headers.cookie;
    if (!cookies) {
      return null;
    }
    
    const userCookie = cookies.split(';').find(c => c.trim().startsWith('user_id='));
    if (!userCookie) {
      return null;
    }
    
    const userId = parseInt(userCookie.split('=')[1]);
    return isNaN(userId) ? null : userId;
  } catch (error) {
    console.error('Ошибка парсинга куки user_id:', error);
    return null;
  }
}; 