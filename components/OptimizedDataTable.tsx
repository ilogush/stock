import React, { useState, useMemo, useCallback } from 'react';
import { debounce } from '../lib/apiOptimizer';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface OptimizedDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  searchable?: boolean;
  sortable?: boolean;
  selectable?: boolean;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function OptimizedDataTable<T extends { id: number | string }>({
  data,
  columns,
  pageSize = 20,
  searchable = true,
  sortable = true,
  selectable = false,
  onRowClick,
  onSelectionChange,
  loading = false,
  emptyMessage = 'Нет данных для отображения'
}: OptimizedDataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());

  // Debounced поиск
  const debouncedSearch = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  // Фильтрация и сортировка данных
  const processedData = useMemo(() => {
    let filtered = data;

    // Поиск
    if (searchQuery) {
      filtered = filtered.filter(row =>
        columns.some(column => {
          const value = row[column.key];
          return value && String(value).toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // Сортировка
    if (sortColumn && sortable) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchQuery, sortColumn, sortDirection, columns, sortable]);

  // Пагинация
  const totalPages = Math.ceil(processedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  // Обработчики
  const handleSort = useCallback((column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  }, [sortColumn]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
    setCurrentPage(1);
  }, [debouncedSearch]);

  const handleRowSelect = useCallback((row: T) => {
    const newSelected = new Set(selectedRows);
    const rowId = row.id;

    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }

    setSelectedRows(newSelected);
    onSelectionChange?.(data.filter(row => newSelected.has(row.id)));
  }, [selectedRows, data, onSelectionChange]);

  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const newSelected = new Set(paginatedData.map(row => row.id));
      setSelectedRows(newSelected);
      onSelectionChange?.(paginatedData);
    }
  }, [selectedRows, paginatedData, onSelectionChange]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Поиск */}
      {searchable && (
        <div className="flex justify-between items-center">
          <input
            type="text"
            onChange={handleSearch}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-sm text-gray-500">
            {processedData.length} из {data.length} записей
          </div>
        </div>
      )}

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              {columns.map(column => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable && sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable && sortable && handleSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortable && sortColumn === column.key && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map(row => (
              <tr
                key={row.id}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => handleRowSelect(row)}
                      className="rounded border-gray-300"
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                )}
                {columns.map(column => (
                  <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(row[column.key], row) : String(row[column.key] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Пустое состояние */}
      {paginatedData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {emptyMessage}
        </div>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Страница {currentPage} из {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="btn disabled:opacity-50"
            >
              Назад
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="btn disabled:opacity-50"
            >
              Вперед
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
