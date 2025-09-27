/**
 * Система мониторинга производительности
 * Отслеживает метрики Core Web Vitals и пользовательские метрики
 */

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  fmp: number; // First Meaningful Paint
}

interface UserMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  renderTime: number;
  memoryUsage: number;
  errors: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fcp: 0,
    lcp: 0,
    fid: 0,
    cls: 0,
    ttfb: 0,
    fmp: 0
  };

  private userMetrics: UserMetrics = {
    pageLoadTime: 0,
    apiResponseTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    errors: []
  };

  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initObservers();
    this.trackUserMetrics();
  }

  private initObservers() {
    // First Contentful Paint
    if ('PerformanceObserver' in window) {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries[entries.length - 1];
        this.metrics.fcp = fcp.startTime;
        this.logMetric('FCP', fcp.startTime);
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcp = entries[entries.length - 1];
        this.metrics.lcp = lcp.startTime;
        this.logMetric('LCP', lcp.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
          this.logMetric('FID', this.metrics.fid);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let cls = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        });
        this.metrics.cls = cls;
        this.logMetric('CLS', cls);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      this.observers.push(fcpObserver, lcpObserver, fidObserver, clsObserver);
    }
  }

  private trackUserMetrics() {
    // Время загрузки страницы
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.userMetrics.pageLoadTime = loadTime;
      this.logMetric('Page Load Time', loadTime);
    });

    // Использование памяти
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.userMetrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        this.logMetric('Memory Usage', this.userMetrics.memoryUsage, 'MB');
      }, 5000);
    }

    // Отслеживание ошибок
    window.addEventListener('error', (event) => {
      this.userMetrics.errors.push(event.message);
      this.logError('JavaScript Error', event.message);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.userMetrics.errors.push(event.reason);
      this.logError('Unhandled Promise Rejection', event.reason);
    });
  }

  // Отслеживание API запросов
  trackAPIRequest(url: string, startTime: number) {
    return (endTime: number) => {
      const duration = endTime - startTime;
      this.userMetrics.apiResponseTime = duration;
      this.logMetric('API Response Time', duration, 'ms', url);
    };
  }

  // Отслеживание времени рендеринга компонентов
  trackRenderTime(componentName: string, startTime: number) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    this.userMetrics.renderTime = duration;
    this.logMetric('Render Time', duration, 'ms', componentName);
  }

  private logMetric(name: string, value: number, unit = 'ms', context = '') {
    const message = `${name}: ${value.toFixed(2)}${unit}${context ? ` (${context})` : ''}`;
    
    // Логируем в консоль в development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${message}`);
    }

    // Отправляем в аналитику в production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(name, value, unit, context);
    }
  }

  private logError(type: string, message: string) {
    const errorMessage = `${type}: ${message}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ ${errorMessage}`);
    }

    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToAnalytics(type, message);
    }
  }

  private sendToAnalytics(name: string, value: number, unit: string, context: string) {
    // Отправка метрик в аналитическую систему
    try {
      fetch('/api/analytics/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          value,
          unit,
          context,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('Ошибка отправки метрик:', error);
    }
  }

  private sendErrorToAnalytics(type: string, message: string) {
    try {
      fetch('/api/analytics/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('Ошибка отправки ошибки:', error);
    }
  }

  // Получение всех метрик
  getMetrics(): PerformanceMetrics & UserMetrics {
    return { ...this.metrics, ...this.userMetrics };
  }

  // Проверка производительности
  checkPerformance(): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    // Проверяем Core Web Vitals
    if (this.metrics.fcp > 1800) {
      issues.push('FCP слишком медленный (>1.8s)');
      score -= 20;
    }

    if (this.metrics.lcp > 2500) {
      issues.push('LCP слишком медленный (>2.5s)');
      score -= 20;
    }

    if (this.metrics.fid > 100) {
      issues.push('FID слишком медленный (>100ms)');
      score -= 20;
    }

    if (this.metrics.cls > 0.1) {
      issues.push('CLS слишком высокий (>0.1)');
      score -= 20;
    }

    if (this.userMetrics.pageLoadTime > 3000) {
      issues.push('Время загрузки страницы слишком медленное (>3s)');
      score -= 10;
    }

    if (this.userMetrics.memoryUsage > 50) {
      issues.push('Высокое потребление памяти (>50MB)');
      score -= 10;
    }

    return { score: Math.max(0, score), issues };
  }

  // Очистка ресурсов
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
  }
}

export const performanceMonitor = new PerformanceMonitor();
