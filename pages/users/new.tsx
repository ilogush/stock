import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { NextPage } from 'next';
import { useToast } from '../../components/ToastContext';
import { supabase } from '../../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import PageHeader from '../../components/PageHeader';
import { TOAST_MESSAGES } from '../../lib/toastMessages';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

// Тип роли
type Role = {
  id: number;
  name: string;
  display_name: string;
};

const NewUserPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();

  // Поля формы
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState<number | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Загружаем роли для выпадающего списка
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/roles');
        const json = await res.json();
        if (!res.ok) {
          showToast(json.error || 'Ошибка загрузки ролей', 'error');
          setRoles([]);
        } else {
          setRoles(json.roles || []);
        }
      } catch (err: any) {
        console.error('Ошибка загрузки ролей:', err);
        showToast('Ошибка загрузки ролей', 'error');
        setRoles([]);
      }
    };
    fetchRoles();
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация телефона: +7 и 10 цифр
    const phoneRegex = /^\+7\d{10}$/;
    if (phone && !phoneRegex.test(phone)) {
      showToast(TOAST_MESSAGES.ERROR.INVALID_PHONE, 'error');
      return;
    }

    if (!password || password.length < 4) {
      showToast('Пароль обязателен и должен быть не короче 4 символов', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          first_name: firstName, 
          last_name: lastName, 
          phone, 
          role_id: roleId 
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания пользователя');
      }

      showToast(TOAST_MESSAGES.SUCCESS.USER_CREATED, 'success');
      router.push('/users');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
      <form onSubmit={handleSubmit}>
        <PageHeader 
          title="Создать пользователя"
          showBackButton={true}
          backHref="/users"
          action={{
            label: loading ? 'Создание...' : 'Создать',
            onClick: handleSubmit
          }}
        />

        {/* Инпуты */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Имя */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          {/* Фамилия */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          {/* Телефон */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
            <input
              type="tel"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              maxLength={12}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Пароль */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 pr-10"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={()=>setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Роль */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={roleId ?? ''}
              onChange={(e) => setRoleId(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">Не назначена</option>
              {roles.map((r:any) => (
                <option key={r.id} value={r.id}>{r.display_name}</option>
              ))}
            </select>
          </div>
        </div>
      </form>
  );
};

export default NewUserPage; 