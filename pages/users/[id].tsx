import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { useToast } from '../../components/ToastContext';
import { translateSupabaseError } from '../../lib/supabaseErrorTranslations';
import { supabase } from '../../lib/supabaseClient';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { TOAST_MESSAGES } from '../../lib/toastMessages';
import PageHeader from '../../components/PageHeader';

type Role = { id: number; name: string; display_name: string };

const EditUser: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchUserData = async () => {
        try {
          // Получаем данные пользователя через API
          const response = await fetch(`/api/users/${id}`);
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Ошибка получения данных пользователя');
          }
          
          if (data && data.is_deleted) {
            showToast('Пользователь удалён', 'error');
            router.push('/users');
            return;
          }

          setForm(data);
          setLoading(false);
          
          // Загружаем роли
          try {
            const rolesResponse = await fetch('/api/roles');
            const rolesJson = await rolesResponse.json();
            if (!rolesResponse.ok) {
              showToast(rolesJson.error || 'Ошибка загрузки ролей', 'error');
              setRoles([]);
            } else {
              setRoles(rolesJson.roles || []);
            }
          } catch (e) {
            console.error('Ошибка загрузки ролей:', e);
            showToast('Ошибка загрузки ролей', 'error');
            setRoles([]);
          }
        } catch (err: any) {
          console.error('Ошибка загрузки данных:', err);
          showToast(translateSupabaseError(err), 'error');
        }
      };
      
      fetchUserData();
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // валидация телефона
    const phoneRegex = /^\+7\d{10}$/;
    if (form.phone && !phoneRegex.test(form.phone)) {
      showToast(TOAST_MESSAGES.ERROR.INVALID_PHONE, 'error');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка обновления');
      showToast(TOAST_MESSAGES.SUCCESS.USER_UPDATED,'success');
      router.push('/users');
    } catch (err: any) {
      showToast(translateSupabaseError(err),'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить пользователя без возможности восстановления?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка удаления');
      showToast('Пользователь удален','success');
      router.push('/users');
    } catch (err:any){
      showToast(translateSupabaseError(err),'error');
    } finally { setDeleting(false);}  
  };

  if (loading || !form) return <div className="p-4 flex justify-center"><div className="text-gray-500">Загрузка...</div></div>;

  return (
      <form onSubmit={handleSubmit}>
        <PageHeader 
          title="Редактирование"
          showBackButton={true}
          backHref="/users"
          deleteAction={{
            label: 'Удалить',
            onClick: handleDelete,
            loading: deleting
          }}
          action={{
            label: loading ? 'Сохранение...' : 'Сохранить',
            onClick: handleSubmit
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Имя */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="first_name">Имя</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              className="w-full p-2 border border-gray-300 rounded-lg"
              value={form.first_name || ''}
              onChange={handleChange}
            />
          </div>

          {/* Фамилия */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="last_name">Фамилия</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              className="w-full p-2 border border-gray-300 rounded-lg"
              value={form.last_name || ''}
              onChange={handleChange}
            />
          </div>

          {/* Email */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full p-2 border border-gray-300 rounded-lg"
              value={form.email || ''}
              onChange={handleChange}
            />
          </div>

          {/* Телефон */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="phone">Телефон</label>
            <input
              id="phone"
              name="phone"
              type="text"
              className="w-full p-2 border border-gray-300 rounded-lg"
              maxLength={12}
              value={form.phone || ''}
              onChange={handleChange}
            />
          </div>

          {/* Телеграм */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="telegram">Телеграм</label>
            <input
              id="telegram"
              name="telegram"
              type="text"
              className="w-full p-2 border border-gray-300 rounded-lg"
              placeholder="@username"
              value={form.telegram || ''}
              onChange={handleChange}
            />
          </div>

          {/* Роль */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="role_id">Роль</label>
            <select
              id="role_id"
              name="role_id"
              className="w-full p-2 border border-gray-300 rounded-lg"
              value={form.role_id || ''}
              onChange={handleChange}
            >
              <option value="">Выберите роль</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.display_name}</option>
              ))}
            </select>
          </div>

          {/* Новый пароль */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="password">Новый пароль</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg"
                placeholder="Оставьте пустым, чтобы не менять"
                value={form.password || ''}
                onChange={handleChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
              {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
              ) : (
                  <EyeIcon className="w-5 h-5" />
              )}
              </button>
            </div>
          </div>
        </div>
      </form>
  );
};

export default EditUser; 