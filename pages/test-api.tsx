import { useEffect, useState } from 'react';

export default function TestApiPage() {
  const [receiptsData, setReceiptsData] = useState<any>(null);
  const [realizationData, setRealizationData] = useState<any>(null);
  const [envData, setEnvData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testApis = async () => {
      try {
        console.log('🧪 Тестирование API...');
        
        // Тест переменных окружения
        const envResponse = await fetch('/api/debug/env');
        const envResult = await envResponse.json();
        console.log('🔧 Переменные окружения:', envResult);
        setEnvData(envResult);
        
        // Тест API поступлений
        const receiptsResponse = await fetch('/api/receipts');
        const receiptsResult = await receiptsResponse.json();
        console.log('📦 API поступлений:', receiptsResult);
        setReceiptsData(receiptsResult);
        
        // Тест API реализаций
        const realizationResponse = await fetch('/api/realization');
        const realizationResult = await realizationResponse.json();
        console.log('📤 API реализаций:', realizationResult);
        setRealizationData(realizationResult);
        
      } catch (error) {
        console.error('❌ Ошибка тестирования API:', error);
      } finally {
        setLoading(false);
      }
    };

    testApis();
  }, []);

  if (loading) {
    return <div className="p-4">Тестирование API...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Тест API</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">Переменные окружения</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(envData, null, 2)}
          </pre>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">API Поступлений</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(receiptsData, null, 2)}
          </pre>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">API Реализаций</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(realizationData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
