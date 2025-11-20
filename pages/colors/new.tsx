import { useEffect, useState } from 'react';
import { useUserRole } from '../../lib/hooks/useUserRole';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../components/AuthContext';
import { getHexByColorName } from '../../lib/colorUtils';

const NewColorPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { hasAnyRole, loading: roleLoading } = useUserRole();

  const [loading, setLoading] = useState(false);
  const [colorName, setColorName] = useState('');


  // Доступ для администраторов, директоров и менеджеров
  const hasAccess = hasAnyRole(['admin', 'director', 'manager']);



  // Функция для генерации HEX кода
  const generateHexCode = (name: string): string => {
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
    const normalizedNameForHash = name.trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < normalizedNameForHash.length; i++) {
      hash = normalizedNameForHash.charCodeAt(i) + ((hash << 5) - hash);
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



  const handleSubmit = async () => {
    if (!colorName.trim()) {
      showToast('Введите название цвета', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/colors/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: colorName.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка создания');

      showToast('Цвет успешно создан', 'success');
      router.push('/colors');
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Показываем загрузку ролей
  if (roleLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-gray-500">Загрузка...</div>
          <div className="text-gray-600 mt-2">Проверка прав доступа...</div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Доступ запрещён</div>
          <div className="text-gray-600">Создание цветов доступно только администраторам</div>
          <button
            onClick={() => router.push('/colors')}
            className="btn mt-4"
          >
            Вернуться к списку цветов
          </button>
        </div>
      </div>
    );
  }



  return (
    <div>
      <PageHeader
        title="Добавить цвет"
        showBackButton
        backHref="/colors"
        action={{
          label: loading ? 'Создание...' : 'Создать',
          onClick: handleSubmit,
          disabled: loading
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название цвета *
          </label>
          <input
            type="text"
            value={colorName}
            onChange={(e) => {
              setColorName(e.target.value);
            }}
            placeholder="например: Малиновый, Небесно-голубой"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 "
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HEX код
          </label>
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded border border-gray-300"
              style={{ backgroundColor: colorName ? generateHexCode(colorName) : '#ffffff' }}
            ></div>
            <input
              type="text"
              value={colorName ? generateHexCode(colorName) : ''}
              placeholder="#FF0000"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 text-gray-500"
              disabled
            />
          </div>
        </div>
      </div>


    </div>
  );
};

export default NewColorPage; 