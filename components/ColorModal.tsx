import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

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

  // Генерируем HEX-код на основе названия цвета
  const getHexFromName = (name: string): string => {
    const colorMap: { [key: string]: string } = {
      // Основные цвета
      'Белый': '#FFFFFF',
      'Черный': '#000000',
      'Красный': '#FF0000',
      'Зеленый': '#00FF00',
      'Синий': '#0000FF',
      'Желтый': '#FFFF00',
      'Розовый': '#FFC0CB',
      'Оранжевый': '#FFA500',
      'Фиолетовый': '#800080',
      'Коричневый': '#A52A2A',
      'Серый': '#808080',
      'Бежевый': '#F5DEB3',
      'Бирюзовый': '#40E0D0',
      'Изумрудный': '#50C878',
      'Светло-голубой': '#87CEEB',
      'Серый меланж': '#C0C0C0',
      'Ассорти': '#FFD700',
      'Терракотовый': '#E2725B',
      'спрут': '#8B4513',
      'лоза': '#228B22',
      
      // Дополнительные цвета и вариации
      'Розово': '#FFC0CB',
      'Розов': '#FFC0CB',
      'Зайчики на розовом': '#FFB6C1',
      'Зайчики': '#FFB6C1',
      'Розовое': '#FFC0CB',
      'Розовая': '#FFC0CB',
      
      // Оттенки розового
      'Светло-розовый': '#FFB6C1',
      'Темно-розовый': '#FF1493',
      'Нежно-розовый': '#FFE4E1',
      'Ярко-розовый': '#FF69B4',
      
      // Оттенки синего
      'Голубой': '#87CEEB',
      'Небесно-голубой': '#87CEEB',
      'Темно-синий': '#000080',
      'Светло-синий': '#ADD8E6',
      
      // Оттенки зеленого
      'Салатовый': '#7FFF00',
      'Темно-зеленый': '#006400',
      'Светло-зеленый': '#90EE90',
      'Лаймовый': '#32CD32',
      
      // Оттенки красного
      'Бордовый': '#800020',
      'Малиновый': '#DC143C',
      'Темно-красный': '#8B0000',
      'Светло-красный': '#FF6B6B',
      
      // Металлические цвета
      'Золотой': '#FFD700',
      'Серебряный': '#C0C0C0',
      'Бронзовый': '#CD7F32',
      
      // Пастельные цвета
      'Пастельно-розовый': '#FFE4E1',
      'Пастельно-голубой': '#E0F6FF',
      'Пастельно-зеленый': '#E0F8E0',
      'Пастельно-желтый': '#FFFACD'
    };
    
    // Проверяем точное совпадение
    if (colorMap[name]) {
      return colorMap[name];
    }
    
    // Проверяем частичные совпадения
    const normalizedName = name.toLowerCase();
    for (const [colorName, hexCode] of Object.entries(colorMap)) {
      if (normalizedName.includes(colorName.toLowerCase()) || 
          colorName.toLowerCase().includes(normalizedName)) {
        return hexCode;
      }
    }
    
    // Если ничего не найдено, генерируем цвет на основе названия
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    const saturation = 70 + (Math.abs(hash) % 30); // 70-100%
    const lightness = 45 + (Math.abs(hash) % 20); // 45-65%
    
    // Конвертируем HSL в HEX
    const h = hue / 360;
    const s = saturation / 100;
    const l = lightness / 100;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

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
    
    if (!formData.name.trim()) {
      showToast('Введите название цвета', 'error');
      return;
    }

    setLoading(true);

    try {
      const url = isEditing ? `/api/colors/${color.id}` : '/api/colors/create';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
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
        throw new Error(data.error || `Ошибка ${isEditing ? 'обновления' : 'создания'} цвета`);
      }

      showToast(`Цвет ${isEditing ? 'обновлен' : 'создан'} успешно`, 'success');
      setFormData({ name: '', hex_code: '#000000' });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(`Ошибка ${isEditing ? 'обновления' : 'создания'} цвета:`, error);
      showToast(error.message || `Ошибка ${isEditing ? 'обновления' : 'создания'} цвета`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!color) return;

    if ((color.product_count || 0) > 0) {
      showToast('Нельзя удалить цвет, который используется в товарах', 'error');
      return;
    }

    if (!confirm(`Удалить цвет "${color.name}"?`)) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/colors/${color.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка удаления цвета');
      }

      showToast('Цвет удален успешно', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Ошибка удаления цвета:', error);
      showToast(error.message || 'Ошибка удаления цвета', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Редактировать цвет' : 'Создать цвет'}
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
            {isEditing && (color?.product_count || 0) === 0 && [1, 4].includes(user?.role_id || 0) && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn text-xs"
                disabled={loading}
              >
                {loading ? 'Удаление...' : 'Удалить'}
              </button>
            )}
            <button
              type="submit"
              className="btn text-xs"
              disabled={loading}
            >
              {loading ? (isEditing ? 'Обновление...' : 'Создание...') : (isEditing ? 'Обновить' : 'Создать')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColorModal;
