import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import type { NextPage } from 'next';
import { useToast } from '../../components/ToastContext';
import PageHeader from '../../components/PageHeader';

interface Company {
  id: number;
  name: string;
  address?: string;
  phone?: string;
}

interface AvailableUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

const NewBrandPage: NextPage = () => {
  const [form, setForm] = useState({
    name: '',
    company_id: ''
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загружаем компании
        const companiesRes = await fetch('/api/companies');
        const companiesData = await companiesRes.json();
        if (companiesRes.ok) {
          setCompanies(companiesData.companies || []);
        }

        // Загружаем пользователей
        const usersRes = await fetch('/api/users');
        const usersData = await usersRes.json();
        if (usersRes.ok) {
          setAvailableUsers(usersData.users || []);
        }
      } catch (err: any) {
        console.error('Ошибка загрузки данных:', err);
        showToast('Ошибка загрузки данных', 'error');
      }
    };

    fetchData();
  }, [showToast]);

  const handleBrandCreate = async () => {
    if (!form.name.trim()) {
      showToast('Название бренда обязательно', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/brands/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          company_id: form.company_id ? parseInt(form.company_id) : null
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка создания');

      showToast('Бренд создан', 'success');
      router.push('/brands');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleBrandCreate();
  };

  const selectedCompany = companies.find(c => c.id.toString() === form.company_id);

  return (
    <div>
      <form onSubmit={handleFormSubmit}>
        <PageHeader 
          title="Создать бренд"
          showBackButton={true}
          backHref="/brands"
          action={{
            label: loading ? 'Сохранение...' : 'Создать',
            onClick: handleFormSubmit
          }}
        />

        {/* Основная форма */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название бренда <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Введите название бренда"
              className="w-full border border-gray-300 rounded-md p-2"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Компания
            </label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={form.company_id}
              onChange={(e) => setForm(prev => ({ ...prev, company_id: e.target.value }))}
            >
              <option value="">Не привязан</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Адрес компании
            </label>
            <input
              type="text"
              readOnly
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
              value={selectedCompany?.address || ''}
              placeholder="Адрес будет заполнен автоматически"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Выбрать первого менеджера
            </label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Без менеджера</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {/* Информационный блок */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-800">
          <strong>Примечание:</strong> После создания бренда вы сможете добавить дополнительных менеджеров на странице редактирования бренда.
        </p>
      </div>
    </div>
  );
};

export default NewBrandPage; 