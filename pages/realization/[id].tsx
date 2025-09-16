import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../components/ToastContext';
import { useUserRole } from '../../lib/hooks/useUserRole';
import { Realization } from '../../types';
import { PrinterIcon, TrashIcon } from '@heroicons/react/24/outline';

interface RealizationDetail extends Realization {
  items: RealizationItem[];
}

interface RealizationItem {
  id: number;
  product_id: number;
  size_code: string;
  color_id: number;
  qty: number;
  product_name?: string;
  article?: string;
  brand_name?: string;
  category_name?: string;
  size_name?: string;
  color_name?: string;
}

const RealizationDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();
  const { hasAnyRole } = useUserRole();

  const [realization, setRealization] = useState<RealizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRealization();
    }
  }, [id]);

  const fetchRealization = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/realization/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ошибка загрузки');
      }
      const data = await res.json();
      setRealization(data);
    } catch (error: any) {
      console.error('Ошибка загрузки реализации:', error);
      showToast(error.message || 'Ошибка загрузки реализации', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const printDocument = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!realization) return;
    
    const confirmed = window.confirm(
      `Вы уверены, что хотите удалить реализацию №${realization.id}?\n\nЭто действие нельзя отменить.`
    );
    
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/realization/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка удаления');
      }

      showToast('Реализация успешно удалена', 'success');
      router.push('/realization');
    } catch (error: any) {
      console.error('Ошибка удаления реализации:', error);
      showToast(error.message || 'Ошибка удаления реализации', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (!realization) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-red-500">Реализация не найдена</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Реализация ${realization.id}`}
        showBackButton
        backHref="/realization"
        action={{
          label: '',
          onClick: printDocument,
          icon: <PrinterIcon className="w-4 h-4" />
        }}
      >
        {hasAnyRole(['admin']) && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-red text-xs disabled:opacity-50 flex items-center"
          >
            <TrashIcon className="w-4 h-4 mr-1" />
            {deleting ? 'Удаление...' : 'Удалить'}
          </button>
        )}
      </PageHeader>

      <div className="space-y-6 print:space-y-4">
        {/* Информация о реализации */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-500">Номер реализации:</span>
            <div className="font-medium">{realization.id}</div>
          </div>
          
          <div>
            <span className="text-sm text-gray-500">Дата отгрузки:</span>
            <div className="font-medium">{formatDate(realization.created_at)}</div>
          </div>
          
          <div>
            <span className="text-sm text-gray-500">Кто передал:</span>
            <div className="font-medium">{realization.sender_name}</div>
          </div>
          
          <div>
            <span className="text-sm text-gray-500">Кому передали:</span>
            <div className="font-medium">{realization.recipient_name}</div>
          </div>
        </div>

        {/* Примечания */}
        {realization.notes && (
          <div>
            <span className="text-sm text-gray-500">Примечания:</span>
            <div className="mt-1 p-2 bg-gray-50 rounded text-sm">{realization.notes}</div>
          </div>
        )}

        {/* Позиции реализации */}
        <div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">№</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ТОВАР</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">АРТИКУЛ</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">БРЕНД</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">КАТЕГОРИЯ</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">РАЗМЕР</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ЦВЕТ</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-800 uppercase tracking-wider">КОЛ-ВО</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {realization.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.product_name}</td>
                    <td className="px-3 py-2 text-sm font-mono text-gray-900">{item.article}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.brand_name}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.category_name}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.size_name}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.color_name}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-center">{Number(item.qty) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Итоги */}
          <div className="mt-4 flex justify-end space-x-8 text-sm">
            <div>
              <span className="text-gray-500">Общее количество: </span>
              <span className="font-medium">
                {realization.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)} шт.
              </span>
            </div>
          </div>
        </div>

        {/* Информация для печати */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex justify-between">
            <div>Дата создания: {formatDate(realization.created_at)}</div>
            <div>Система Logush</div>
          </div>
        </div>
      </div>

      <style jsx>{`
      `}</style>
    </div>
  );
};

export default RealizationDetailPage; 