import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../components/ToastContext';
import { translateSupabaseError } from '../../lib/supabaseErrorTranslations';

interface ReceiptItem {
  id: string;
  product_id: string;
  size_code: string;
  color_id: number;
  qty: number;
  price: number;
  product?: {
    name: string;
    article: string;
    brand?: { name: string };
  };
  size?: { name: string };
  color?: { name: string };
}

interface Receipt {
  id: string;
  receipt_number: string;
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

  const totalItems = receipt.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <>
      <style jsx>{`
      `}</style>
      
      <div className="print-hide">
        <PageHeader 
        title={`Поступление ${receipt.receipt_number}`}
        showBackButton={true}
        backHref="/receipts"
      >
        <button
          onClick={() => window.print()}
                                className="btn text-xs flex items-center"
          title="Печать"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" 
            />
          </svg>
        </button>
      </PageHeader>
      </div>

      {/* Контент для экрана */}
      <div className="print-hide">
        {/* Информация о поступлении */}
        <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Дата поступления</label>
            <div className="mt-1 text-sm text-gray-900">
              {new Date(receipt.received_at).toLocaleDateString('ru-RU')}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Принято от</label>
            <div className="mt-1 text-sm text-gray-900">{receipt.transferrer_name || 'Неизвестно'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Принял</label>
            <div className="mt-1 text-sm text-gray-900">{receipt.creator_name || 'Неизвестно'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Примечания</label>
            <div className="mt-1 text-sm text-gray-900">{receipt.notes || '-'}</div>
          </div>
        </div>
      </div>
      </div>

      {/* Информация для печати */}
      <div className="print-info">
        <div className="print-header">
          ТОВАРНАЯ НАКЛАДНАЯ №{receipt.receipt_number}
        </div>
        <div className="print-receipt-info">
          <div className="print-info-row">
            <span className="print-label">Дата:</span>
            <span className="print-value">{new Date(receipt.received_at).toLocaleDateString('ru-RU')}</span>
          </div>
          <div className="print-info-row">
            <span className="print-label">Сдал:</span>
            <span className="print-value">{receipt.transferrer_name || 'Неизвестно'}</span>
          </div>
          <div className="print-info-row">
            <span className="print-label">Принял:</span>
            <span className="print-value">{receipt.creator_name || 'Неизвестно'}</span>
          </div>
          {receipt.notes && (
            <div className="print-info-row">
              <span className="print-label">Примечания:</span>
              <span className="print-value">{receipt.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Таблица товаров - видна всегда */}
      <div className="bg-white rounded-lg border print-container">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 print-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  №
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Наименование товара
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Артикул
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Размер
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Цвет
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Кол-во
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {receipt.items.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-1 whitespace-nowrap text-sm text-gray-900 text-center">
                    {index + 1}
                  </td>
                  <td className="p-1 whitespace-nowrap text-sm text-gray-900">
                    {item.product?.brand?.name ? `${item.product.brand.name} - ` : ''}{item.product?.name || 'Неизвестно'}
                  </td>
                  <td className="p-1 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {item.product?.article || '-'}
                  </td>
                  <td className="p-1 whitespace-nowrap text-sm text-gray-900">
                    {item.size_code}
                  </td>
                  <td className="p-1 whitespace-nowrap text-sm text-gray-900">
                    {item.color?.name || item.color_id}
                  </td>
                  <td className="p-1 whitespace-nowrap text-sm text-gray-900 font-semibold text-center">
                    {item.qty}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={5} className="px-6 py-3 text-right text-sm text-gray-700">
                  Итого:
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  {totalItems} шт.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
};

export default ReceiptDetailPage; 