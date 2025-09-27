import { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthContext';
import Link from 'next/link';
import { useToast } from '../../components/ToastContext';
import PageHeader from '../../components/PageHeader';

interface BrandSummary {
  id: number;
  name: string;
  products: number;
}

interface TaskItem {
  id: number;
  task_number?: string; // для будущего расширения
  title?: string;
  description: string;
  status: 'new' | 'in_progress' | 'done';

  created_at: string;
}

export default function BrandManagerDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'New' | 'Process' | 'Done'>('All');

  // ===== LOAD BRANDS + PRODUCTS ===== //
  const loadBrandsSummary = async () => {
    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      const allBrands = data.brands || [];
      const managed = allBrands.filter((b: any) => (b.managers || []).some((m: any) => m.id === user?.id));

      const summaries: BrandSummary[] = await Promise.all(
        managed.map(async (brand: any) => {
          try {
            const prRes = await fetch(`/api/products?limit=1&brand=${brand.id}`);
            const prData = await prRes.json();
            const total = prData.pagination?.total || 0;
            return { id: brand.id, name: brand.name, products: total };
          } catch {
            return { id: brand.id, name: brand.name, products: 0 };
          }
        })
      );
      setBrands(summaries);
    } catch (e) {
      console.error(e);
    }
  };

  // ===== LOAD TASKS ===== //
  const loadTasks = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/tasks', { headers: { 'x-user-id': String(user.id) } });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e: any) {
      showToast('Ошибка загрузки заданий', 'error');
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([loadBrandsSummary(), loadTasks()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  // ===== STATS ===== //
  const totalProducts = brands.reduce((sum, b) => sum + b.products, 0);
  const totalTasks = tasks.length;

  const stats = [
    { label: 'Бренды', value: brands.length },
    { label: 'Товары', value: totalProducts },
    { label: 'Задания', value: totalTasks }
  ];

  // ===== TASKS FILTER ===== //
  const filteredTasks = tasks.filter((t) => {
    switch (activeTab) {
      case 'New':
        return t.status === 'new';
      case 'Process':
        return t.status === 'in_progress';
      case 'Done':
        return t.status === 'done';
      default:
        return true;
    }
  });



  return (
    <div className="space-y-6">
      <PageHeader
        title="Дашборд бренд-менеджера"
        showBackButton
        action={{
          label: "Создать товар",
          href: "/products/new"
        }}
      />
      
      {/* ====== STATS GRID ====== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-4 rounded shadow flex flex-col">
            <span className="text-sm text-gray-500 mb-1">{s.label}</span>
            <span className="text-2xl font-semibold text-gray-800">{s.value}</span>
          </div>
        ))}
      </div>

      {/* ====== TASKS SECTION ====== */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">Задания</h3>
        <div className="flex gap-2 pb-2 mb-4">
          {['All', 'New', 'Process', 'Done'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`text-xs px-3 py-1 rounded-full border ${activeTab===tab?'bg-gray-800 text-white':'bg-gray-100 text-gray-800'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {filteredTasks.length === 0 ? (
          <p className="text-gray-500 text-sm">Нет заданий в этой категории.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Дата</th>
  
                  <th className="py-2 pr-4">Описание</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t, index) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <Link href={`/tasks/${t.id}`} className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono">
                        {String(index + 1).padStart(3, '0')}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-gray-800">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="py-2 pr-4 text-gray-800 max-w-md truncate">{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====== BRANDS SUMMARY ====== */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4">Ваши бренды</h3>
        {brands.length === 0 ? (
          <p className="text-gray-500">Бренды не найдены</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand) => (
              <div key={brand.id} className="p-4 bg-white rounded shadow flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-semibold text-gray-900">{brand.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">Товаров: {brand.products}</p>
                </div>
                <Link href={`/products?brand=${brand.id}`} className="text-sm text-blue-600 hover:underline self-start mt-3">
                  Товары →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 