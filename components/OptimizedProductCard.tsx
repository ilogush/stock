import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PhotoIcon } from '@heroicons/react/24/outline';

type Product = {
  id: number;
  name: string;
  brand_id: number | null;
  category_id: number | null;
  subcategory_id: number | null;
  color_id: number | null;
  composition?: string;
  article: string;
  price: number | null;
  old_price: number | null;
  is_popular: boolean;
  is_visible: boolean;
  images: string[];
  brandName?: string;
  categoryName?: string;
  subcategoryName?: string;
  colorName?: string;
};

interface ProductCardProps {
  product: Product;
  onImageError: (productId: number) => void;
  imageErrors: Set<number>;
  cleanProductName: (name: string, subcategoryName?: string | null, categoryName?: string | null) => string;
}

const ProductCard: React.FC<ProductCardProps> = React.memo(({ 
  product, 
  onImageError, 
  imageErrors, 
  cleanProductName 
}) => {
  const hasImageError = imageErrors.has(product.id);
  const cleanName = cleanProductName(product.name, product.subcategoryName, product.categoryName);
  
  const formatPrice = (price: number | null) => {
    if (price === null) return '—';
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  return (
            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md">
      <div className="flex items-start space-x-4">
        {/* Изображение товара */}
        <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
          {product.images && product.images.length > 0 && !hasImageError ? (
            <Image
              src={product.images[0]}
              alt={cleanName}
              width={80}
              height={80}
              className="w-full h-full object-cover"
              onError={() => onImageError(product.id)}
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <PhotoIcon className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Информация о товаре */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Link 
                href={`/products/${product.id}`}
                className="text-sm font-medium text-gray-900 hover:text-blue-600"
              >
                {cleanName}
              </Link>
              <p className="text-xs text-gray-500 mt-1">
                Артикул: {product.article}
              </p>
            </div>
            
            {/* Цена */}
            <div className="text-right ml-4">
              <div className="text-sm font-semibold text-gray-900">
                {formatPrice(product.price)} ₽
              </div>
              {product.old_price && product.old_price > (product.price || 0) && (
                <div className="text-xs text-gray-500 line-through">
                  {formatPrice(product.old_price)} ₽
                </div>
              )}
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
            {product.brandName && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {product.brandName}
              </span>
            )}
            {product.categoryName && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                {product.categoryName}
              </span>
            )}
            {product.colorName && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                {product.colorName}
              </span>
            )}
            {product.is_popular && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Популярная модель
              </span>
            )}
            {!product.is_visible && (
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                Скрыт
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard; 