import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { getHexFromName } from '../lib/unifiedColorService';

interface Color {
  id: string;
  name: string;
  hex_code?: string;
  product_count?: number;
}

interface ColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  color?: Color | null; // Для редактирования
}

const ColorModal: React.FC<ColorModalProps> = ({ isOpen, onClose, onSuccess, color }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    hex_code: '#000000'
  });

  const isEditing = !!color;

  // Используем единый сервис цветов для генерации HEX-кода

  // Обновляем форму при изменении цвета для редактирования
  useEffect(() => {
    if (color) {
      const hexCode = color.hex_code || getHexFromName(color.name);
      setFormData({
        name: color.name,
        hex_code: hexCode
      });
    } else {
      setFormData({
        name: '',
        hex_code: '#000000'
      });
    }
  }, [color]);

  // Автоматически генерируем HEX-код при изменении названия
  const handleNameChange = (name: string) => {
    const hexCode = getHexFromName(name);
    setFormData(prev => ({ 
      ...prev, 
      name,
      hex_code: hexCode
    }));
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Редактирование цветов отключено - можно только создавать новые уникальные цвета
    if (isEditing) {
      showToast('Редактирование цветов отключено. Можно только создавать новые уникальные цвета.', 'info');
      return;
    }
    
    if (!formData.name.trim()) {
      showToast('Введите название цвета', 'error');
      return;
    }

    setLoading(true);

    try {
      // Только создание новых цветов
      const response = await fetch('/api/colors/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          hex_code: formData.hex_code
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания цвета');
      }

      showToast('Цвет создан успешно', 'success');
      setFormData({ name: '', hex_code: '#000000' });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Ошибка создания цвета:', error);
      showToast(error.message || 'Ошибка создания цвета', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    // Удаление цветов отключено - можно только создавать новые уникальные цвета
    showToast('Удаление цветов отключено. Можно только создавать новые уникальные цвета.', 'info');
    return;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Создать цвет
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название цвета *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Введите название цвета"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HEX код (автоматически генерируется)
            </label>
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-8 rounded border border-gray-300"
                style={{ backgroundColor: formData.hex_code }}
              />
              <input
                type="text"
                value={formData.hex_code}
                readOnly
                className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 font-mono text-sm"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="submit"
              className="btn text-xs"
              disabled={loading}
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColorModal;
