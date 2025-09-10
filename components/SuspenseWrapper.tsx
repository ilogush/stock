import React, { Suspense } from 'react';

interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

// Стандартный fallback для загрузки
const DefaultFallback: React.FC = () => (
  <div className="flex items-center justify-center p-4">
          <div className="text-gray-500">Загрузка...</div>
  </div>
);

// Fallback для таблиц
const TableFallback: React.FC = () => (
      <div>
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded"></div>
      ))}
    </div>
  </div>
);

// Fallback для форм
const FormFallback: React.FC = () => (
      <div className="space-y-4">
    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    <div className="h-10 bg-gray-200 rounded"></div>
    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    <div className="h-10 bg-gray-200 rounded"></div>
  </div>
);

// Fallback для изображений
const ImageFallback: React.FC = () => (
      <div className="bg-gray-200 rounded w-full h-48"></div>
);

export const SuspenseWrapper: React.FC<SuspenseWrapperProps> = ({ 
  children, 
  fallback = <DefaultFallback />,
  className 
}) => {
  return (
    <div className={className}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </div>
  );
};

// Специализированные компоненты
export const TableSuspense: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SuspenseWrapper fallback={<TableFallback />}>
    {children}
  </SuspenseWrapper>
);

export const FormSuspense: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SuspenseWrapper fallback={<FormFallback />}>
    {children}
  </SuspenseWrapper>
);

export const ImageSuspense: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SuspenseWrapper fallback={<ImageFallback />}>
    {children}
  </SuspenseWrapper>
);

export default SuspenseWrapper;
