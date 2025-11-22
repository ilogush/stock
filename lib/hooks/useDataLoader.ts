import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Продвинутый хук для загрузки данных
 * Устраняет дублирование логики useEffect в 40+ файлах
 */

export interface DataLoaderOptions<T> {
  /** Автоматически загружать данные при монтировании */
  autoLoad?: boolean;
  /** Зависимости для перезагрузки данных */
  dependencies?: any[];
  /** Обработчик успешной загрузки */
  onSuccess?: (data: T) => void;
  /** Обработчик ошибки */
  onError?: (error: any) => void;
  /** Функция для трансформации данных */
  transform?: (data: any) => T;
  /** Показывать toast уведомления */
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  /** Сообщение об успехе */
  successMessage?: string;
  /** Сообщение об ошибке */
  errorMessage?: string;
}

export interface DataLoaderState<T> {
  /** Данные */
  data: T | null;
  /** Состояние загрузки */
  loading: boolean;
  /** Ошибка */
  error: any;
  /** Время последней загрузки */
  lastLoaded: Date | null;
  /** Количество попыток загрузки */
  attempts: number;
}

export interface DataLoaderActions {
  /** Перезагрузить данные */
  reload: () => Promise<void>;
  /** Очистить данные */
  clear: () => void;
  /** Обновить данные вручную */
  setData: <T>(data: T) => void;
  /** Установить ошибку */
  setError: (error: any) => void;
}

export function useDataLoader<T = any>(
  loader: () => Promise<T>,
  options: DataLoaderOptions<T> = {}
): [DataLoaderState<T>, DataLoaderActions] {
  const {
    autoLoad = true,
    dependencies = [],
    onSuccess,
    onError,
    transform,
    showToast,
    successMessage,
    errorMessage,
  } = options;

  const [state, setState] = useState<DataLoaderState<T>>({
    data: null,
    loading: false,
    error: null,
    lastLoaded: null,
    attempts: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<T | null>(null);

  /**
   * Функция загрузки данных
   */
  const load = useCallback(async (force = false) => {

    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Создаем новый AbortController
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      attempts: prev.attempts + 1,
    }));

    try {
      const result = await loader();
      
      // Трансформируем данные если нужно
      const transformedData = transform ? transform(result) : result;


      setState(prev => ({
        ...prev,
        data: transformedData,
        loading: false,
        lastLoaded: new Date(),
      }));

      onSuccess?.(transformedData);
      
      if (showToast && successMessage) {
        showToast(successMessage, 'success');
      }

    } catch (error) {
      // Игнорируем ошибки отмены
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error,
      }));

      onError?.(error);
      
      if (showToast) {
        const message = errorMessage || (error instanceof Error ? error.message : 'Ошибка загрузки данных');
        showToast(message, 'error');
      }
    }
  }, [loader, onSuccess, onError, transform, showToast, successMessage, errorMessage]);

  /**
   * Перезагрузить данные
   */
  const reload = useCallback(async () => {
    await load(true);
  }, [load]);

  /**
   * Очистить данные
   */
  const clear = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      lastLoaded: null,
      attempts: 0,
    });
    cacheRef.current = null;
  }, []);

  /**
   * Установить данные вручную
   */
  const setData = useCallback(<T>(data: T) => {
    setState(prev => ({
      ...prev,
      data: data as any,
      error: null,
    }));
  }, []);

  /**
   * Установить ошибку
   */
  const setError = useCallback((error: any) => {
    setState(prev => ({
      ...prev,
      error,
      loading: false,
    }));
  }, []);

  // Автоматическая загрузка при изменении зависимостей
  useEffect(() => {
    if (autoLoad) {
      load();
    }

    // Очистка при размонтировании
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  const actions: DataLoaderActions = {
    reload,
    clear,
    setData,
    setError,
  };

  return [state, actions];
}
