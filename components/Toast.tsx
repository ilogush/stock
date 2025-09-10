import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ToastProps {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: (id: number) => void;
}

export default function Toast({ id, message, type, onClose }: ToastProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 border-l-green-400';
      case 'error':
        return 'bg-red-500 border-l-red-400';
      case 'info':
        return 'bg-blue-500 border-l-blue-400';
      default:
        return 'bg-gray-600 border-l-gray-500';
    }
  };

  const getInlineStyles = () => {
    // Темный фон для всех тостов, но разные цвета полоски слева
    const borderColor = type === 'error' ? '#ef4444' : '#10b981'; // красная для ошибок, зеленая для остальных
    return { 
      backgroundColor: '#374151', 
      borderLeftColor: borderColor 
    };
  };

  // Убираем все иконки из тостов

  return (
    <div 
      data-toast-id={id}
      className="px-4 py-3 rounded-lg shadow-lg text-white max-w-sm border-l-4"
      style={getInlineStyles()}
    >
      <div className="flex justify-between items-center">
        <span className="text-sm">{message}</span>
        <button
          onClick={() => onClose(id)}
          className="ml-3 text-white hover:text-gray-200 flex-shrink-0"
          aria-label="Закрыть уведомление"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
} 