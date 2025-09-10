import React, { useState, useEffect } from 'react';
import { PlusIcon, BellIcon } from '@heroicons/react/24/outline';
import { useToast } from '../ToastContext';
import Paginator from '../Paginator';

interface TaskStatus {
  id: number;
  code: string;
  display_name: string;
  sort_order: number;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: number;
  assignee_name?: string;
  created_at: string;
}

interface TaskManagerProps {
  userRole: string;
  onTaskClick?: (task: Task) => void;
}

export default function TaskManager({ userRole, onTaskClick }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskTab, setTaskTab] = useState<'current' | 'closed' | 'created'>('current');
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [taskLimit, setTaskLimit] = useState(5);
  const [unreadCount, setUnreadCount] = useState(0);
  const { showToast } = useToast();

  // Модальное окно создания задачи
  const [users, setUsers] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [assigneeSelect, setAssigneeSelect] = useState<number>(0);
  const [assignees, setAssignees] = useState<number[]>([]);

  const [creating, setCreating] = useState(false);

  // Загрузка задач
  const loadTasks = async () => {
    setTasksLoading(true);
    try {
      const params = new URLSearchParams({
        page: taskPage.toString(),
        limit: taskLimit.toString(),
        status: taskTab === 'current' ? 'current' : taskTab === 'closed' ? 'closed' : 'created'
      });
      
      const response = await fetch(`/api/tasks?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  // Загрузка статусов задач
  const loadTaskStatuses = async () => {
    try {
      const response = await fetch('/api/tasks/statuses');
      const data = await response.json();
      if (response.ok) {
        setTaskStatuses(data.statuses || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки статусов задач:', error);
    }
  };

  // Загрузка пользователей для назначения
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users?limit=1000');
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  // Обновление счетчика непрочитанных задач
  const updateUnreadCount = async () => {
    try {
      const response = await fetch('/api/tasks?status=new&limit=1000');
      const data = await response.json();
      if (response.ok) {
        setUnreadCount(data.tasks?.length || 0);
      }
    } catch (error) {
      console.error('Ошибка обновления счетчика задач:', error);
    }
  };

  // Создание новой задачи
  const createTask = async () => {
    if (!description.trim() || assignees.length === 0) {
      showToast('Заполните описание и выберите исполнителей', 'error');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Новое задание',
          description: description.trim(),
          assignee_ids: assignees,
  
        })
      });

      const data = await response.json();
      if (response.ok) {
        showToast('Задание создано успешно', 'success');
        setShowTaskModal(false);
        setDescription('');
        setAssignees([]);

        loadTasks();
        updateUnreadCount();
      } else {
        throw new Error(data.error || 'Ошибка создания задания');
      }
    } catch (error: any) {
      showToast(error.message || 'Ошибка создания задания', 'error');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadTasks();
    loadTaskStatuses();
    loadUsers();
    updateUnreadCount();

    // Обновление счетчика каждые 30 секунд
    const interval = setInterval(updateUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [taskTab, taskPage, taskLimit]);

  const getStatusDisplayName = (statusCode: string) => {
    const status = taskStatuses.find(s => s.code === statusCode);
    return status?.display_name || statusCode;
  };

  const filteredTasks = tasks.filter(task => {
    if (taskTab === 'current') {
      return !['completed', 'done'].includes(task.status);
    } else if (taskTab === 'closed') {
      return ['completed', 'done'].includes(task.status);
    }
    return true;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Задания</h2>
          <button
            onClick={() => setShowTaskModal(true)}
            className="btn flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Создать задание
          </button>
        </div>
        
        {/* Уведомления */}
        <div className="relative">
          <button
            onClick={() => window.location.href = '/tasks'}
            className="relative p-2 text-gray-600 hover:text-gray-900"
          >
            <BellIcon className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Табы */}
      <div className="flex space-x-1 mb-4">
        <button
          onClick={() => setTaskTab('current')}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            taskTab === 'current'
              ? 'bg-gray-800 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Текущие
        </button>
        <button
          onClick={() => setTaskTab('closed')}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            taskTab === 'closed'
              ? 'bg-gray-800 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Выполненные
        </button>
        {userRole === 'admin' && (
          <button
            onClick={() => setTaskTab('created')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              taskTab === 'created'
                ? 'bg-gray-800 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Созданные мной
          </button>
        )}
      </div>

      {/* Список задач */}
      <div className="space-y-3">
        {tasksLoading ? (
          <div className="text-center py-4">Загрузка...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {taskTab === 'current' ? 'Нет текущих заданий' : 
             taskTab === 'closed' ? 'Нет выполненных заданий' : 
             'Нет созданных заданий'}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => onTaskClick?.(task)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{task.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Статус: {getStatusDisplayName(task.status)}</span>
                    <span>Приоритет: {task.priority}</span>
                    {task.assignee_name && <span>Исполнитель: {task.assignee_name}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Пагинация */}
      {filteredTasks.length > 0 && (
        <div className="mt-4">
          <Paginator
            total={filteredTasks.length}
            page={taskPage}
            limit={taskLimit}
            onPageChange={setTaskPage}
          />
        </div>
      )}

      {/* Модальное окно создания задачи */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Создать задание</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  rows={3}
                  placeholder="Опишите задание..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Исполнители *
                </label>
                <select
                  value={assigneeSelect}
                  onChange={(e) => {
                    const userId = Number(e.target.value);
                    if (userId && !assignees.includes(userId)) {
                      setAssignees([...assignees, userId]);
                    }
                    setAssigneeSelect(0);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value={0}>Выберите исполнителя</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
                
                {assignees.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {assignees.map((userId) => {
                      const user = users.find(u => u.id === userId);
                      return (
                        <span
                          key={userId}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                        >
                          {user ? `${user.first_name} ${user.last_name}` : userId}
                          <button
                            onClick={() => setAssignees(assignees.filter(id => id !== userId))}
                            className="ml-1 text-gray-500 hover:text-gray-700"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>


            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTaskModal(false)}
                className="btn"
                disabled={creating}
              >
                Отмена
              </button>
              <button
                onClick={createTask}
                className="btn"
                disabled={creating}
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
