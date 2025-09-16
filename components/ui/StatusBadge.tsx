import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

/**
 * Компонент для отображения статусов
 * Унифицирует отображение статусов во всем приложении
 */

const statusBadgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  {
    variants: {
      variant: {
        // Статусы задач
        new: 'bg-green-100 text-green-800',
        viewed: 'bg-orange-100 text-orange-800',
        in_progress: 'bg-blue-100 text-blue-800',
        done: 'bg-gray-200 text-gray-800',
        completed: 'bg-gray-200 text-gray-800',
        
        // Статусы заказов
        pending: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-blue-100 text-blue-800',
        shipped: 'bg-purple-100 text-purple-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        
        // Общие статусы
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-gray-100 text-gray-800',
        success: 'bg-green-100 text-green-800',
        error: 'bg-red-100 text-red-800',
        warning: 'bg-yellow-100 text-yellow-800',
        info: 'bg-blue-100 text-blue-800',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'info',
      size: 'md',
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status?: string;
  showIcon?: boolean;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ 
    className, 
    variant, 
    size, 
    status,
    showIcon = false,
    children, 
    ...props 
  }, ref) => {
    // Определяем вариант на основе статуса, если он передан
    const getVariant = (): string => {
      if (variant) return variant;
      if (status) {
        // Маппинг статусов на варианты
        const statusMap: Record<string, string> = {
          // Задачи
          new: 'new',
          viewed: 'viewed',
          in_progress: 'in_progress',
          done: 'done',
          completed: 'completed',
          
          // Заказы
          pending: 'pending',
          processing: 'processing',
          shipped: 'shipped',
          delivered: 'delivered',
          cancelled: 'cancelled',
          
          // Общие
          active: 'active',
          inactive: 'inactive',
          success: 'success',
          error: 'error',
          warning: 'warning',
          info: 'info',
        };
        
        return statusMap[status] || 'info';
      }
      return 'info';
    };

    // Получаем текст для отображения
    const getDisplayText = (): string => {
      if (children) return children as string;
      if (status) {
        const textMap: Record<string, string> = {
          // Задачи
          new: 'новый',
          viewed: 'просмотренно',
          in_progress: 'в процессе',
          done: 'выполненно',
          completed: 'выполненно',
          
          // Заказы
          pending: 'ожидает',
          processing: 'обрабатывается',
          shipped: 'отправлен',
          delivered: 'доставлен',
          cancelled: 'отменен',
          
          // Общие
          active: 'активен',
          inactive: 'неактивен',
          success: 'успешно',
          error: 'ошибка',
          warning: 'предупреждение',
          info: 'информация',
        };
        
        return textMap[status] || status;
      }
      return '';
    };

    return (
      <span
        ref={ref}
        className={statusBadgeVariants({ 
          variant: getVariant() as any, 
          size, 
          className 
        })}
        {...props}
      >
        {showIcon && (
          <CheckCircleIcon className="w-3 h-3 mr-1" />
        )}
        {getDisplayText()}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

export { StatusBadge, statusBadgeVariants };
