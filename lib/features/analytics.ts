/**
 * Система аналитики на базе унифицированной архитектуры
 */

import { supabaseAdmin } from '../supabaseAdmin';

export interface AnalyticsEvent {
  id: string;
  user_id?: number;
  event_type: string;
  event_category: 'user' | 'system' | 'business' | 'performance';
  event_data: Record<string, any>;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

export interface AnalyticsMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AnalyticsReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalUsers: number;
    activeUsers: number;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    conversionRate: number;
    topProducts: Array<{ product: string; sales: number; revenue: number }>;
    topCategories: Array<{ category: string; sales: number; revenue: number }>;
    userGrowth: Array<{ date: string; newUsers: number; totalUsers: number }>;
    revenueGrowth: Array<{ date: string; revenue: number; orders: number }>;
  };
}

export interface DashboardStats {
  overview: {
    totalProducts: number;
    totalOrders: number;
    totalUsers: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  trends: {
    ordersGrowth: number;
    revenueGrowth: number;
    usersGrowth: number;
    productsGrowth: number;
  };
  topPerformers: {
    topProducts: Array<{ name: string; sales: number; revenue: number }>;
    topCategories: Array<{ name: string; sales: number; revenue: number }>;
    topUsers: Array<{ name: string; orders: number; revenue: number }>;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    action?: string;
  }>;
}

class AnalyticsService {
  /**
   * Записывает событие аналитики
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    // Сохраняем в базу данных
    const { error } = await supabaseAdmin
      .from('analytics_events')
      .insert({
        id: analyticsEvent.id,
        user_id: analyticsEvent.user_id,
        event_type: analyticsEvent.event_type,
        event_category: analyticsEvent.event_category,
        event_data: analyticsEvent.event_data,
        session_id: analyticsEvent.session_id,
        ip_address: analyticsEvent.ip_address,
        user_agent: analyticsEvent.user_agent,
        timestamp: analyticsEvent.timestamp.toISOString()
      });

    if (error) {
      console.error('Failed to track analytics event:', error);
    }

    // Очищаем кэш аналитики
    this.clearAnalyticsCache();
  }

  /**
   * Записывает метрику
   */
  async recordMetric(metric: Omit<AnalyticsMetric, 'timestamp'>): Promise<void> {
    const analyticsMetric: AnalyticsMetric = {
      ...metric,
      timestamp: new Date()
    };

    // Сохраняем в базу данных
    const { error } = await supabaseAdmin
      .from('analytics_metrics')
      .insert({
        name: analyticsMetric.name,
        value: analyticsMetric.value,
        unit: analyticsMetric.unit,
        metadata: analyticsMetric.metadata,
        timestamp: analyticsMetric.timestamp.toISOString()
      });

    if (error) {
      console.error('Failed to record analytics metric:', error);
    }

    // Очищаем кэш аналитики
    this.clearAnalyticsCache();
  }

  /**
   * Получает статистику дашборда
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = 'analytics:dashboard:stats';
    
    // Проверяем кэш

    const [
      overview,
      trends,
      topPerformers,
      alerts
    ] = await Promise.all([
      this.getOverviewStats(),
      this.getTrendsStats(),
      this.getTopPerformersStats(),
      this.getAlerts()
    ]);

    const stats: DashboardStats = {
      overview,
      trends,
      topPerformers,
      alerts
    };


    return stats;
  }

  /**
   * Получает общую статистику
   */
  private async getOverviewStats(): Promise<DashboardStats['overview']> {
    const [
      productsResult,
      ordersResult,
      usersResult,
      revenueResult
    ] = await Promise.all([
      supabaseAdmin.from('products').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
      supabaseAdmin.from('orders').select('total_amount').eq('status', 'completed')
    ]);

    const totalProducts = productsResult.count || 0;
    const totalOrders = ordersResult.count || 0;
    const totalUsers = usersResult.count || 0;
    const totalRevenue = (revenueResult.data || []).reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      averageOrderValue
    };
  }

  /**
   * Получает статистику трендов
   */
  private async getTrendsStats(): Promise<DashboardStats['trends']> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

    const [
      currentOrders,
      lastMonthOrders,
      currentRevenue,
      lastMonthRevenue,
      currentUsers,
      lastMonthUsers,
      currentProducts,
      lastMonthProducts
    ] = await Promise.all([
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', lastMonth.toISOString()),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', twoMonthsAgo.toISOString()).lt('created_at', lastMonth.toISOString()),
      supabaseAdmin.from('orders').select('total_amount').eq('status', 'completed').gte('created_at', lastMonth.toISOString()),
      supabaseAdmin.from('orders').select('total_amount').eq('status', 'completed').gte('created_at', twoMonthsAgo.toISOString()).lt('created_at', lastMonth.toISOString()),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('is_deleted', false).gte('created_at', lastMonth.toISOString()),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('is_deleted', false).gte('created_at', twoMonthsAgo.toISOString()).lt('created_at', lastMonth.toISOString()),
      supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).gte('created_at', lastMonth.toISOString()),
      supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).gte('created_at', twoMonthsAgo.toISOString()).lt('created_at', lastMonth.toISOString())
    ]);

    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const currentRevenueSum = (currentRevenue.data || []).reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);
    const lastMonthRevenueSum = (lastMonthRevenue.data || []).reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);

    return {
      ordersGrowth: calculateGrowth(currentOrders.count || 0, lastMonthOrders.count || 0),
      revenueGrowth: calculateGrowth(currentRevenueSum, lastMonthRevenueSum),
      usersGrowth: calculateGrowth(currentUsers.count || 0, lastMonthUsers.count || 0),
      productsGrowth: calculateGrowth(currentProducts.count || 0, lastMonthProducts.count || 0)
    };
  }

  /**
   * Получает статистику топ-исполнителей
   */
  private async getTopPerformersStats(): Promise<DashboardStats['topPerformers']> {
    const [
      topProductsResult,
      topCategoriesResult,
      topUsersResult
    ] = await Promise.all([
      // Топ товары по продажам
      supabaseAdmin
        .from('order_items')
        .select(`
          product_id,
          quantity,
          price,
          product:products(name, article)
        `)
        .limit(10),
      
      // Топ категории по продажам
      supabaseAdmin
        .from('order_items')
        .select(`
          product_id,
          quantity,
          price,
          product:products(category:categories(name))
        `)
        .limit(10),
      
      // Топ пользователи по заказам
      supabaseAdmin
        .from('orders')
        .select(`
          user_id,
          total_amount,
          user:users(first_name, last_name)
        `)
        .eq('status', 'completed')
        .limit(10)
    ]);

    // Обрабатываем топ товары
    const productSales = new Map<string, { sales: number; revenue: number }>();
    (topProductsResult.data || []).forEach((item: any) => {
      const productName = item.product?.name || 'Неизвестный товар';
      const existing = productSales.get(productName) || { sales: 0, revenue: 0 };
      productSales.set(productName, {
        sales: existing.sales + (item.quantity || 0),
        revenue: existing.revenue + ((item.quantity || 0) * (item.price || 0))
      });
    });

    // Обрабатываем топ категории
    const categorySales = new Map<string, { sales: number; revenue: number }>();
    (topCategoriesResult.data || []).forEach((item: any) => {
      const categoryName = item.product?.category?.name || 'Без категории';
      const existing = categorySales.get(categoryName) || { sales: 0, revenue: 0 };
      categorySales.set(categoryName, {
        sales: existing.sales + (item.quantity || 0),
        revenue: existing.revenue + ((item.quantity || 0) * (item.price || 0))
      });
    });

    // Обрабатываем топ пользователей
    const userSales = new Map<string, { orders: number; revenue: number }>();
    (topUsersResult.data || []).forEach((order: any) => {
      const userName = order.user ? `${order.user.first_name} ${order.user.last_name}` : 'Неизвестный пользователь';
      const existing = userSales.get(userName) || { orders: 0, revenue: 0 };
      userSales.set(userName, {
        orders: existing.orders + 1,
        revenue: existing.revenue + (order.total_amount || 0)
      });
    });

    return {
      topProducts: Array.from(productSales.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      topCategories: Array.from(categorySales.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      topUsers: Array.from(userSales.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
    };
  }

  /**
   * Получает алерты
   */
  private async getAlerts(): Promise<DashboardStats['alerts']> {
    const alerts: DashboardStats['alerts'] = [];

    // Проверяем низкие остатки
    const lowStockResult = await supabaseAdmin
      .from('stock')
      .select('quantity, product:products(name)')
      .lt('quantity', 10);

    if (lowStockResult.data && lowStockResult.data.length > 0) {
      alerts.push({
        type: 'warning',
        message: `${lowStockResult.data.length} товаров с низким остатком`,
        action: 'Проверить склад'
      });
    }

    // Проверяем невыполненные заказы
    const pendingOrdersResult = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (pendingOrdersResult.count && pendingOrdersResult.count > 0) {
      alerts.push({
        type: 'warning',
        message: `${pendingOrdersResult.count} заказов ожидают обработки более 24 часов`,
        action: 'Обработать заказы'
      });
    }

    // Проверяем активность пользователей
    const inactiveUsersResult = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .lt('last_login', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (inactiveUsersResult.count && inactiveUsersResult.count > 0) {
      alerts.push({
        type: 'info',
        message: `${inactiveUsersResult.count} пользователей неактивны более 30 дней`
      });
    }

    return alerts;
  }

  /**
   * Генерирует ID события
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Очищает кэш аналитики
   */
  private clearAnalyticsCache(): void {
  }

  /**
   * Получает отчет за период
   */
  async getReport(startDate: Date, endDate: Date): Promise<AnalyticsReport> {
    const cacheKey = `analytics:report:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    // Проверяем кэш

    // Здесь можно добавить более детальную логику генерации отчетов
    const report: AnalyticsReport = {
      period: { start: startDate, end: endDate },
      metrics: {
        totalUsers: 0,
        activeUsers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        topProducts: [],
        topCategories: [],
        userGrowth: [],
        revenueGrowth: []
      }
    };


    return report;
  }
}

// Глобальный экземпляр сервиса аналитики
export const analyticsService = new AnalyticsService();

// Хелперы для быстрого трекинга событий
export const trackEvent = (eventType: string, eventData: Record<string, any>, userId?: number) => {
  analyticsService.trackEvent({
    event_type: eventType,
    event_category: 'user',
    event_data: eventData,
    user_id: userId
  });
};

export const trackBusinessEvent = (eventType: string, eventData: Record<string, any>, userId?: number) => {
  analyticsService.trackEvent({
    event_type: eventType,
    event_category: 'business',
    event_data: eventData,
    user_id: userId
  });
};

export const trackSystemEvent = (eventType: string, eventData: Record<string, any>) => {
  analyticsService.trackEvent({
    event_type: eventType,
    event_category: 'system',
    event_data: eventData
  });
};
