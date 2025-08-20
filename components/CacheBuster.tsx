'use client';

import { useEffect, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface CacheBusterProps {
  children: React.ReactNode;
}

export default function CacheBuster({ children }: CacheBusterProps) {
  const [isReloading, setIsReloading] = useState(false);
  const [lastReload, setLastReload] = useState<number>(Date.now());

  // Функция для принудительной перезагрузки с очисткой кеша
  const forceReload = () => {
    setIsReloading(true);
    
    // Очищаем localStorage и sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Принудительная перезагрузка с очисткой кеша
    window.location.reload();
  };

  // Функция для мягкой перезагрузки
  const softReload = () => {
    setIsReloading(true);
    setLastReload(Date.now());
    
    // Простая перезагрузка страницы
    window.location.reload();
  };

  // Убираем автоматическое добавление timestamp - это создает бесконечные перезагрузки

  // Горячие клавиши для перезагрузки
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+Shift+R для принудительной перезагрузки
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        forceReload();
      }
      
      // F5 для мягкой перезагрузки
      if (event.key === 'F5') {
        event.preventDefault();
        softReload();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Показываем индикатор загрузки
  if (isReloading) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">Перезагрузка...</p>
          <p className="text-sm text-gray-500 mt-2">Очистка кеша и обновление страницы</p>
        </div>
      </div>
    );
  }

  return (
    <div key={lastReload}>
      {children}
    </div>
  );
}
