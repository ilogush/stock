import { ValidationError } from './errorHandler';

/**
 * Единая система валидации для всего проекта
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationRule {
  field: string;
  value: any;
  rules: ValidationRuleConfig[];
}

export interface ValidationRuleConfig {
  type: 'required' | 'string' | 'number' | 'email' | 'positive' | 'minLength' | 'maxLength' | 'custom';
  message?: string;
  min?: number;
  max?: number;
  customValidator?: (value: any) => string | null;
}

/**
 * Основной класс валидатора
 */
export class UnifiedValidator {
  private errors: ValidationError[] = [];

  /**
   * Валидирует одно поле
   */
  validateField(field: string, value: any, rules: ValidationRuleConfig[]): ValidationResult {
    this.errors = [];

    for (const rule of rules) {
      const error = this.validateRule(field, value, rule);
      if (error) {
        this.errors.push(error);
      }
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors
    };
  }

  /**
   * Валидирует несколько полей
   */
  validateFields(rules: ValidationRule[]): ValidationResult {
    this.errors = [];

    for (const rule of rules) {
      const result = this.validateField(rule.field, rule.value, rule.rules);
      this.errors.push(...result.errors);
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors
    };
  }

  /**
   * Валидирует объект по схеме
   */
  validateObject(data: Record<string, any>, schema: Record<string, ValidationRuleConfig[]>): ValidationResult {
    this.errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const result = this.validateField(field, data[field], rules);
      this.errors.push(...result.errors);
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors
    };
  }

  /**
   * Валидирует одно правило
   */
  private validateRule(field: string, value: any, rule: ValidationRuleConfig): ValidationError | null {
    switch (rule.type) {
      case 'required':
        return this.validateRequired(field, value, rule.message);
      
      case 'string':
        return this.validateString(field, value, rule.message);
      
      case 'number':
        return this.validateNumber(field, value, rule.message);
      
      case 'email':
        return this.validateEmail(field, value, rule.message);
      
      case 'positive':
        return this.validatePositive(field, value, rule.message);
      
      case 'minLength':
        return this.validateMinLength(field, value, rule.min!, rule.message);
      
      case 'maxLength':
        return this.validateMaxLength(field, value, rule.max!, rule.message);
      
      case 'custom':
        return this.validateCustom(field, value, rule.customValidator!, rule.message);
      
      default:
        return null;
    }
  }

  /**
   * Проверка обязательности поля
   */
  private validateRequired(field: string, value: any, message?: string): ValidationError | null {
    if (value === null || value === undefined || value === '') {
      return {
        field,
        message: message || `Поле "${field}" обязательно для заполнения`,
        value
      };
    }
    return null;
  }

  /**
   * Проверка строкового поля
   */
  private validateString(field: string, value: any, message?: string): ValidationError | null {
    if (value !== null && value !== undefined && typeof value !== 'string') {
      return {
        field,
        message: message || `Поле "${field}" должно быть строкой`,
        value
      };
    }
    return null;
  }

  /**
   * Проверка числового поля
   */
  private validateNumber(field: string, value: any, message?: string): ValidationError | null {
    if (value !== null && value !== undefined && (isNaN(Number(value)) || !isFinite(Number(value)))) {
      return {
        field,
        message: message || `Поле "${field}" должно быть числом`,
        value
      };
    }
    return null;
  }

  /**
   * Проверка email
   */
  private validateEmail(field: string, value: any, message?: string): ValidationError | null {
    if (value && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return {
          field,
          message: message || `Поле "${field}" должно содержать корректный email`,
          value
        };
      }
    }
    return null;
  }

  /**
   * Проверка положительного числа
   */
  private validatePositive(field: string, value: any, message?: string): ValidationError | null {
    const num = Number(value);
    if (value !== null && value !== undefined && (isNaN(num) || num <= 0)) {
      return {
        field,
        message: message || `Поле "${field}" должно быть положительным числом`,
        value
      };
    }
    return null;
  }

  /**
   * Проверка минимальной длины
   */
  private validateMinLength(field: string, value: any, min: number, message?: string): ValidationError | null {
    if (value && typeof value === 'string' && value.length < min) {
      return {
        field,
        message: message || `Поле "${field}" должно содержать минимум ${min} символов`,
        value
      };
    }
    return null;
  }

  /**
   * Проверка максимальной длины
   */
  private validateMaxLength(field: string, value: any, max: number, message?: string): ValidationError | null {
    if (value && typeof value === 'string' && value.length > max) {
      return {
        field,
        message: message || `Поле "${field}" должно содержать максимум ${max} символов`,
        value
      };
    }
    return null;
  }

  /**
   * Кастомная валидация
   */
  private validateCustom(field: string, value: any, validator: (value: any) => string | null, message?: string): ValidationError | null {
    const error = validator(value);
    if (error) {
      return {
        field,
        message: message || error,
        value
      };
    }
    return null;
  }
}

/**
 * Глобальный экземпляр валидатора
 */
export const validator = new UnifiedValidator();

/**
 * Предустановленные схемы валидации
 */
export const validationSchemas = {
  // Схема для товара
  product: {
    name: [
      { type: 'required' as const },
      { type: 'string' as const },
      { type: 'minLength' as const, min: 2, message: 'Название товара должно содержать минимум 2 символа' }
    ],
    article: [
      { type: 'required' as const },
      { type: 'string' as const },
      { type: 'minLength' as const, min: 1, message: 'Артикул не может быть пустым' }
    ],
    price: [
      { type: 'required' as const },
      { type: 'number' as const },
      { type: 'positive' as const, message: 'Цена должна быть положительным числом' }
    ],
    brand_id: [
      { type: 'required' as const },
      { type: 'number' as const },
      { type: 'positive' as const, message: 'ID бренда должен быть положительным числом' }
    ],
    category_id: [
      { type: 'required' as const },
      { type: 'number' as const },
      { type: 'positive' as const, message: 'ID категории должен быть положительным числом' }
    ],
    color_id: [
      { type: 'number' as const },
      { type: 'positive' as const, message: 'ID цвета должен быть положительным числом' }
    ],
    old_price: [
      { type: 'number' as const },
      { type: 'positive' as const, message: 'Старая цена должна быть положительным числом' }
    ]
  },

  // Схема для пользователя
  user: {
    email: [
      { type: 'required' as const },
      { type: 'string' as const },
      { type: 'email' as const }
    ],
    first_name: [
      { type: 'required' as const },
      { type: 'string' as const },
      { type: 'minLength' as const, min: 2, message: 'Имя должно содержать минимум 2 символа' }
    ],
    last_name: [
      { type: 'required' as const },
      { type: 'string' as const },
      { type: 'minLength' as const, min: 2, message: 'Фамилия должна содержать минимум 2 символа' }
    ],
    role_id: [
      { type: 'required' as const },
      { type: 'number' as const },
      { type: 'positive' as const, message: 'ID роли должен быть положительным числом' }
    ]
  },

  // Схема для заказа
  order: {
    customer_name: [
      { type: 'required' as const },
      { type: 'string' as const },
      { type: 'minLength' as const, min: 2, message: 'Имя клиента должно содержать минимум 2 символа' }
    ],
    customer_phone: [
      { type: 'required' as const },
      { type: 'string' as const },
      { type: 'minLength' as const, min: 10, message: 'Телефон должен содержать минимум 10 символов' }
    ],
    items: [
      { 
        type: 'required' as const,
        message: 'Список товаров обязателен'
      },
      {
        type: 'custom' as const,
        customValidator: (value: any) => {
          if (!Array.isArray(value) || value.length === 0) {
            return 'Список товаров должен быть непустым массивом';
          }
          return null;
        }
      }
    ]
  },

  // Схема для цвета
  color: {
    name: [
      { type: 'required' as const },
      { type: 'string' as const },
      { type: 'minLength' as const, min: 2, message: 'Название цвета должно содержать минимум 2 символа' }
    ],
    hex_code: [
      { type: 'string' as const },
      {
        type: 'custom' as const,
        customValidator: (value: any) => {
          if (value && typeof value === 'string') {
            const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (!hexRegex.test(value)) {
              return 'HEX-код должен быть в формате #RRGGBB или #RGB';
            }
          }
          return null;
        }
      }
    ]
  }
};

/**
 * Быстрые валидаторы для часто используемых проверок
 */
export const quickValidators = {
  required: (field: string, value: any) => 
    validator.validateField(field, value, [{ type: 'required' }]),
  
  email: (field: string, value: any) => 
    validator.validateField(field, value, [{ type: 'email' }]),
  
  positiveNumber: (field: string, value: any) => 
    validator.validateField(field, value, [{ type: 'positive' }]),
  
  string: (field: string, value: any, minLength?: number) => {
    const rules: ValidationRuleConfig[] = [{ type: 'string' }];
    if (minLength) {
      rules.push({ type: 'minLength', min: minLength });
    }
    return validator.validateField(field, value, rules);
  }
};
