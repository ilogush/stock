import React from 'react';
import Link from 'next/link';
export interface Column<T = any> {
  key?: string;
  header: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowKey?: keyof T | ((row: T) => string);
  className?: string;
  showHeader?: boolean;
  compact?: boolean;
}

export default function DataTable<T = any>({
  data,
  columns,
  loading = false,
  emptyMessage = 'Данные не найдены',
  onRowClick,
  rowKey,
  className = '',
  showHeader = true,
  compact = false
}: DataTableProps<T>) {
  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    if (typeof rowKey === 'string') {
      return String(row[rowKey as keyof T]);
    }
    return String(index);
  };

  const getCellValue = (column: Column<T>, row: T, index: number): React.ReactNode => {
    const value = column.key ? row[column.key as keyof T] : undefined;
    return column.render ? column.render(value, row, index) : String(value || '');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="table-standard">
        {showHeader && (
          <thead>
            <tr>
              {columns.map((column, colIndex) => (
                <th
                  key={column.key || `col-${colIndex}`}
                  className={`table-header ${
                    column.align === 'center' ? 'text-center' : 
                    column.align === 'right' ? 'text-right' : 'text-left'
                  } ${column.width ? column.width : ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="table-body">
          {data.map((row, index) => (
            <tr
              key={getRowKey(row, index)}
              className={`table-row-hover ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={column.key || `col-${colIndex}`}
                  className={`table-cell ${
                    column.align === 'center' ? 'text-center' : 
                    column.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {getCellValue(column, row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Специализированные компоненты для часто используемых таблиц
export function UsersTable({ users, onUserClick }: { users: any[], onUserClick?: (user: any) => void }) {
  const columns: Column[] = [
    {
      key: 'id',
      header: 'ID',
      render: (value) => (
        <Link href={`/users/${value}`} className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono">
          {String(value).padStart(3, '0')}
        </Link>
      ),
      width: 'w-16'
    },
    {
      key: 'first_name',
      header: 'ИМЯ',
      render: (value, row) => `${value || ''} ${row.last_name || ''}`.trim() || row.email
    },
    {
      key: 'email',
      header: 'EMAIL'
    },
    {
      key: 'role_id',
      header: 'РОЛЬ',
      render: (value) => `Роль ${value}`
    },
    {
      key: 'actions',
      header: 'ДЕЙСТВИЯ',
      render: (value, row) => (
        <div className="flex gap-2">
          <Link href={`/users/${row.id}`} className="btn text-xs px-2 py-1">
            просмотр
          </Link>
        </div>
      ),
      align: 'center',
      width: 'w-24'
    }
  ];

  return <DataTable data={users} columns={columns} onRowClick={onUserClick} />;
}

export function ColorsTable({ colors, onColorClick }: { colors: any[], onColorClick?: (color: any) => void }) {
  const columns: Column[] = [
    {
      key: 'id',
      header: 'ID',
      render: (value) => (
        <Link href={`/colors/${value}`} className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono">
          {String(value).padStart(3, '0')}
        </Link>
      ),
      width: 'w-16'
    },
    {
      key: 'name',
      header: 'НАЗВАНИЕ'
    },
    {
      key: 'code',
      header: 'КОД',
      render: (value) => <span className="font-mono id-mono">{value}</span>
    },
    {
      key: 'hex_value',
      header: 'ЦВЕТ',
      render: (value) => value ? (
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: value }}
          ></div>
          <span className="text-xs font-mono">{value}</span>
        </div>
      ) : null
    },
    {
      key: 'product_count',
      header: 'ТОВАРОВ',
      render: (value) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          (value || 0) > 0 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {value || 0}
        </span>
      ),
      align: 'center',
      width: 'w-20'
    }
  ];

  return <DataTable data={colors} columns={columns} onRowClick={onColorClick} />;
}

export function ProductsTable({ products, onProductClick }: { products: any[], onProductClick?: (product: any) => void }) {
  const columns: Column[] = [
    {
      key: 'id',
      header: 'ID',
      render: (value) => (
        <Link href={`/products/${value}`} className="px-2 py-0.5 rounded-full border border-gray-800 bg-gray-800 text-white text-xs hover:bg-gray-900 table-cell-mono">
          {String(value).padStart(3, '0')}
        </Link>
      ),
      width: 'w-16'
    },
    {
      key: 'name',
      header: 'НАЗВАНИЕ'
    },
    {
      key: 'article',
      header: 'АРТИКУЛ',
      render: (value) => <span className="font-mono id-mono">{value}</span>
    },
    {
      key: 'price',
      header: 'ЦЕНА',
      render: (value) => value ? `${value} ₽` : '-',
      align: 'right',
      width: 'w-20'
    },
    {
      key: 'actions',
      header: 'ДЕЙСТВИЯ',
      render: (value, row) => (
        <div className="flex gap-2">
          <Link href={`/products/${row.id}`} className="btn text-xs px-2 py-1">
            просмотр
          </Link>
        </div>
      ),
      align: 'center',
      width: 'w-24'
    }
  ];

  return <DataTable data={products} columns={columns} onRowClick={onProductClick} />;
}
