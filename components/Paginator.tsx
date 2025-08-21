import React from 'react';

interface PaginatorProps {
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (limit: number) => void;
  pageSizeOptions?: number[];
}

const Paginator: React.FC<PaginatorProps> = ({
  total,
  page,
  limit,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
}) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(total, page * limit);

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      onPageChange(newPage);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(e.target.value);
    if (onPageSizeChange && newLimit !== limit) {
      onPageSizeChange(newLimit);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 border-t border-gray-200 paginator-component no-print">
      {/* Информация о страницах */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 pagination-info">
        <span>Показать</span>
        <select
          value={limit}
          onChange={handlePageSizeChange}
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white pagination-select"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>на странице</span>
      </div>

      {/* Навигация */}
      <div className="flex items-center space-x-4 pagination-navigation">
        {/* Информация о текущей странице */}
        <div className="text-sm text-gray-600 pagination-stats">
          {total === 0 ? (
            'Нет данных'
          ) : (
            `${startItem}-${endItem} из ${total}`
          )}
        </div>

        {/* Кнопки навигации */}
        <div className="flex items-center space-x-1 pagination-buttons">
          {/* Кнопка "Предыдущая" */}
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className={`px-3 py-1 text-sm border rounded pagination-btn ${
              page <= 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            ←
          </button>

          {/* Номер текущей страницы */}
          <div className="px-3 py-1 text-sm bg-gray-800 text-white border border-gray-800 rounded pagination-current">
            {page}
          </div>

          {/* Кнопка "Следующая" */}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className={`px-3 py-1 text-sm border rounded pagination-btn ${
              page >= totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            →
          </button>
        </div>


      </div>
    </div>
  );
};

export default Paginator; 