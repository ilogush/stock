import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

/**
 * Универсальный компонент Button
 * Устраняет дублирование стилей кнопок в 50+ местах
 */

const buttonVariants = cva(
  // Базовые классы
  'inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-gray-800 text-white border border-gray-800 hover:bg-gray-900 focus:ring-gray-500',
        secondary: 'bg-transparent text-gray-800 border border-gray-600 hover:bg-gray-200 focus:ring-gray-500',
        danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-700 focus:ring-red-500',
        success: 'bg-green-600 text-white border border-green-600 hover:bg-green-700 focus:ring-green-500',
        ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
      },
      size: {
        sm: 'px-2 py-1 text-xs rounded',
        md: 'px-3 py-2 text-sm rounded-md',
        lg: 'px-4 py-2 text-base rounded-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    loading = false,
    leftIcon,
    rightIcon,
    children, 
    disabled,
    ...props 
  }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, fullWidth, className })}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4 animate-spin" />
        )}
        {!loading && leftIcon && leftIcon}
        {children}
        {!loading && rightIcon && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
