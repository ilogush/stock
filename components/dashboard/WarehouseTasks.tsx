import React, { useState, useEffect } from 'react';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';

interface StockTask {
  id: number;
  task_number: string;
  title: string;
  date: string;
  position: 'фурнитура' | 'материал';
  quantity: number;
  status: string;
  brand?: string;
  article?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface StockTasksProps {
  userRole: string;
  onTaskClick?: (task: StockTask) => void;
}

export default function StockTasks({ userRole, onTaskClick }: StockTasksProps) {
  const [tasks, setTasks] = useState<StockTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stock/tasks?page=${page}&limit=${limit}`);
      const data = await response.json();
      
      if (response.ok) {
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки stock задач:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [page, limit]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'новый':
        return 'bg-blue-100 text-blue-800';
      case 'в работе':
        return 'bg-yellow-100 text-yellow-800';
      case 'завершен':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPositionColor = (position: string) => {
    return position === 'фурнитура' 
      ? 'bg-purple-100 text-purple-800' 
      : 'bg-orange-100 text-orange-800';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ArchiveBoxIcon className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Stock Tasks</h2>
      </div>

      {loading ? (
        <div className="text-center py-4">Загрузка...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          Нет активных задач stock
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => onTaskClick?.(task)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    <span className="text-xs text-gray-500">#{task.task_number}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                    <span>Дата: {new Date(task.date).toLocaleDateString('ru-RU')}</span>
                    <span>Количество: {task.quantity}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPositionColor(task.position)}`}>
                      {task.position}
                    </span>
                    {task.brand && (
                      <span className="text-xs text-gray-500">
                        Бренд: {task.brand}
                      </span>
                    )}
                    {task.article && (
                      <span className="text-xs text-gray-500">
                        Артикул: {task.article}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => window.location.href = '/stock/tasks'}
            className="btn text-sm"
          >
            Посмотреть все задачи
          </button>
        </div>
      )}
    </div>
  );
}
