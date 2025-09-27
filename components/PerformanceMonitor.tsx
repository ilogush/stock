import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  memory: {
    used: number;
    total: number;
    limit: number;
  };
  timing: {
    navigationStart: number;
    loadEventEnd: number;
    domContentLoaded: number;
  };
  resources: {
    total: number;
    size: number;
  };
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        const perf = window.performance;
        const memory = (performance as any).memory;
        const timing = perf.timing;
        const resources = perf.getEntriesByType('resource');

        setMetrics({
          memory: {
            used: memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0,
            total: memory ? Math.round(memory.totalJSHeapSize / 1024 / 1024) : 0,
            limit: memory ? Math.round(memory.jsHeapSizeLimit / 1024 / 1024) : 0,
          },
          timing: {
            navigationStart: timing.navigationStart,
            loadEventEnd: timing.loadEventEnd - timing.navigationStart,
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          },
          resources: {
            total: resources.length,
            size: Math.round(resources.reduce((acc, resource) => acc + (resource as any).transferSize, 0) / 1024),
          },
        });
      }
    };

    // Обновляем метрики каждые 5 секунд
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics();

    return () => clearInterval(interval);
  }, []);

  if (!metrics || !isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700"
        title="Показать метрики производительности"
      >
        📊
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Производительность</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Память:</span>
          <span className="font-mono">
            {metrics.memory.used}MB / {metrics.memory.total}MB
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Загрузка:</span>
          <span className="font-mono">{metrics.timing.loadEventEnd}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">DOM готов:</span>
          <span className="font-mono">{metrics.timing.domContentLoaded}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Ресурсы:</span>
          <span className="font-mono">{metrics.resources.total} ({metrics.resources.size}KB)</span>
        </div>
      </div>
    </div>
  );
}
