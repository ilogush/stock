// Переводы ошибок Supabase на русский язык
export const translateSupabaseError = (error: any): string => {
  if (!error) return 'Неизвестная ошибка';
  
  const message = error.message || error.error_description || '';
  
  // Ошибки аутентификации
  if (message.includes('Invalid login credentials')) {
    return 'Неверный логин или пароль';
  }
  
  if (message.includes('Email not confirmed')) {
    return 'Email не подтвержден';
  }
  
  if (message.includes('User not found')) {
    return 'Пользователь не найден';
  }
  
  if (message.includes('Password should be at least')) {
    return 'Пароль должен содержать минимум 4 символа';
  }
  
  if (message.includes('Unable to validate email address')) {
    return 'Некорректный email адрес';
  }
  
  if (message.includes('signup is disabled')) {
    return 'Регистрация отключена';
  }
  
  if (message.includes('Email rate limit exceeded')) {
    return 'Превышен лимит отправки email. Попробуйте позже';
  }
  
  if (message.includes('For security purposes')) {
    return 'По соображениям безопасности повторите попытку позже';
  }
  
  if (message.includes('Network request failed')) {
    return 'Ошибка сети. Проверьте подключение к интернету';
  }
  
  if (message.includes('JWT expired')) {
    return 'Сессия истекла. Войдите в систему заново';
  }
  
  if (message.includes('refresh_token_not_found')) {
    return 'Сессия истекла. Войдите в систему заново';
  }
  
  if (message.includes('Invalid refresh token')) {
    return 'Недействительный токен. Войдите в систему заново';
  }
  
  // Ошибки базы данных
  if (message.includes('duplicate key value violates unique constraint')) {
    if (message.includes('email')) {
      return 'Пользователь с таким email уже существует';
    }
    if (message.includes('phone')) {
      return 'Пользователь с таким телефоном уже существует';
    }
    return 'Такая запись уже существует';
  }
  
  if (message.includes('violates foreign key constraint')) {
    return 'Ошибка связи данных';
  }
  
  if (message.includes('not-null constraint')) {
    return 'Заполните все обязательные поля';
  }
  
  if (message.includes('Permission denied')) {
    return 'Недостаточно прав доступа';
  }
  
  if (message.includes('Row level security policy')) {
    return 'Недостаточно прав для выполнения операции';
  }
  
  // Общие ошибки
  if (message.includes('Failed to fetch')) {
    return 'Ошибка соединения с сервером';
  }
  
  if (message.includes('Internal Server Error')) {
    return 'Внутренняя ошибка сервера';
  }
  
  if (message.includes('Bad Request')) {
    return 'Некорректный запрос';
  }
  
  if (message.includes('Unauthorized')) {
    return 'Не авторизован';
  }
  
  if (message.includes('Forbidden')) {
    return 'Доступ запрещен';
  }
  
  if (message.includes('Not Found')) {
    return 'Ресурс не найден';
  }
  
  if (message.includes('Timeout')) {
    return 'Превышено время ожидания';
  }
  
  // Если перевод не найден, возвращаем оригинальное сообщение
  return message || 'Произошла ошибка';
}; 