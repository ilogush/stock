import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PageHeader from '../components/PageHeader';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../components/AuthContext';
import { translateSupabaseError } from '../lib/supabaseErrorTranslations';
import { supabase } from '../lib/supabaseClient';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import AvatarUploader from '../components/AvatarUploader';

interface Role {
  id: number;
  name: string;
  display_name: string;
  permissions?: Record<string, any>;
}

interface UploadedAvatar {
  id?: string;
  url: string;
  fileName: string;
  file?: File;
}

export default function Profile() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, refreshUser } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Данные формы
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [avatar, setAvatar] = useState<UploadedAvatar | null>(null);
  
  // Смена пароля
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      if (!user) return;
      
      // Заполняем форму
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
      setTelegram(user.telegram || '');
      
      // Загружаем аватар если есть
      if (user.avatar_url) {
        setAvatar({
          url: user.avatar_url,
          fileName: 'avatar.jpg'
        });
      }

      // Получаем роли
      const rolesResponse = await fetch('/api/roles');
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        const userRole = rolesData.roles.find((r: Role) => r.id === user.role_id);
        setRole(userRole);
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!user) throw new Error('Пользователь не найден');

      // Проверяем обязательные поля
      if (!phone.trim()) {
        throw new Error('Телефон является обязательным полем');
      }

      // Если указаны пароли, проверяем их
      if (newPassword || confirmPassword || currentPassword) {
        if (!currentPassword) {
          throw new Error('Для смены пароля укажите текущий пароль');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('Новые пароли не совпадают');
        }
            if (newPassword.length < 4) {
      throw new Error('Новый пароль должен содержать минимум 4 символа');
    }

        // Проверяем текущий пароль
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            password: currentPassword,
          }),
        });

        if (!loginResponse.ok) {
          throw new Error('Неверный текущий пароль');
        }
      }

      // Загружаем аватар если нужно
      let avatarUrl = user.avatar_url;
      if (avatar && avatar.file) {
        const formData = new FormData();
        formData.append('avatar', avatar.file);

        const uploadResponse = await fetch(`/api/users/avatar/upload?user_id=${user.id}`, {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          avatarUrl = uploadData.avatar.url;
          // Обновляем локальное состояние аватара
          setAvatar({
            url: avatarUrl || '',
            fileName: avatar.fileName || 'avatar.jpg'
          });
        } else {
          let message = 'Ошибка загрузки аватара';
          try {
            const errJson = await uploadResponse.json();
            if (errJson.error) message += `: ${errJson.error}`;
          } catch {}
          throw new Error(message);
        }
      }

      // Обновляем данные профиля
      const updateData: any = {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        telegram: telegram || null,
        avatar_url: avatarUrl,
      };

      // Добавляем пароль если указан
      if (newPassword) {
        updateData.password = newPassword;
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка сохранения данных');
      }

      showToast('Профиль успешно обновлен' + (newPassword ? ' и пароль изменен' : ''), 'success');
      
      // Очищаем поля паролей
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      await refreshUser(); // Обновляем данные пользователя в контексте
    } catch (error: any) {
      console.error('Ошибка:', error);
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Профиль" 
        showBackButton
        action={{
          label: saving ? 'Сохранение...' : 'Сохранить',
          onClick: () => {
            const form = document.getElementById('profile-form') as HTMLFormElement;
            form?.requestSubmit();
          },
          disabled: saving
        }}
      />
      
      {/* Аватар */}
      <AvatarUploader avatar={avatar} onAvatarChange={setAvatar} />

      {/* Информация о пользователе */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <span className="text-sm font-medium text-gray-500">Email:</span>
          <p className="mt-1 text-sm text-gray-900">{user.email}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500">Роль:</span>
          <p className="mt-1 text-sm text-gray-900">
            {role?.display_name || 'Не определена'}
          </p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500">Дата регистрации:</span>
          <p className="mt-1 text-sm text-gray-900">
            {new Date(user.created_at).toLocaleDateString('ru-RU')}
          </p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500">Дата обновления:</span>
          <p className="mt-1 text-sm text-gray-900">
            {new Date(user.updated_at).toLocaleDateString('ru-RU')}
          </p>
        </div>
      </div>

      {/* Форма редактирования профиля */}
      <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-4">
        {/* Основные данные */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имя *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Фамилия *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Телефон *
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telegram
            </label>
            <input
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
            />
          </div>
        </div>

        {/* Смена пароля */}
        <div className="border-t pt-6">
          <h3 className="text-lg text-gray-700 mb-4">Смена пароля</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Текущий пароль
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Новый пароль
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Подтвердите новый пароль
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
} 