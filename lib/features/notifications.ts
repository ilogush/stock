/**
 * Система уведомлений на базе унифицированной архитектуры
 */

import { supabaseAdmin } from '../supabaseAdmin';
import { withApiMiddleware, apiConfigs, handleDatabaseError, sendErrorResponse } from '../unified';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'system' | 'order' | 'stock' | 'task' | 'user';
  is_read: boolean;
  action_url?: string;
  action_text?: string;
  metadata?: Record<string, any>;
  created_at: string;
  expires_at?: string;
}

export interface NotificationTemplate {
  id: string;
  title: string;
  message: string;
  type: Notification['type'];
  category: Notification['category'];
  variables: string[];
}

export interface NotificationPreferences {
  user_id: number;
  email_notifications: boolean;
  push_notifications: boolean;
  categories: {
    system: boolean;
    order: boolean;
    stock: boolean;
    task: boolean;
    user: boolean;
  };
}

class NotificationService {
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Инициализирует шаблоны уведомлений
   */
  private initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'order_created',
        title: 'Новый заказ',
        message: 'Создан новый заказ #{order_id} от {customer_name}',
        type: 'info',
        category: 'order',
        variables: ['order_id', 'customer_name']
      },
      {
        id: 'order_status_changed',
        title: 'Изменен статус заказа',
        message: 'Заказ #{order_id} изменил статус на {status}',
        type: 'info',
        category: 'order',
        variables: ['order_id', 'status']
      },
      {
        id: 'stock_low',
        title: 'Низкий остаток',
        message: 'Товар {product_name} (артикул {article}) заканчивается. Остаток: {quantity}',
        type: 'warning',
        category: 'stock',
        variables: ['product_name', 'article', 'quantity']
      },
      {
        id: 'stock_out',
        title: 'Товар закончился',
        message: 'Товар {product_name} (артикул {article}) закончился на складе',
        type: 'error',
        category: 'stock',
        variables: ['product_name', 'article']
      },
      {
        id: 'task_assigned',
        title: 'Новое задание',
        message: 'Вам назначено задание: {task_description}',
        type: 'info',
        category: 'task',
        variables: ['task_description']
      },
      {
        id: 'task_completed',
        title: 'Задание выполнено',
        message: 'Задание "{task_description}" выполнено пользователем {user_name}',
        type: 'success',
        category: 'task',
        variables: ['task_description', 'user_name']
      },
      {
        id: 'user_registered',
        title: 'Новый пользователь',
        message: 'Зарегистрирован новый пользователь: {user_name} ({user_email})',
        type: 'info',
        category: 'user',
        variables: ['user_name', 'user_email']
      },
      {
        id: 'system_maintenance',
        title: 'Техническое обслуживание',
        message: 'Запланировано техническое обслуживание системы с {start_time} до {end_time}',
        type: 'warning',
        category: 'system',
        variables: ['start_time', 'end_time']
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Создает уведомление
   */
  async createNotification(
    userId: number,
    templateId: string,
    variables: Record<string, any> = {},
    options: {
      actionUrl?: string;
      actionText?: string;
      metadata?: Record<string, any>;
      expiresAt?: Date;
    } = {}
  ): Promise<Notification> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Заменяем переменные в шаблоне
    let title = template.title;
    let message = template.message;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      title = title.replace(new RegExp(placeholder, 'g'), String(value));
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    });

    // Создаем уведомление в базе данных
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type: template.type,
        category: template.category,
        action_url: options.actionUrl,
        action_text: options.actionText,
        metadata: options.metadata,
        expires_at: options.expiresAt?.toISOString(),
        is_read: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    // Очищаем кэш уведомлений пользователя
    this.clearUserNotificationCache(userId);

    return data;
  }

  /**
   * Создает массовое уведомление
   */
  async createBulkNotification(
    userIds: number[],
    templateId: string,
    variables: Record<string, any> = {},
    options: {
      actionUrl?: string;
      actionText?: string;
      metadata?: Record<string, any>;
      expiresAt?: Date;
    } = {}
  ): Promise<Notification[]> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Заменяем переменные в шаблоне
    let title = template.title;
    let message = template.message;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      title = title.replace(new RegExp(placeholder, 'g'), String(value));
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    });

    // Создаем уведомления в базе данных
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type: template.type,
      category: template.category,
      action_url: options.actionUrl,
      action_text: options.actionText,
      metadata: options.metadata,
      expires_at: options.expiresAt?.toISOString(),
      is_read: false
    }));

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      throw new Error(`Failed to create bulk notifications: ${error.message}`);
    }

    // Очищаем кэш уведомлений для всех пользователей

    return data || [];
  }

  /**
   * Получает уведомления пользователя
   */
  async getUserNotifications(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      category?: string;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    // Фильтруем истекшие уведомления
    query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (options.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get notifications: ${error.message}`);
    }

    const result = {
      notifications: data || [],
      total: count || 0
    };

    return result;
  }

  /**
   * Отмечает уведомление как прочитанное
   */
  async markAsRead(notificationId: number, userId: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }

    // Очищаем кэш уведомлений пользователя
    this.clearUserNotificationCache(userId);
  }

  /**
   * Отмечает все уведомления пользователя как прочитанные
   */
  async markAllAsRead(userId: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }

    // Очищаем кэш уведомлений пользователя
    this.clearUserNotificationCache(userId);
  }

  /**
   * Удаляет уведомление
   */
  async deleteNotification(notificationId: number, userId: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }

    // Очищаем кэш уведомлений пользователя
    this.clearUserNotificationCache(userId);
  }

  /**
   * Получает количество непрочитанных уведомлений
   */
  async getUnreadCount(userId: number): Promise<number> {

    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (error) {
      throw new Error(`Failed to get unread count: ${error.message}`);
    }

    const unreadCount = count || 0;


    return unreadCount;
  }

  /**
   * Очищает истекшие уведомления
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('user_id');

    if (error) {
      throw new Error(`Failed to cleanup expired notifications: ${error.message}`);
    }

    // Очищаем кэш для затронутых пользователей
    const userIds = [...new Set((data || []).map(n => n.user_id))];

    return data?.length || 0;
  }


  /**
   * Получает шаблоны уведомлений
   */
  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Добавляет новый шаблон
   */
  addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }
}

// Глобальный экземпляр сервиса уведомлений
export const notificationService = new NotificationService();

// Расширяем cacheKeys для уведомлений
if (typeof cacheKeys !== 'undefined') {
  (cacheKeys as any).userNotifications = (userId: number, limit?: number, offset?: number, unreadOnly?: boolean, category?: string) => 
    `notifications:${userId}:${limit || 'all'}:${offset || 0}:${unreadOnly || false}:${category || 'all'}`;
}
