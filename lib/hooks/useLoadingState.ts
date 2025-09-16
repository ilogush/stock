import { useState, useCallback } from 'react';

/**
 * Кастомный хук для управления состоянием загрузки
 * Устраняет дублирование логики loading в 40+ файлах
 */
export const useLoadingState = (initialState = true) => {
  const [loading, setLoading] = useState(initialState);
  
  /**
   * Выполняет функцию с автоматическим управлением состоянием загрузки
   * @param fn - асинхронная функция для выполнения
   * @returns результат выполнения функции
   */
  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      return await fn();
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Устанавливает состояние загрузки вручную
   */
  const setLoadingState = useCallback((state: boolean) => {
    setLoading(state);
  }, []);
  
  return { 
    loading, 
    setLoading: setLoadingState, 
    withLoading 
  };
};
