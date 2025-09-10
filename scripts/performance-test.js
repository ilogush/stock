/**
 * 🧪 Автоматизированное тестирование производительности API
 * Сравнение оригинальных и оптимизированных версий
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

// Тестовые сценарии
const TEST_SCENARIOS = [
  {
    name: 'Поиск товаров',
    original: '/api/products?search=W&limit=20',
    optimized: '/api/optimized/products-search?search=W&limit=20',
    iterations: 5
  },
  {
    name: 'Список товаров с пагинацией',
    original: '/api/products?page=1&limit=50',
    optimized: '/api/optimized/products-search?page=1&limit=50',
    iterations: 5
  },
  {
    name: 'Данные склада',
    original: '/api/stock?limit=30',
    optimized: '/api/optimized/stock?limit=30',
    iterations: 3
  },
  {
    name: 'Поиск на складе',
    original: '/api/stock?search=M&limit=20',
    optimized: '/api/optimized/stock?search=M&limit=20',
    iterations: 3
  }
];

async function makeRequest(url, timeout = 10000) {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Performance-Test-Bot'
      }
    });
    
    clearTimeout(timeoutId);
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        success: false,
        duration,
        error: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status
      };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      duration,
      dataSize: JSON.stringify(data).length,
      recordCount: data.products?.length || data.items?.length || data.length || 0,
      cacheStatus: response.headers.get('X-Cache-Status') || 'MISS'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        duration,
        error: 'Timeout',
        timeout: true
      };
    }
    
    return {
      success: false,
      duration,
      error: error.message
    };
  }
}

async function runTestScenario(scenario) {
  console.log(`\n🧪 Тестирование: ${scenario.name}`);
  console.log('=' .repeat(50));
  
  const results = {
    original: [],
    optimized: []
  };
  
  // Тестируем оригинальный API
  console.log('📊 Оригинальный API...');
  for (let i = 0; i < scenario.iterations; i++) {
    const result = await makeRequest(`${BASE_URL}${scenario.original}`);
    results.original.push(result);
    
    if (result.success) {
      console.log(`  Итерация ${i + 1}: ${result.duration}ms (${result.recordCount} записей)`);
    } else {
      console.log(`  Итерация ${i + 1}: ОШИБКА - ${result.error}`);
    }
    
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Тестируем оптимизированный API
  console.log('\n🚀 Оптимизированный API...');
  for (let i = 0; i < scenario.iterations; i++) {
    const result = await makeRequest(`${BASE_URL}${scenario.optimized}`);
    results.optimized.push(result);
    
    if (result.success) {
      console.log(`  Итерация ${i + 1}: ${result.duration}ms (${result.recordCount} записей)`);
    } else {
      console.log(`  Итерация ${i + 1}: ОШИБКА - ${result.error}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

function calculateStats(results) {
  const successful = results.filter(r => r.success);
  
  if (successful.length === 0) {
    return {
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      successRate: 0,
      errorRate: 100
    };
  }
  
  const durations = successful.map(r => r.duration);
  
  return {
    avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    successRate: Math.round((successful.length / results.length) * 100),
    errorRate: Math.round(((results.length - successful.length) / results.length) * 100),
    totalRequests: results.length,
    successfulRequests: successful.length
  };
}

function printComparison(originalStats, optimizedStats, scenarioName) {
  console.log(`\n📊 РЕЗУЛЬТАТЫ: ${scenarioName}`);
  console.log('=' .repeat(60));
  
  console.log('                    Оригинальный  |  Оптимизированный');
  console.log('-' .repeat(60));
  console.log(`Среднее время:      ${originalStats.avgDuration}ms        |  ${optimizedStats.avgDuration}ms`);
  console.log(`Мин. время:         ${originalStats.minDuration}ms        |  ${optimizedStats.minDuration}ms`);
  console.log(`Макс. время:        ${originalStats.maxDuration}ms        |  ${optimizedStats.maxDuration}ms`);
  console.log(`Успешных запросов:  ${originalStats.successRate}%         |  ${optimizedStats.successRate}%`);
  
  if (originalStats.avgDuration > 0 && optimizedStats.avgDuration > 0) {
    const improvement = ((originalStats.avgDuration - optimizedStats.avgDuration) / originalStats.avgDuration * 100);
    if (improvement > 0) {
      console.log(`\n✅ УЛУЧШЕНИЕ: ${improvement.toFixed(1)}% быстрее`);
    } else {
      console.log(`\n⚠️  УХУДШЕНИЕ: ${Math.abs(improvement).toFixed(1)}% медленнее`);
    }
  }
}

async function runAllTests() {
  console.log('🚀 ЗАПУСК ТЕСТОВ ПРОИЗВОДИТЕЛЬНОСТИ');
  console.log('🕐 Время начала:', new Date().toLocaleString());
  console.log('🌐 Базовый URL:', BASE_URL);
  
  const allResults = [];
  
  for (const scenario of TEST_SCENARIOS) {
    try {
      const results = await runTestScenario(scenario);
      
      const originalStats = calculateStats(results.original);
      const optimizedStats = calculateStats(results.optimized);
      
      printComparison(originalStats, optimizedStats, scenario.name);
      
      allResults.push({
        scenario: scenario.name,
        original: originalStats,
        optimized: optimizedStats
      });
      
    } catch (error) {
      console.error(`❌ Ошибка тестирования ${scenario.name}:`, error.message);
    }
  }
  
  // Общая статистика
  console.log('\n' + '=' .repeat(60));
  console.log('📈 ОБЩИЕ РЕЗУЛЬТАТЫ');
  console.log('=' .repeat(60));
  
  let totalImprovement = 0;
  let validComparisons = 0;
  
  allResults.forEach(result => {
    if (result.original.avgDuration > 0 && result.optimized.avgDuration > 0) {
      const improvement = ((result.original.avgDuration - result.optimized.avgDuration) / result.original.avgDuration * 100);
      totalImprovement += improvement;
      validComparisons++;
      
      console.log(`${result.scenario}: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
    }
  });
  
  if (validComparisons > 0) {
    const avgImprovement = totalImprovement / validComparisons;
    console.log(`\n🎯 СРЕДНИЙ ПРИРОСТ ПРОИЗВОДИТЕЛЬНОСТИ: ${avgImprovement > 0 ? '+' : ''}${avgImprovement.toFixed(1)}%`);
  }
  
  console.log('\n✨ Тестирование завершено!');
  console.log('🕐 Время окончания:', new Date().toLocaleString());
}

// Проверяем доступность сервера
async function checkServerHealth() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/version`);
    if (response.success) {
      console.log('✅ Сервер доступен');
      return true;
    } else {
      console.log('❌ Сервер недоступен:', response.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка подключения к серверу:', error.message);
    return false;
  }
}

async function main() {
  const serverReady = await checkServerHealth();
  
  if (!serverReady) {
    console.log('\n💡 Убедитесь, что сервер запущен: npm run dev');
    process.exit(1);
  }
  
  await runAllTests();
}

main().catch(console.error);
