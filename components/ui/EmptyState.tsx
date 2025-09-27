import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { 
  DocumentTextIcon, 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

/**
 * Компонент для отображения пустого состояния
 * Унифицирует отображение пустых состояний во всем приложении
 */

const emptyStateVariants = cva(
  'flex flex-col items-center justify-center text-center py-12 px-4',
  {
    variants: {
      variant: {
        default: 'text-gray-500',
        error: 'text-red-500',
        warning: 'text-yellow-500',
        success: 'text-green-500',
      },
      size: {
        sm: 'py-6',
        md: 'py-12',
        lg: 'py-16',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  showBorder?: boolean;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ 
    className, 
    variant, 
    size,
    icon,
    title,
    description,
    action,
    showBorder = false,
    children, 
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={emptyStateVariants({ variant, size, className })}
        {...props}
      >
        {showBorder && (
          <div className="w-full max-w-sm mx-auto border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div className="flex flex-col items-center">
              {icon && (
                <div className="mb-4 text-gray-400">
                  {icon}
                </div>
              )}
              
              {title && (
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {title}
                </h3>
              )}
              
              {description && (
                <p className="text-sm text-gray-500 mb-4 max-w-sm">
                  {description}
                </p>
              )}
              
              {action && (
                <div className="mt-4">
                  {action}
                </div>
              )}
              
              {children}
            </div>
          </div>
        )}
        
        {!showBorder && (
          <>
            {icon && (
              <div className="mb-4 text-gray-400">
                {icon}
              </div>
            )}
            
            {title && (
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {title}
              </h3>
            )}
            
            {description && (
              <p className="text-sm text-gray-500 mb-4 max-w-sm">
                {description}
              </p>
            )}
            
            {action && (
              <div className="mt-4">
                {action}
              </div>
            )}
            
            {children}
          </>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

// Предустановленные иконки
export const EmptyStateIcons = {
  // Иконка для пустого списка
  List: () => <DocumentTextIcon className="w-12 h-12" />,
  
  // Иконка для пустого поиска
  Search: () => <MagnifyingGlassIcon className="w-12 h-12" />,
  
  // Иконка для ошибки
  Error: () => <ExclamationTriangleIcon className="w-12 h-12" />,
  
  // Иконка для успеха
  Success: () => <CheckCircleIcon className="w-12 h-12" />,
  
  // Иконка для загрузки
  Loading: () => <ArrowPathIcon className="w-12 h-12" />,
};

export { EmptyState, emptyStateVariants };
