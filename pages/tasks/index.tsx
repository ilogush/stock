import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '../../components/ToastContext';
import { useUserRole } from '../../lib/hooks/useUserRole';
import PageHeader from '../../components/PageHeader';
interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: number | null;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  done: 'bg-green-100 text-green-800'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-orange-100 text-orange-800',
  high: 'bg-red-100 text-red-800'
};

const statusLabels = {
  new: 'Новая',
  in_progress: 'В работе',
  completed: 'Завершена',
  done: 'Выполнена'
};

const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий'
};

export default function TasksPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { hasAnyRole, loading: roleLoading } = useUserRole();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');

  // Проверка прав доступа
  const isAllowed = hasAnyRole(['admin', 'director', 'manager', 'brigadir']);

  useEffect(() => {
    loadTasks();
  }, []);
  
  if (!isAllowed && !roleLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Доступ запрещён</div>
          <div className="text-gray-600">У вас нет прав для просмотра задач</div>
        </div>
      </div>
    );
  }

  if (roleLoading) {
    return <div className="text-gray-500">Загрузка...</div>;
  }

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else {
        showToast('Ошибка загрузки задач', 'error');
      }
    } catch (error) {
      showToast('Ошибка загрузки задач', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'current') {
      return task.status !== 'completed' && task.status !== 'done';
    } else if (activeTab === 'completed') {
      return task.status === 'completed' || task.status === 'done';
    }
    return true;
  });

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        showToast('Статус задачи обновлен', 'success');
        loadTasks();
      } else {
        showToast('Ошибка обновления статуса', 'error');
      }
    } catch (error) {
      showToast('Ошибка обновления статуса', 'error');
    }
  };

  if (loading) {
    return <div className="text-gray-500">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Задачи" 
        action={{
          label: "+ Создать задачу",
          onClick: () => router.push('/tasks/new')
        }}
      />

      {/* Табы */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('current')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'current'
                ? 'border-gray-500 text-gray-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            текущие ({tasks.filter(t => t.status !== 'completed' && t.status !== 'done').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-gray-500 text-gray-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            выполненные ({tasks.filter(t => t.status === 'completed' || t.status === 'done').length})
          </button>
        </nav>
      </div>

      {/* Таблица задач */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Приоритет
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Исполнитель
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {task.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{task.title}</div>
                  <div className="text-sm text-gray-500">{task.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[task.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                    {statusLabels[task.status as keyof typeof statusLabels] || task.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityColors[task.priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'}`}>
                    {priorityLabels[task.priority as keyof typeof priorityLabels] || task.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {task.assignee ? `${task.assignee.first_name} ${task.assignee.last_name}` : 'Не назначен'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="btn"
                  >
                    просмотр
                  </button>
                  {task.status !== 'completed' && task.status !== 'done' && (
                    <button
                      onClick={() => handleStatusChange(task.id, 'completed')}
                      className="btn"
                    >
                      завершить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">Нет задач для отображения</div>
        </div>
      )}
    </div>
  );
}
