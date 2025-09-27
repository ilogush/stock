import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useToast } from '../../components/ToastContext';
import PageHeader from '../../components/PageHeader';

interface AvailableBrand {
  id: number;
  name: string;
  company_id?: number;
}

const NewCompanyPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: ''
  });
  const [availableBrands, setAvailableBrands] = useState<AvailableBrand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        // Загружаем все бренды для выпадающего списка
        const brandsRes = await fetch('/api/brands');
        const brandsData = await brandsRes.json();
        if (brandsRes.ok) {
          // Показываем только бренды без привязки к компании (доступные для привязки)
          const availableForSelection = (brandsData.brands || []).filter((brand: AvailableBrand) => 
            !brand.company_id
          );
          setAvailableBrands(availableForSelection);
        }
      } catch (err: any) {
        console.error('Ошибка загрузки брендов:', err);
        showToast('Ошибка загрузки брендов', 'error');
      }
    };

    fetchBrands();
  }, [showToast]);

  const handleCompanyCreate = async () => {
    if (!form.name.trim()) {
      showToast('Название компании обязательно', 'error');
      return;
    }

    setLoading(true);
    try {
      // Создаем компанию
      const response = await fetch('/api/companies/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const companyData = await response.json();
      if (!response.ok) throw new Error(companyData.error || 'Ошибка создания компании');

      // Если выбран бренд - привязываем его к созданной компании
      if (selectedBrandId) {
        const brandRes = await fetch(`/api/brands/${selectedBrandId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyData.id }),
        });
        
        if (!brandRes.ok) {
          const brandError = await brandRes.json();
          console.error('Ошибка привязки бренда:', brandError);
          // Не показываем ошибку пользователю, так как компания уже создана
        }
      }

      showToast('Компания создана', 'success');
      router.push('/companies');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCompanyCreate();
  };

  return (
    <div>
      <form onSubmit={handleFormSubmit}>
        <PageHeader 
          title="Создать компанию"
          showBackButton={true}
          backHref="/companies"
          action={{
            label: loading ? 'Сохранение...' : 'Создать',
            onClick: handleFormSubmit
          }}
        />

        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="name">
                Название компании <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Введите название компании"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="address">
                Адрес
              </label>
              <input
                type="text"
                id="address"
                value={form.address}
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Введите адрес"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="phone">
                Телефон
              </label>
              <input
                type="text"
                id="phone"
                value={form.phone}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Введите телефон"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="brandSelect">
                Выбрать первый бренд
              </label>
              <select
                id="brandSelect"
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">Без бренда</option>
                {availableBrands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </form>

      {/* Информационный блок */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-800">
          <strong>Примечание:</strong> После создания компании вы сможете добавить дополнительные бренды на странице редактирования компании.
        </p>
      </div>
    </div>
  );
};

export default NewCompanyPage; 