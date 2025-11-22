import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../components/ToastContext';
import { translateSupabaseError } from '../../lib/supabaseErrorTranslations';
import { PrinterIcon } from '@heroicons/react/24/outline';

interface ReceiptItem {
  id: string | number;
  product_id: string | number;
  size_code: string;
  color_id: number;
  qty: number;
  price?: number;
  product?: {
    name: string;
    article: string;
    brand?: { name: string };
  };
  size?: { name: string };
  color?: { name: string };
  color_name?: string;
}

interface Receipt {
  id: string;
  received_at: string;
  notes?: string;
  transferrer_name?: string;
  creator_name?: string;
  items: ReceiptItem[];
}

const ReceiptDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchReceipt = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/receipts/${id}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        setReceipt(data.receipt);
      } catch (error: any) {
        showToast(translateSupabaseError(error), 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [id, showToast]);

  if (loading) {
    return (
      <div>
        <PageHeader 
          title="Загрузка"
          showBackButton={true}
          backHref="/receipts"
        />
        <div className="text-center p-8">Загрузка поступления...</div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div>
        <PageHeader 
          title="Поступление не найдено"
          showBackButton={true}
          backHref="/receipts"
        />
        <div className="text-center p-8">Поступление не найдено</div>
      </div>
    );
  }

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

  const totalItems = receipt.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <PageHeader
          title="Поступление"
          showBackButton
          backHref="/receipts"
        />
        <button
          onClick={printDocument}
          className="btn text-xs flex items-center justify-center hover:bg-gray-800 hover:text-white no-print"
          aria-label="Печать"
          title="Печать"
        >
          <PrinterIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-6 print:space-y-4">
        {/* Информация о поступлении */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-500">Номер поступления:</span>
            <div className="font-medium">{receipt.id}</div>
          </div>
          
          <div>
            <span className="text-sm text-gray-500">Дата поступления:</span>
            <div className="font-medium">{formatDate(receipt.received_at)}</div>
          </div>
          
          <div>
            <span className="text-sm text-gray-500">Принято от:</span>
            <div className="font-medium">{receipt.transferrer_name || 'Не указан'}</div>
          </div>
          
          <div>
            <span className="text-sm text-gray-500">Принял:</span>
            <div className="font-medium">{receipt.creator_name || 'Не указан'}</div>
          </div>
        </div>

        {/* Примечания */}
        {receipt.notes && (
          <div>
            <span className="text-sm text-gray-500">Примечания:</span>
            <div className="mt-1 p-2 bg-gray-50 rounded text-sm">{receipt.notes}</div>
          </div>
        )}

        {/* Позиции поступления */}
        <div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">№</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ТОВАР</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">АРТИКУЛ</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">БРЕНД</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">РАЗМЕР</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ЦВЕТ</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-800 uppercase tracking-wider">КОЛ-ВО</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {receipt.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.product?.name || 'Неизвестно'}</td>
                    <td className="px-3 py-2 text-sm font-mono text-gray-900">
                      {item.product?.article && /^[0-9]+$/.test(item.product.article) 
                        ? `L${item.product.article}` 
                        : (item.product?.article || '-')}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.product?.brand?.name || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.size_code}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.color_name || '—'}</td>
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
                {totalItems} шт.
              </span>
            </div>
          </div>
        </div>

        {/* Информация для печати */}
        <div className="hidden print:hidden mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 no-print">
          <div className="flex justify-between">
            <div>Дата создания: {formatDate(receipt.received_at)}</div>
            <div>Система Logush</div>
          </div>
        </div>
      </div>

      <style jsx>{`
      `}</style>
    </div>
  );
};

export default ReceiptDetailPage; 