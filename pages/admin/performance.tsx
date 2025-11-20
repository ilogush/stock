import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useAuth } from '../../components/AuthContext';
import { useToast } from '../../components/ToastContext';
import Layout from '../../components/Layout';

interface PerformanceStats {
  timestamp: string;
  timeWindow: number;
  performance: {
    avgResponseTime: number;
    totalRequests: number;
    errorRate: number;
    cacheHitRate: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>;
    errorEndpoints: Array<{ endpoint: string; errorCount: number; errorRate: number }>;
  };
  system: {
    currentMemory: number;
    avgMemory: number;
    currentCpu: number;
    avgCpu: number;
    cacheStats: {
      hits: number;
      misses: number;
      size: number;
      hitRate: number;
    };
    databaseStats: {
      activeConnections: number;
      slowQueries: number;
      avgQueryTime: number;
    };
  } | null;
  alerts: {
    slowEndpoints: any[];
    errorEndpoints: any[];
    recommendations: string[];
  };
  summary: {
    status: 'healthy' | 'warning' | 'critical';
    healthScore: number;
    uptime: number;
  };
}

const PerformanceDashboard: NextPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeWindow, setTimeWindow] = useState(300000); // 5 минут

  // Проверяем права доступа
  useEffect(() => {
    if (user && user.role_id !== 1) { // Только администраторы
      showToast('У вас нет прав для доступа к этой странице', 'error');
      window.location.href = '/';
    }
  }, [user, showToast]);

  // Загружаем статистику
  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/admin/performance-stats?timeWindow=${timeWindow}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        showToast('Ошибка загрузки статистики', 'error');
      }
    } catch (error) {
      showToast('Ошибка подключения к серверу', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Автообновление
  useEffect(() => {
    fetchStats();
    
    if (autoRefresh) {
      const interval = setInterval(fetchStats, 30000); // Каждые 30 секунд
      return () => clearInterval(interval);
    }
  }, [timeWindow, autoRefresh]);

  // Очистка метрик
  const cleanupMetrics = async () => {
    try {
      const response = await fetch('/api/admin/performance-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' })
      });
      
      if (response.ok) {
        showToast('Старые метрики очищены', 'success');
        fetchStats();
      } else {
        showToast('Ошибка очистки метрик', 'error');
      }
    } catch (error) {
      showToast('Ошибка очистки метрик', 'error');
    }
  };

  // Форматирование времени
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}д ${hours}ч ${minutes}м`;
  };

  // Получение цвета статуса
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-500">Загрузка статистики производительности...</div>
        </div>
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-red-500">Ошибка загрузки статистики</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Заголовок */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Мониторинг производительности</h1>
                <p className="text-gray-600 mt-2">
                  Статистика системы • Обновлено: {new Date(stats.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="flex space-x-4">
                <select
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                >
                  <option value={60000}>1 минута</option>
                  <option value={300000}>5 минут</option>
                  <option value={900000}>15 минут</option>
                  <option value={3600000}>1 час</option>
                </select>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-4 py-2 rounded-md ${
                    autoRefresh 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {autoRefresh ? 'Автообновление: ВКЛ' : 'Автообновление: ВЫКЛ'}
                </button>
                <button
                  onClick={cleanupMetrics}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Очистить метрики
                </button>
              </div>
            </div>
          </div>

          {/* Общий статус */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(stats.summary.status)}`}>
                  {stats.summary.status === 'healthy' ? 'Здорово' : 
                   stats.summary.status === 'warning' ? 'Предупреждение' : 'Критично'}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-gray-900">{stats.summary.healthScore}</div>
                <div className="text-sm text-gray-600">Балл здоровья</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">
                {stats.performance.avgResponseTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600">Среднее время ответа</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">
                {stats.performance.cacheHitRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Попадания в кэш</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">
                {formatUptime(stats.summary.uptime)}
              </div>
              <div className="text-sm text-gray-600">Время работы</div>
            </div>
          </div>

          {/* Детальная статистика */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Производительность */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Производительность</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Всего запросов:</span>
                  <span className="font-medium">{stats.performance.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Процент ошибок:</span>
                  <span className={`font-medium ${stats.performance.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.performance.errorRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Попадания в кэш:</span>
                  <span className={`font-medium ${stats.performance.cacheHitRate > 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {stats.performance.cacheHitRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Системные ресурсы */}
            {stats.system && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Системные ресурсы</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Память:</span>
                    <span className={`font-medium ${stats.system.currentMemory > 400 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.system.currentMemory.toFixed(1)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CPU:</span>
                    <span className={`font-medium ${stats.system.currentCpu > 80 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.system.currentCpu.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Размер кэша:</span>
                    <span className="font-medium">{stats.system.cacheStats.size}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Медленные эндпоинты */}
          {stats.alerts.slowEndpoints.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Медленные эндпоинты</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Эндпоинт
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Среднее время
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Количество запросов
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.alerts.slowEndpoints.map((endpoint: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {endpoint.endpoint}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {endpoint.avgTime.toFixed(0)}ms
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {endpoint.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Рекомендации */}
          {stats.alerts.recommendations.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Рекомендации по оптимизации</h3>
              <div className="space-y-3">
                {stats.alerts.recommendations.map((recommendation: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                    </div>
                    <p className="text-sm text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PerformanceDashboard;
