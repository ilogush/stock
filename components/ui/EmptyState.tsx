import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

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
  List: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  
  // Иконка для пустого поиска
  Search: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  
  // Иконка для ошибки
  Error: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  
  // Иконка для успеха
  Success: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  
  // Иконка для загрузки
  Loading: () => (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

export { EmptyState, emptyStateVariants };
