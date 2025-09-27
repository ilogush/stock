/**
 * Утилита для форматирования дат
 * Упрощает работу с датами во всем проекте
 */

export interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
}

export const dateUtils = {
  /**
   * Форматирует дату в короткий формат (DD.MM.YYYY)
   */
  formatDate: (date: string | Date, options?: DateFormatOptions): string => {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Неверная дата';
    
    return dateObj.toLocaleDateString(options?.locale || 'ru-RU', {
      year: options?.year || 'numeric',
      month: options?.month || '2-digit',
      day: options?.day || '2-digit',
      timeZone: options?.timeZone
    });
  },

  /**
   * Форматирует дату и время (DD.MM.YYYY HH:MM)
   */
  formatDateTime: (date: string | Date, options?: DateFormatOptions): string => {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Неверная дата';
    
    return dateObj.toLocaleString(options?.locale || 'ru-RU', {
      year: options?.year || 'numeric',
      month: options?.month || '2-digit',
      day: options?.day || '2-digit',
      hour: options?.hour || '2-digit',
      minute: options?.minute || '2-digit',
      timeZone: options?.timeZone
    });
  },

  /**
   * Форматирует только время (HH:MM)
   */
  formatTime: (date: string | Date, options?: DateFormatOptions): string => {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Неверная дата';
    
    return dateObj.toLocaleTimeString(options?.locale || 'ru-RU', {
      hour: options?.hour || '2-digit',
      minute: options?.minute || '2-digit',
      timeZone: options?.timeZone
    });
  },

  /**
   * Форматирует дату в относительном формате (сегодня, вчера, 2 дня назад)
   */
  formatRelative: (date: string | Date): string => {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Неверная дата';
    
    const now = new Date();
    const diffTime = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Сегодня';
    } else if (diffDays === 1) {
      return 'Вчера';
    } else if (diffDays === -1) {
      return 'Завтра';
    } else if (diffDays > 1 && diffDays < 7) {
      return `${diffDays} дня назад`;
    } else if (diffDays > 7) {
      return dateUtils.formatDate(dateObj);
    } else {
      return dateUtils.formatDate(dateObj);
    }
  },

  /**
   * Форматирует дату для API (YYYY-MM-DD)
   */
  formatForAPI: (date: string | Date): string => {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toISOString().split('T')[0];
  },

  /**
   * Форматирует дату для отображения в таблицах
   */
  formatForTable: (date: string | Date): string => {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '—';
    
    const now = new Date();
    const diffTime = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return dateUtils.formatTime(dateObj);
    } else if (diffDays < 7) {
      return dateUtils.formatRelative(dateObj);
    } else {
      return dateUtils.formatDate(dateObj);
    }
  },

  /**
   * Проверяет, является ли дата сегодняшней
   */
  isToday: (date: string | Date): boolean => {
    const dateObj = new Date(date);
    const today = new Date();
    
    return dateObj.toDateString() === today.toDateString();
  },

  /**
   * Проверяет, является ли дата вчерашней
   */
  isYesterday: (date: string | Date): boolean => {
    const dateObj = new Date(date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return dateObj.toDateString() === yesterday.toDateString();
  },

  /**
   * Получает начало дня
   */
  startOfDay: (date: string | Date): Date => {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    return dateObj;
  },

  /**
   * Получает конец дня
   */
  endOfDay: (date: string | Date): Date => {
    const dateObj = new Date(date);
    dateObj.setHours(23, 59, 59, 999);
    return dateObj;
  },

  /**
   * Добавляет дни к дате
   */
  addDays: (date: string | Date, days: number): Date => {
    const dateObj = new Date(date);
    dateObj.setDate(dateObj.getDate() + days);
    return dateObj;
  },

  /**
   * Вычисляет разность в днях между двумя датами
   */
  diffInDays: (date1: string | Date, date2: string | Date): number => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
};
