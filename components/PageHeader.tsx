import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, DocumentDuplicateIcon, PrinterIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

type Props = {
  title: string;
  action?: {
    label: string;
    href?: string;
    onClick?: (e?: any) => void;
    disabled?: boolean;
    icon?: ReactNode;
  };
  copyAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  deleteAction?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  showBackButton?: boolean;
  backHref?: string;
  children?: ReactNode;
};

export default function PageHeader({ 
  title, 
  action, 
  copyAction,
  deleteAction,
  showBackButton = false, 
  backHref, 
  children 
}: Props) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 pb-4 border-b-0 sm:border-b sm:border-gray-200">
      <div className="flex items-center gap-3">
        {/* Кнопка "Назад" - теперь перед заголовком с новой иконкой */}
        {showBackButton && (
          <button
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-800"
            title="Назад"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
        )}
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
      </div>
      
      <div className="flex items-center gap-3">

        {/* Кнопка копирования */}
        {copyAction && (
          <button
            onClick={copyAction.onClick}
            disabled={copyAction.disabled}
            className="btn text-xs flex items-center gap-2 disabled:opacity-50"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
            {copyAction.label}
          </button>
        )}

        {/* Основная кнопка действия */}
        {action && (
          action.href ? (
            <Link href={action.href} className="btn text-xs flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              disabled={action.disabled}
              className={`btn text-xs flex items-center gap-2 disabled:opacity-50 ${action.label.includes('Печать') ? 'hidden sm:flex' : ''}`}
            >
              {action.icon ? (
                action.icon
              ) : (
                <>
                  {action.label.includes('Сохранить') || action.label.includes('Отправить') ? null : <PlusIcon className="w-4 h-4" />}
                  {action.label}
                </>
              )}
            </button>
          )
        )}

        {/* Кнопка удаления - теперь после основной кнопки действия */}
        {deleteAction && (
          <button
            onClick={deleteAction.onClick}
            disabled={deleteAction.loading}
            className="btn text-xs flex items-center gap-2 disabled:opacity-50"
          >
            <XMarkIcon className="w-4 h-4" />
            {deleteAction.loading ? 'Удаление...' : deleteAction.label}
          </button>
        )}

        {children}
      </div>
    </div>
  );
} 