// Константы для сообщений тостов
export const TOAST_MESSAGES = {
  // Успешные действия
  SUCCESS: {
    SAVE: 'Данные успешно сохранены',
    CREATE: 'Запись успешно создана',
    UPDATE: 'Данные успешно обновлены',
    DELETE: 'Запись успешно удалена',
    LOGIN: 'Вход выполнен успешно',
    LOGOUT: 'Выход выполнен успешно',
    UPLOAD: 'Файл успешно загружен',
    
    // Специфичные для разделов
    USER_CREATED: 'Пользователь успешно создан',
    USER_UPDATED: 'Данные пользователя обновлены',
    USER_DELETED: 'Пользователь успешно удален',
    
    PRODUCT_CREATED: 'Товар успешно создан',
    PRODUCT_UPDATED: 'Товар успешно обновлен',
    PRODUCT_DELETED: 'Товар успешно удален',
    
    CATEGORY_CREATED: 'Категория создана',
    CATEGORY_UPDATED: 'Категория обновлена',
    CATEGORY_DELETED: 'Категория удалена',
    
    BRAND_CREATED: 'Бренд создан',
    BRAND_UPDATED: 'Бренд обновлен',
    BRAND_DELETED: 'Бренд удален',
    
    COMPANY_CREATED: 'Компания создана',
    COMPANY_UPDATED: 'Компания обновлена',
    COMPANY_DELETED: 'Компания удалена',
    
    ORDER_CREATED: 'Заказ успешно создан',
    ORDER_UPDATED: 'Заказ обновлен',
    ORDER_DELETED: 'Заказ удален',
    
    RECEIPT_CREATED: 'Поступление создано',
    RECEIPT_UPDATED: 'Поступление обновлено',
    RECEIPT_DELETED: 'Поступление удалено',
  },
  
  // Ошибки
  ERROR: {
    GENERIC: 'Произошла ошибка',
    NETWORK: 'Ошибка сети',
    SAVE: 'Ошибка сохранения данных',
    LOAD: 'Ошибка загрузки данных',
    DELETE: 'Ошибка удаления',
    UPLOAD: 'Ошибка загрузки файла',
    VALIDATION: 'Проверьте правильность заполнения полей',
    UNAUTHORIZED: 'Нет доступа к данному разделу',
    NOT_FOUND: 'Запрашиваемые данные не найдены',
    
    // Валидация полей
    REQUIRED_FIELDS: 'Заполните все обязательные поля',
    INVALID_EMAIL: 'Неверный формат email',
    INVALID_PHONE: 'Телефон должен начинаться с +7 и содержать 10 цифр',
    PASSWORD_TOO_SHORT: 'Пароль должен содержать минимум 4 символа',
    
    // Специфичные ошибки
    CANNOT_DELETE_WITH_STOCK: 'Нельзя удалить товар, пока есть остатки на складе',
    CANNOT_DELETE_WITH_OPERATIONS: 'Нельзя удалить товар, который участвовал в операциях склада',
    PRICE_REQUIRED_FOR_DISPLAY: 'Для отображения на сайте необходимо указать цену товара',
  },
  
  // Информационные сообщения
  INFO: {
    LOADING: 'Загрузка данных...',
    SAVING: 'Сохранение...',
    DELETING: 'Удаление...',
    UPLOADING: 'Загрузка файла...',
    NO_DATA: 'Нет данных для отображения',
    SEARCH_RESULTS: 'Найдено результатов',
  }
};

// Функции-помощники для частых случаев
export const getSuccessMessage = (action: string, entity: string) => {
  return `${entity} успешно ${action}`;
};

export const getErrorMessage = (action: string, entity?: string) => {
  return entity ? `Ошибка ${action} ${entity}` : `Ошибка ${action}`;
}; 