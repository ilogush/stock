// Универсальные утилиты для работы с формами

export interface FormField {
  name: string;
  value: any;
  required?: boolean;
  validator?: (value: any) => string | null;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Валидация формы
export function validateForm(fields: FormField[]): FormValidationResult {
  const errors: Record<string, string> = {};
  let isValid = true;

  fields.forEach(field => {
    // Проверка обязательных полей
    if (field.required && (!field.value || field.value === '')) {
      errors[field.name] = `Поле "${field.name}" обязательно для заполнения`;
      isValid = false;
      return;
    }

    // Проверка строковых полей
    if (field.required && typeof field.value === 'string' && field.value.trim() === '') {
      errors[field.name] = `Поле "${field.name}" не может быть пустым`;
      isValid = false;
      return;
    }

    // Проверка числовых полей
    if (field.required && typeof field.value === 'number' && (field.value <= 0 || isNaN(field.value))) {
      errors[field.name] = `Поле "${field.name}" должно быть положительным числом`;
      isValid = false;
      return;
    }

    // Кастомная валидация
    if (field.validator) {
      const customError = field.validator(field.value);
      if (customError) {
        errors[field.name] = customError;
        isValid = false;
      }
    }
  });

  return { isValid, errors };
}

// Валидаторы для часто используемых полей
export const validators = {
  email: (value: string): string | null => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Некорректный email адрес';
  },

  phone: (value: string): string | null => {
    if (!value) return null;
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(value) ? null : 'Некорректный номер телефона';
  },

  positiveNumber: (value: number): string | null => {
    return value > 0 ? null : 'Значение должно быть больше 0';
  },

  nonNegativeNumber: (value: number): string | null => {
    return value >= 0 ? null : 'Значение не может быть отрицательным';
  },

  maxLength: (max: number) => (value: string): string | null => {
    return value.length <= max ? null : `Максимальная длина ${max} символов`;
  },

  minLength: (min: number) => (value: string): string | null => {
    return value.length >= min ? null : `Минимальная длина ${min} символов`;
  }
};

// Утилиты для работы с формами
export const formUtils = {
  // Создание объекта формы из массива полей
  createFormData: (fields: FormField[]): Record<string, any> => {
    const formData: Record<string, any> = {};
    fields.forEach(field => {
      formData[field.name] = field.value;
    });
    return formData;
  },

  // Очистка формы
  resetForm: (fields: FormField[]): Record<string, any> => {
    const formData: Record<string, any> = {};
    fields.forEach(field => {
      formData[field.name] = '';
    });
    return formData;
  },

  // Проверка изменений в форме
  hasChanges: (original: Record<string, any>, current: Record<string, any>): boolean => {
    return JSON.stringify(original) !== JSON.stringify(current);
  },

  // Фильтрация пустых полей
  filterEmptyFields: (data: Record<string, any>): Record<string, any> => {
    const filtered: Record<string, any> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        filtered[key] = value;
      }
    });
    return filtered;
  }
};

// Утилиты для работы с API
export const apiUtils = {
  // Создание query параметров
  createQueryParams: (params: Record<string, any>): string => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    return queryParams.toString();
  },

  // Обработка ошибок API
  handleApiError: (error: any): string => {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'Произошла неизвестная ошибка';
  },

  // Проверка статуса ответа
  checkResponse: async (response: Response): Promise<any> => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return response.json();
  }
};
