import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useToast } from '../../../components/ToastContext';
import PageHeader from '../../../components/PageHeader';
import {
  PrinterIcon
} from '@heroicons/react/24/outline';

interface WarehouseTask {
  id: string;
  task_number: string;
  title: string;
  date: string;
  position: string;
  quantity: number;
  status: 'новое' | 'просмотрено' | 'в работе' | 'выполнено';
  created_at: string;
  updated_at: string;
  description?: string;
  brand?: string;
  article?: string;
  created_by?: string;
}

export default function TaskDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();
  const [task, setTask] = useState<WarehouseTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (id) {
      fetchTask();
    }
  }, [id]);

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/stock/tasks/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTask(data.task);
      }
    } catch (error) {
      console.error('Ошибка загрузки задания:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/stock/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, comment: comment }),
      });

      if (response.ok) {
        const data = await response.json();
        setTask(data.task);
        
        let message = '';
        switch (newStatus) {
          case 'в работе':
            message = 'Задание взято в работу';
            break;
          case 'выполнено':
            message = 'Задание выполнено';
            break;
        }
        showToast(message, 'success');
        if(newStatus==='выполнено') {
          setTimeout(()=>router.back(), 500);
        }
      }
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      showToast('Ошибка обновления статуса', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'новое': return 'bg-red-100 text-red-800';
      case 'просмотрено': return 'bg-yellow-100 text-yellow-800';
      case 'в работе': return 'bg-blue-100 text-blue-800';
      case 'выполнено': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return status;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Загрузка</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Задание не найдено</h1>
        <button
          onClick={() => router.push('/')}
          className="text-blue-600 hover:text-blue-800"
        >
          Вернуться к списку заданий
        </button>
      </div>
    );
  }

  const renderActionButtons = () => {
    if (task.status === 'новое') {
      return (
        <button
          onClick={() => updateStatus('в работе')}
          className="btn"
        >
          Начать работу
        </button>
      );
    }
    
    if (task.status === 'просмотрено') {
      return (
        <button
          onClick={() => updateStatus('в работе')}
          className="btn"
        >
          Начать работу
        </button>
      );
    }
    
    if (task.status === 'в работе') {
      return (
        <button
          onClick={() => updateStatus('выполнено')}
          className="btn"
        >
          Выполнено
        </button>
      );
    }
    
    if (task.status === 'выполнено') {
      return (
        <div className="text-green-600 font-medium">
          ✓ Задание выполнено
        </div>
      );
    }
  };

  return (
    <>
      <PageHeader
        title={task.title}
        showBackButton
        backHref="/warehouse"
      >
        {renderActionButtons()}
        <button className="btn text-xs flex items-center gap-2">
          <PrinterIcon className="w-4 h-4" />
        </button>
      </PageHeader>

      <div className="space-y-6">
        {/* Информация о задании */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация о задании</h2>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Введите комментарий"
            className="w-full p-2 border rounded-lg"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Номер</div>
              <div className="mt-1 text-sm text-gray-900">{task.task_number}</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Статус</div>
              <div className="mt-1">
                <span className={`inline-flex p-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                  {getStatusText(task.status).toLowerCase()}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Создано</div>
              <div className="mt-1 text-sm text-gray-900">{new Date(task.created_at).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Позиция</div>
              <div className="mt-1 text-sm text-gray-900">{task.position}</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Количество</div>
              <div className="mt-1 text-sm text-gray-900">{task.quantity} шт.</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Создал</div>
              <div className="mt-1 text-sm text-gray-900">{task.created_by}</div>
            </div>
            
            {task.brand && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-500">Бренд</div>
                <div className="mt-1 text-sm text-gray-900">{task.brand}</div>
              </div>
            )}
            
            {task.article && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-500">Артикул</div>
                <div className="mt-1 text-sm text-gray-900">{task.article}</div>
              </div>
            )}
          </div>
        </div>

        {/* Описание */}
        {task.description && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Описание</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-900">{task.description}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
