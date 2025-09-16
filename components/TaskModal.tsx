import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface TaskModalProps {
  task: {
    id: number;
    description: string;
    status: string;
    author_id: number;
    assignee_id: number;
    created_at: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

export default function TaskModal({ task, isOpen, onClose, onStatusChange }: TaskModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [currentStatus, setCurrentStatus] = useState(task?.status || '');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setCurrentStatus(task.status);
      setComment('');
      
      // Автоматически обновляем статус при открытии модального окна
      if (task.status === 'new') {
        handleAutoStatusUpdate();
      }
    }
  }, [task]);

  const handleAutoStatusUpdate = async () => {
    if (!task || task.status !== 'new') return;
    
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '0'
        }
      });

      if (res.ok) {
        const updatedTask = await res.json();
        setCurrentStatus(updatedTask.status);
        // Обновляем родительский компонент
        onStatusChange?.();
      }
    } catch (error) {
      console.error('Ошибка автоматического обновления статуса:', error);
    }
  };

  const handleStatusChange = async () => {
    if (!task) return;
    
    // Упрощенная логика: новый -> просмотрено -> завершено
    let next = 'new';
    if (currentStatus === 'new') next = 'viewed';
    else if (currentStatus === 'viewed') next = 'done';
    else if (currentStatus === 'done') next = 'viewed'; // Откат к просмотрено
    else next = 'done';
    
    // Проверяем обязательный комментарий (кроме перехода на "просмотренно")
    if (next !== 'viewed' && !comment.trim()) {
      showToast('Добавьте комментарий при смене статуса', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      const updateData: any = { status: next };
      
      if (comment.trim()) {
        updateData.description = comment;
      }
      
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        setCurrentStatus(next);
        showToast('Статус обновлён', 'success');
        onStatusChange?.();
        onClose();
      } else {
        const data = await res.json();
        showToast(data.error || 'Ошибка обновления', 'error');
      }
    } catch (error) {
      showToast('Ошибка сети', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  // Извлекаем ID товара из описания
  const productIdMatch = task.description.match(/ID: (\d+)/);
  const productId = productIdMatch ? productIdMatch[1] : null;
  const descriptionWithoutId = productId 
    ? task.description.replace(/\(ID: \d+\)/, '').trim()
    : task.description;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Задание #{task.id}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-sm">
          {/* Статус */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Статус:</span>
            {(() => {
              const statusMap: { [key: string]: { text: string, color: string } } = {
                new: { text: 'новый', color: 'bg-green-100 text-green-800' },
                viewed: { text: 'просмотренно', color: 'bg-orange-100 text-orange-800' },
                done: { text: 'завершено', color: 'bg-gray-200 text-gray-800' }
              };
              const status = statusMap[currentStatus] || { text: currentStatus, color: 'bg-gray-100 text-gray-800' };
              return (
                <span className={`text-xs rounded-full px-2 py-1 ${status.color}`}>
                  {status.text}
                </span>
              );
            })()}
          </div>

          {/* Дата создания */}
          <div>
            <span className="font-medium">Создано:</span>
            <span className="ml-2">
              {new Date(task.created_at).toLocaleString('ru-RU')}
            </span>
          </div>

          {/* Описание */}
          <div>
            <span className="font-medium">Описание:</span>
            <p className="mt-1 text-gray-700">
              {descriptionWithoutId}
              {productId && (
                <>
                  <br />
                  <button 
                    onClick={() => {
                      window.open(`/products/${productId}`, '_blank');
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono mt-2"
                  >
                    <span>Открыть</span>
                    <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Автор и исполнитель */}
          <div>
            <span className="font-medium">Автор:</span>
            <span className="ml-2">Система</span>
          </div>
          <div>
            <span className="font-medium">Исполнитель:</span>
            <span className="ml-2">Бренд-менеджер товара</span>
          </div>

          {/* Комментарий */}
          <div>
            <label className="block font-medium mb-1">
              Комментарий:
              {currentStatus !== 'done' && (
                <span className="text-xs text-gray-500 ml-2">
                  {currentStatus === 'new' ? '(необязательно)' : ''}
                </span>
              )}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={currentStatus === 'new' ? "Добавить комментарий..." : "Обязательно добавьте комментарий..."}
              className="w-full border rounded p-2 text-sm resize-none"
              rows={3}
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-2 pt-2">
            {(user?.id === task.assignee_id || user?.id === task.author_id) && (
              <button
                onClick={handleStatusChange}
                disabled={isLoading}
                className="btn text-xs flex-1"
              >
                {isLoading ? 'Обновление...' : 
                  currentStatus === 'new' ? 'Просмотренно' :
                  currentStatus === 'viewed' ? 'Завершить' :
                  currentStatus === 'done' ? 'Отметить как просмотренно' : 'Обновить'}
              </button>
            )}
            <button
              onClick={onClose}
              className="btn text-xs flex-1"
            >
              Закрыть
            </button>
          </div>

          {user?.id !== task.assignee_id && user?.id !== task.author_id && (
            <div className="text-xs text-gray-500 text-center">
              Только исполнитель или автор могут изменять статус задачи
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
