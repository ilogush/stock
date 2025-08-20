import React, { createContext, useContext, useState, ReactNode } from 'react';
import Toast from './Toast';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    // Проверяем есть ли уже такое же сообщение
    const existingToast = toasts.find(toast => toast.message === message && toast.type === type);
    if (existingToast) {
      return; // Не добавляем дубликат
    }

    const id = Date.now(); // Используем timestamp как ID
    const newToast: ToastItem = { id, message, type };
    setToasts(prev => [...prev, newToast]);

    // Автоматически удаляем toast через 3 секунды
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  };

  const removeToast = (id: number) => {
    // Добавляем анимацию исчезновения
    const toastElement = document.querySelector(`[data-toast-id="${id}"]`);
    if (toastElement) {
      toastElement.classList.add('animate-slide-out');
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, 300); // Ждем завершения анимации
    } else {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className="animate-slide-in"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'both'
            }}
          >
            <Toast
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={removeToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
} 