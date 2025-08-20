import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { useToast } from '../../../components/ToastContext';
import PageHeader from '../../../components/PageHeader';

const EditBrandPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Загружаем данные бренда
  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchBrand = async () => {
      try {
        const res = await fetch(`/api/brands/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
        setName(data.brand.name);
      } catch (err: any) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || typeof id !== 'string') return;
    if (!name.trim()) {
      showToast('Название бренда обязательно', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/brands/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');
      showToast('Сохранено', 'success');
      router.push(`/brands/${id}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Загрузка</div>;

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader 
        title="Редактирование бренда"
        showBackButton={true}
        backHref={`/brands/${id}`}
        action={{
          label: saving ? 'Сохранение...' : 'Сохранить',
          onClick: handleSubmit
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1">
            Название бренда *
          </label>
          <input
            id="name"
            type="text"
            className="border border-gray-300 rounded-md p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите название бренда"
            required
          />
        </div>
      </div>
    </form>
  );
};

export default EditBrandPage; 