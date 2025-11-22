// lib/validationService.ts
import { NextApiResponse } from 'next';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class ValidationService {
  static isString(value: any): boolean {
    return typeof value === 'string';
  }

  static isNonEmptyString(value: any): boolean {
    return ValidationService.isString(value) && value.trim().length > 0;
  }

  static isNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value);
  }

  static isPositiveNumber(value: any): boolean {
    return ValidationService.isNumber(value) && value > 0;
  }

  static isPositiveInteger(value: any): boolean {
    return Number.isInteger(value) && value > 0;
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidHexCode(hex: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(hex);
  }

  static isValidArticle(article: string): boolean {
    const articleRegex = /^[a-zA-Z0-9\s\-_]+$/;
    return articleRegex.test(article);
  }

  static isValidPassword(password: string): boolean {
    return Boolean(password && password.length >= 4);
  }

  static validateRequired(value: any, fieldName: string): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `${fieldName} обязательно` }]
      };
    }
    return { isValid: true, errors: [] };
  }

  static validateString(value: any, fieldName: string, minLength: number = 1): ValidationResult {
    if (!ValidationService.isString(value)) {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `${fieldName} должно быть строкой` }]
      };
    }
    if (value.trim().length < minLength) {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `${fieldName} должно содержать минимум ${minLength} символов` }]
      };
    }
    return { isValid: true, errors: [] };
  }

  static validateNumber(value: any, fieldName: string, min: number = 0): ValidationResult {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `${fieldName} должно быть числом` }]
      };
    }
    if (num < min) {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `${fieldName} должно быть больше или равно ${min}` }]
      };
    }
    return { isValid: true, errors: [] };
  }

  static validatePositiveInteger(value: any, fieldName: string): ValidationResult {
    const num = parseInt(value);
    if (isNaN(num) || !Number.isInteger(num)) {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `${fieldName} должно быть целым числом` }]
      };
    }
    if (num <= 0) {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `${fieldName} должно быть положительным числом` }]
      };
    }
    return { isValid: true, errors: [] };
  }

  static validateEmail(email: string, fieldName: string = 'email'): ValidationResult {
    if (!ValidationService.isString(email)) {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `${fieldName} должно быть строкой` }]
      };
    }
    if (!ValidationService.isValidEmail(email)) {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `Некорректный формат ${fieldName}` }]
      };
    }
    return { isValid: true, errors: [] };
  }

  static validateArticle(article: string, fieldName: string = 'article'): ValidationResult {
    if (!ValidationService.isString(article)) {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `${fieldName} должно быть строкой` }]
      };
    }
    if (!ValidationService.isValidArticle(article)) {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `${fieldName} может содержать только латинские буквы, цифры, пробелы, дефисы и подчеркивания` }]
      };
    }
    return { isValid: true, errors: [] };
  }

  static validatePassword(password: string, fieldName: string = 'password'): ValidationResult {
    if (!ValidationService.isString(password)) {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `${fieldName} должно быть строкой` }]
      };
    }
    if (!ValidationService.isValidPassword(password)) {
      return {
        isValid: false,
        errors: [{ field: fieldName, message: `${fieldName} должен содержать минимум 4 символа` }]
      };
    }
    return { isValid: true, errors: [] };
  }

  static sendValidationErrors(res: NextApiResponse, errors: ValidationError[], statusCode: number = 400): void {
    const errorMessages = errors.map(error => error.message);
    res.status(statusCode).json({ 
      error: 'Ошибки валидации',
      details: errorMessages,
      fields: errors
    });
  }

  static validateAndSendErrors(res: NextApiResponse, result: ValidationResult): boolean {
    if (!result.isValid) {
      this.sendValidationErrors(res, result.errors);
      return false;
    }
    return true;
  }

  /**
   * Валидация товара
   */
  static validateProduct(productData: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Проверяем обязательные поля
    const nameResult = ValidationService.validateString(productData.name, 'name', 3);
    if (!nameResult.isValid) errors.push(...nameResult.errors);

    const articleResult = ValidationService.validateArticle(productData.article);
    if (!articleResult.isValid) errors.push(...articleResult.errors);

    const brandResult = ValidationService.validatePositiveInteger(productData.brand_id, 'brand_id');
    if (!brandResult.isValid) errors.push(...brandResult.errors);

    const categoryResult = ValidationService.validatePositiveInteger(productData.category_id, 'category_id');
    if (!categoryResult.isValid) errors.push(...categoryResult.errors);

    const priceResult = ValidationService.validateNumber(productData.price, 'price', 0.01);
    if (!priceResult.isValid) errors.push(...priceResult.errors);

    const compositionResult = ValidationService.validateString(productData.composition, 'composition', 5);
    if (!compositionResult.isValid) errors.push(...compositionResult.errors);

    // Проверяем цвет (если передан)
    if (productData.color_id !== null && productData.color_id !== undefined && productData.color_id !== '') {
      const colorResult = ValidationService.validatePositiveInteger(productData.color_id, 'color_id');
      if (!colorResult.isValid) errors.push(...colorResult.errors);
    }

    // Проверяем старую цену (если передан)
    if (productData.old_price !== null && productData.old_price !== undefined && productData.old_price !== '') {
      const oldPriceResult = ValidationService.validateNumber(productData.old_price, 'old_price', 0.01);
      if (!oldPriceResult.isValid) errors.push(...oldPriceResult.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}