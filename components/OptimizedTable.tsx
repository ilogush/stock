import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

interface OptimizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (row: T, index: number) => void;
  sortable?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
}

export function OptimizedTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'Данные не найдены',
  emptyIcon,
  onRowClick,
  sortable = true,
  pagination,
  className = '',
}: OptimizedTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const sortedData = useMemo(() => {
    if (!sortConfig || !sortable) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig, sortable]);

  const handleSort = useCallback((key: keyof T | string) => {
    if (!sortable) return;

    setSortConfig(current => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  }, [sortable]);

  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable || !sortable) return null;

    const isSorted = sortConfig?.key === column.key;
    const direction = sortConfig?.direction;

    return (
      <span className="ml-1 inline-block">
        {isSorted ? (
          direction === 'asc' ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )
        ) : (
          <ChevronUpIcon className="w-4 h-4 text-gray-300" />
        )}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="flex flex-col items-center space-y-2">
          {emptyIcon || (
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          )}
          <div className="text-lg font-medium">{emptyMessage}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="table-standard">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={`table-header ${column.className || ''}`}
                style={{ width: column.width }}
                onClick={() => handleSort(column.key)}
              >
                <div className={`flex items-center ${column.sortable && sortable ? 'cursor-pointer hover:text-gray-600' : ''}`}>
                  {column.header}
                  {renderSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table-body">
          {sortedData.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`table-row-hover ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row, rowIndex)}
            >
              {columns.map((column, colIndex) => (
                <td key={colIndex} className={column.className || 'table-cell'}>
                  {column.render
                    ? column.render(row[column.key], row, rowIndex)
                    : row[column.key] ?? '—'
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
