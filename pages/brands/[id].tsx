import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useToast } from '../../components/ToastContext';
import PageHeader from '../../components/PageHeader';

interface Company {
  id: number;
  name: string;
  address?: string;
  phone?: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Manager {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role_id?: number;
  role_display?: string;
  phone?: string;
}

interface AvailableUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Brand {
  id: number;
  name: string;
  company_id?: number;
  company?: Company;
}

const BrandDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();

  const [form, setForm] = useState<{ name: string } | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const reloadData = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      // Загружаем данные бренда
      const brandRes = await fetch(`/api/brands/${id}?t=${Date.now()}`);
      const brandData = await brandRes.json();
      if (!brandRes.ok) throw new Error(brandData.error || 'Ошибка загрузки');
      
      const brandInfo = brandData.brand || brandData;
      setBrand(brandInfo);
      setForm({ name: brandInfo?.name || '' });
      setManagers(brandData.managers || []);

      // Загружаем всех пользователей для выпадающего списка
      const usersRes = await fetch(`/api/users?t=${Date.now()}`);
      const usersData = await usersRes.json();
      if (usersRes.ok) {
        // Исключаем уже назначенных менеджеров из списка доступных пользователей
        const currentManagerIds = (brandData.managers || []).map((m: any) => m.user_id || m.id);
        const availableForSelection = (usersData.users || []).filter((user: AvailableUser) => 
          !currentManagerIds.includes(user.id.toString()) && !currentManagerIds.includes(user.id)
        );
        setAvailableUsers(availableForSelection);
      }
    } catch (err: any) {
      console.error('Ошибка перезагрузки:', err);
      showToast(err.message || 'Ошибка перезагрузки данных', 'error');
    }
  };

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchData = async () => {
      try {
        setLoading(true);
        await reloadData();
      } catch (err: any) {
        console.error('Ошибка загрузки:', err);
        showToast(err.message || 'Ошибка загрузки бренда', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, showToast]);

  const handleBrandUpdate = async () => {
    if (!id || typeof id !== 'string' || !form) return;

    try {
      const res = await fetch(`/api/brands/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Ошибка обновления бренда');
      }

      showToast('Бренд успешно обновлен', 'success');
      router.push('/brands');
    } catch (err: any) {
      console.error('Ошибка обновления бренда:', err);
      showToast(err.message || 'Ошибка обновления бренда', 'error');
    }
  };

  const handleAddManager = async () => {
    if (!selectedUserId || !id || typeof id !== 'string') return;

    try {
      const res = await fetch(`/api/brands/${id}/managers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(selectedUserId) }),
      });
      
      if (res.status === 409) {
        // Пользователь уже назначен менеджером
        const errorData = await res.json();
        showToast(errorData.error || 'Этот пользователь уже является менеджером бренда', 'error');
        // Сбрасываем выбор и перезагружаем данные
        setSelectedUserId('');
        // Перезагружаем данные с сервера
        await reloadData();
        return;
      }

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Ошибка добавления менеджера');
      }

      showToast('Менеджер успешно добавлен', 'success');
      // Перезагружаем данные с сервера
      await reloadData();
      setSelectedUserId('');
    } catch (err: any) {
      console.error('Ошибка добавления менеджера:', err);
      showToast(err.message || 'Ошибка добавления менеджера', 'error');
    }
  };

  const handleRemoveManager = async (managerId: string) => {
    try {
      const res = await fetch(`/api/brands/${id}/managers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(managerId) }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Ошибка удаления менеджера');
      }

      showToast('Менеджер удален', 'success');
      // Перезагружаем данные с сервера
      await reloadData();
    } catch (err: any) {
      console.error('Ошибка удаления менеджера:', err);
      showToast(err.message || 'Ошибка удаления менеджера', 'error');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedUserId) {
      // Если выбран менеджер - добавляем его
      await handleAddManager();
    } else {
      // Если менеджер не выбран - сохраняем данные бренда
      await handleBrandUpdate();
    }
  };

  if (loading) return <div className="p-4">Загрузка</div>;
  if (!form || !brand) return <div className="p-4">Бренд не найден</div>;

  return (
    <div>
      {/* Редактирование данных бренда */}
      <form onSubmit={handleFormSubmit}>
      <PageHeader 
          title={`Бренд `}
        showBackButton={true}
        backHref="/brands"
        action={{
            label: selectedUserId ? 'Сохранить' : 'Сохранить',
            onClick: selectedUserId ? () => handleAddManager() : handleBrandUpdate
        }}
      />

        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="name">
                Название бренда *
              </label>
          <input
            type="text"
                id="name"
                value={form?.name || ''}
                onChange={(e) => setForm(prev => prev ? { ...prev, name: e.target.value } : null)}
            className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Введите название бренда"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="company">
                Компания
              </label>
              <input
                type="text"
                id="company"
                value={brand?.company?.name || 'Не привязан к компании'}
                className="w-full border border-gray-300 rounded-md p-2 bg-gray-50"
                disabled
                readOnly
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="address">
                Адрес компании
              </label>
              <input
                type="text"
                id="address"
                value={brand?.company?.address || '—'}
                className="w-full border border-gray-300 rounded-md p-2 bg-gray-50"
                disabled
                readOnly
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="managerSelect">
                Бренд менеджер
              </label>
              <select
                id="managerSelect"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">Выберите менеджера</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Менеджеры бренда */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Менеджеры бренда</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ИМЯ</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ФАМИЛИЯ</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">РОЛЬ</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ТЕЛЕФОН</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ДЕЙСТВИЯ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {managers && managers.length > 0 ? managers.map((manager, index) => (
                  <tr key={manager.id} className="table-row-hover">
                    <td className="table-cell">
                      <Link href={`/users/${manager.id}`} className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono">
                        {String(index + 1).padStart(3, '0')}
                      </Link>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                      {manager.first_name || 'Не указано'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                      {manager.last_name || 'Не указано'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                      {manager.role_display || 'Не указано'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                      {manager.phone || 'Не указано'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <button
                        type="button"
                        onClick={() => handleRemoveManager(manager.id)}
                        className="btn text-xs"
                      >
                        удалить
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">
                      Менеджеров не назначено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>
    </form>
    </div>
  );
};

export default BrandDetailPage; 