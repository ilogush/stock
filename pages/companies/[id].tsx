import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { useToast } from '../../components/ToastContext';
import PageHeader from '../../components/PageHeader';
import Link from 'next/link';

type Brand = { id: string; name: string };

interface AvailableBrand {
  id: number;
  name: string;
  company_id?: number;
}

const CompanyDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();

  const [form, setForm] = useState<{ name: string; address: string; phone: string } | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [availableBrands, setAvailableBrands] = useState<AvailableBrand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchData = async () => {
      try {
        // Загружаем данные компании и её бренды
        const companyRes = await fetch(`/api/companies/${id}`);
        const companyData = await companyRes.json();
        if (!companyRes.ok) throw new Error(companyData.error || 'Ошибка загрузки');
        
        const company = companyData.company || companyData;
        setForm({ 
          name: company?.name || '', 
          address: company?.address || '',
          phone: company?.phone || ''
        });
        setBrands(companyData.brands || []);

        // Загружаем все бренды для выпадающего списка
        const brandsRes = await fetch('/api/brands');
        const brandsData = await brandsRes.json();
        if (brandsRes.ok) {
          // Исправляем структуру ответа - API возвращает { data: { brands: [...] } }
          const allBrands = brandsData.data?.brands || brandsData.brands || [];
          console.log('Загружены бренды:', allBrands);
          
          // Показываем только бренды без привязки к компании (доступные для привязки)
          const availableForSelection = allBrands.filter((brand: AvailableBrand) => 
            !brand.company_id
          );
          console.log('Доступные бренды для выбора:', availableForSelection);
          setAvailableBrands(availableForSelection);
        }
      } catch (err: any) {
        console.error('Ошибка загрузки:', err);
        showToast(err.message || 'Ошибка загрузки компании', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, showToast]);



  const handleCompanyUpdate = async () => {
    if (!id || typeof id !== 'string' || !form) return;

    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Ошибка обновления компании');
      }

      showToast('Компания успешно обновлена', 'success');
      router.push('/companies');
    } catch (err: any) {
      console.error('Ошибка обновления компании:', err);
      showToast(err.message || 'Ошибка обновления компании', 'error');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedBrandId) {
      // Если выбран бренд - добавляем его
      await handleAddBrandToCompany();
    } else {
      // Если бренд не выбран - сохраняем данные компании
      await handleCompanyUpdate();
    }
  };

  const handleAddBrandToCompany = async () => {
    if (!selectedBrandId || !id || typeof id !== 'string') return;

    try {
      const res = await fetch(`/api/brands/${selectedBrandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: parseInt(id) }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Ошибка назначения бренда');
      }

      // Обновляем списки
      const selectedBrand = availableBrands.find(b => b.id.toString() === selectedBrandId);
      if (selectedBrand) {
        setBrands(prev => [...prev, { id: selectedBrand.id.toString(), name: selectedBrand.name }]);
        setAvailableBrands(prev => prev.filter(b => b.id.toString() !== selectedBrandId));
        setSelectedBrandId('');
        showToast('Бренд успешно назначен компании', 'success');
      }
    } catch (err: any) {
      console.error('Ошибка назначения бренда:', err);
      showToast(err.message || 'Ошибка назначения бренда', 'error');
    }
  };

  const handleRemoveBrand = async (brandId: string) => {
    try {
      const res = await fetch(`/api/brands/${brandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: null }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Ошибка удаления бренда');
      }

      // Обновляем списки
      const removedBrand = brands.find(b => b.id === brandId);
      if (removedBrand) {
        setBrands(prev => prev.filter(b => b.id !== brandId));
        setAvailableBrands(prev => [...prev, { 
          id: parseInt(brandId), 
          name: removedBrand.name 
        }]);
        showToast('Бренд удален из компании', 'success');
      }
    } catch (err: any) {
      console.error('Ошибка удаления бренда:', err);
      showToast(err.message || 'Ошибка удаления бренда', 'error');
    }
  };

  if (loading) return <div className="p-4 flex justify-center"><div className="text-gray-500">Загрузка...</div></div>;
  if (!form) return <div className="p-4">Компания не найдена</div>;

  return (
    <div>
      {/* Редактирование данных компании */}
      <form onSubmit={handleFormSubmit}>
        <PageHeader 
          title={`Компания ${typeof id === 'string' ? id.padStart(2, '0') : id}`}
          showBackButton={true}
          backHref="/companies"
          action={{
            label: selectedBrandId ? 'Сохранить' : 'Сохранить',
            onClick: selectedBrandId ? () => handleAddBrandToCompany() : handleCompanyUpdate
          }}
        />

        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="name">
                Название компании *
              </label>
              <input
                type="text"
                id="name"
                value={form?.name || ''}
                onChange={(e) => setForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Введите название компании"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="address">
                Адрес
              </label>
              <input
                type="text"
                id="address"
                value={form?.address || ''}
                onChange={(e) => setForm(prev => prev ? { ...prev, address: e.target.value } : null)}
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
                value={form?.phone || ''}
                onChange={(e) => setForm(prev => prev ? { ...prev, phone: e.target.value } : null)}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Введите телефон"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="brandSelect">
                Выбрать бренд для добавления
              </label>
              <select
                id="brandSelect"
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">Выберите бренд</option>
                {availableBrands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              {/* Отладочная информация */}
              <div className="text-xs text-gray-500 mt-1">
                Доступно брендов: {availableBrands.length}
                {availableBrands.length === 0 && (
                  <span className="text-red-500 ml-2">Нет доступных брендов для выбора</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Бренды компании */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Бренды компании</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">НАЗВАНИЕ</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ДЕЙСТВИЯ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {brands && brands.length > 0 ? brands.map((brand, index) => (
                  <tr key={brand.id} className="table-row-hover">
                    <td className="table-cell">
                      <Link href={`/brands/${brand.id}`} className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono">
                        {String(index + 1).padStart(3, '0')}
                      </Link>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                      {brand.name || 'Без названия'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <button
                        type="button"
                        onClick={() => handleRemoveBrand(brand.id)}
                        className="btn text-xs"
                      >
                        удалить
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-sm text-gray-500">
                      Брендов не назначено
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

export default CompanyDetailPage; 