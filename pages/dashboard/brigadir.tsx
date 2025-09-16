import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';

interface ProductionReceipt {
  id: string;
  produced_at: string;
  total_earnings: number;
  total_weight: number;
  items: {
    qty: number;
    product: {
      name: string;
    };
  }[];
}

export default function BrigadirDashboard() {
  const [todayReceipts, setTodayReceipts] = useState<ProductionReceipt[]>([]);
  const [weekReceipts, setWeekReceipts] = useState<ProductionReceipt[]>([]);
  const [monthReceipts, setMonthReceipts] = useState<ProductionReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Автообновление при возврате на страницу
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboardData();
      }
    };

    const handleFocus = () => {
      loadDashboardData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [todayRes, weekRes, monthRes] = await Promise.all([
        fetch(`/api/production?produced_by=current-user-id&date_from=${today}&limit=1000`),
        fetch(`/api/production?produced_by=current-user-id&date_from=${weekAgo}&limit=1000`),
        fetch(`/api/production?produced_by=current-user-id&date_from=${monthAgo}&limit=1000`)
      ]);

      const todayData = await todayRes.json();
      const weekData = await weekRes.json();
      const monthData = await monthRes.json();

      if (todayData.receipts) setTodayReceipts(todayData.receipts);
      if (weekData.receipts) setWeekReceipts(weekData.receipts);
      if (monthData.receipts) setMonthReceipts(monthData.receipts);

    } catch (error) {
      console.error('Ошибка загрузки данных дашборда:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (receipts: ProductionReceipt[]) => {
    const totalItems = receipts.reduce((sum, receipt) => 
      sum + receipt.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0
    );
    const totalEarnings = receipts.reduce((sum, receipt) => sum + receipt.total_earnings, 0);
    const totalWeight = receipts.reduce((sum, receipt) => sum + receipt.total_weight, 0);

    return { totalItems, totalEarnings, totalWeight };
  };

  const todayStats = calculateStats(todayReceipts);
  const weekStats = calculateStats(weekReceipts);
  const monthStats = calculateStats(monthReceipts);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Дашборд бригадира"
        showBackButton
      />
      
      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6">
          <h3 className="text-lg text-gray-700 mb-4">Сегодня</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-2xl">📅</span>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{todayStats.totalItems}</p>
                <p className="text-sm text-gray-500">{todayStats.totalWeight.toFixed(1)} кг • {todayStats.totalEarnings.toFixed(0)} ₽</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg text-gray-700 mb-4">За неделю</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-2xl">📈</span>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{weekStats.totalItems}</p>
                <p className="text-sm text-gray-500">{weekStats.totalWeight.toFixed(1)} кг • {weekStats.totalEarnings.toFixed(0)} ₽</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg text-gray-700 mb-4">За месяц</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-2xl">🏆</span>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{monthStats.totalItems}</p>
                <p className="text-sm text-gray-500">{monthStats.totalWeight.toFixed(1)} кг • {monthStats.totalEarnings.toFixed(0)} ₽</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Последние поступления */}
      <div className="">
        <div className="p-6">
          <h3 className="text-lg text-gray-700 mb-4">Последние поступления</h3>
          
          {todayReceipts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Поступления не найдены</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Номер
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Единиц произведено
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Общий вес
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Заработок
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Принял кладовщик
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayReceipts.slice(0, 10).map((receipt) => (
                    <tr key={receipt.id}>
                      <td className="p-1 whitespace-nowrap text-sm text-gray-700">
                        {receipt.id}
                      </td>
                      <td className="p-1 whitespace-nowrap text-sm text-gray-500">
                        {receipt.items.reduce((sum, item) => sum + item.qty, 0)}
                      </td>
                      <td className="p-1 whitespace-nowrap text-sm text-gray-500">
                        {receipt.total_weight.toFixed(1)} кг
                      </td>
                      <td className="p-1 whitespace-nowrap text-sm text-gray-500">
                        {receipt.total_earnings.toFixed(0)} ₽
                      </td>
                      <td className="p-1 whitespace-nowrap text-sm text-gray-500">
                        {/* Здесь должно быть имя кладовщика */}
                        -
                      </td>
                      <td className="p-1 whitespace-nowrap text-sm text-gray-500">
                        {new Date(receipt.produced_at).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Информационные блоки */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6">
          <h3 className="text-lg text-gray-700 mb-4">💰 Как рассчитывается заработок</h3>
          <p className="text-sm text-gray-600">
            Ваш заработок рассчитывается по сдельной системе. 
            За каждую единицу товара вы получаете расценку, 
            установленную администрацией. Сумма 
            автоматически рассчитывается при принятии товара кладовщиком.
          </p>
        </div>

        <div className="p-6">
          <h3 className="text-lg text-gray-700 mb-4">📞 Контакты</h3>
          <p className="text-sm text-gray-600">
            По вопросам расценок и оплаты обращайтесь к 
            заведующему производством или в бухгалтерию. Все 
            производственные поступления фиксируются в 
            системе для прозрачного учета.
          </p>
        </div>
      </div>
    </div>
  );
} 