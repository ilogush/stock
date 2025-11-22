import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../components/ToastContext';
import { useUserRole } from '../../lib/hooks/useUserRole';
import ImageUploader from '../../components/ImageUploader';
import Toggle from '../../components/Toggle';
import PageHeader from '../../components/PageHeader';

interface Category { id: number; name: string }
interface Brand { id: number; name: string }
interface Color { id: number; name: string }

interface UploadedImage {
  id?: string;
  url: string;
  fileName: string;
  file?: File;
}

interface Product {
  id: number;
  name: string;
  article: string;
  brand_id: number;
  category_id: number;
  color_id: number | null;
  price: number | null;
  old_price: number | null;
  is_popular: boolean;
  is_visible: boolean;
  composition?: string;
  care_instructions?: string;
  brand?: { id: number; name: string };
  category?: { id: number; name: string };
  color?: { id: string; name: string };
}

const EditProduct: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();
  const { roleName } = useUserRole();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    brand_id: '',
    category_id: '',
    color_id: '',
    article: '',
    composition: '',
    price: '',
    old_price: '',
    is_popular: false,
    is_visible: false,
    care_instructions: ''
  });

  useEffect(() => {
    if (id) {
      loadData().then(() => {
        loadProduct();
      });
    }
  }, [id]);

  // Обновляем форму, когда цвета загружены и есть товар
  useEffect(() => {
    if (colors.length > 0 && product) {
      setFormData(prev => ({
        ...prev,
        color_id: product.color_id?.toString() || ''
      }));
    }
  }, [colors, product]);

  const loadProduct = async () => {
    try {
      const [productRes, imagesRes] = await Promise.all([
        fetch(`/api/products/${id}`),
        fetch(`/api/products/${id}/images`)
      ]);

      if (productRes.ok) {
        const responseData = await productRes.json();
        const productData = responseData.data?.product || responseData; // Поддержка старого и нового формата
        setProduct(productData);
        
        // Заполняем форму
        const formDataToSet = {
          name: productData.name || '',
          brand_id: productData.brand_id?.toString() || '',
          category_id: productData.category_id?.toString() || '',
          color_id: productData.color_id?.toString() || '',
          article: productData.article || '',
          composition: productData.composition || '',
          price: productData.price?.toString() || '',
          old_price: productData.old_price?.toString() || '',
          is_popular: productData.is_popular || false,
          is_visible: productData.is_visible || false,
          care_instructions: productData.care_instructions || ''
        };
        
        console.log('Setting form data:', formDataToSet);
        console.log('Product category_id:', productData.category_id);
        setFormData(formDataToSet);
      }

      if (imagesRes.ok) {
        const imagesData = await imagesRes.json();
        const productImages = (imagesData.images || []).map((img: any) => ({
          id: img.id,
          url: img.image_url.startsWith('http') 
            ? img.image_url 
            : `https://bznpvufwcmohaedsqber.supabase.co/storage/v1/object/public/images/${img.image_url}`,
          fileName: img.image_url.split('/').pop() || 'image'
        }));
        setImages(productImages);
      }

      // Проверяем возможность удаления
      setCanDelete(true);
      
    } catch (error) {
      console.error('Ошибка загрузки товара:', error);
      showToast('Ошибка загрузки товара', 'error');
    }
  };

  const loadData = async () => {
    try {
      const [brandsRes, categoriesRes, colorsRes] = await Promise.all([
        fetch('/api/brands'),
        fetch('/api/categories'),
        fetch('/api/colors?limit=1000')
      ]);

      const [brandsData, categoriesData, colorsData] = await Promise.all([
        brandsRes.json(),
        categoriesRes.json(),
        colorsRes.json()
      ]);

      setBrands(brandsData.data?.brands || []);
      setCategories(categoriesData.data?.categories || []);
      setColors(colorsData.data?.colors || []);
      
      console.log('Categories loaded:', Array.isArray(categoriesData) ? categoriesData : []);
      console.log('Current formData.category_id:', formData.category_id);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Функция для загрузки размеров по категории
  const loadSizesByCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/sizes/by-category?category_id=${categoryId}`);
      const data = await response.json();
      // Размеры загружаются, но не используются в форме редактирования
      // Функция оставлена для совместимости
    } catch (error) {
      console.error('Ошибка загрузки размеров по категории:', error);
    }
  };

  const uploadNewImages = async (productId: number) => {
    const imagesToUpload = images.filter(img => img.file);
    let uploadedCount = 0;
    
    for (const image of imagesToUpload) {
      if (!image.file) continue;
      
      const formData = new FormData();
      formData.append('file', image.file);
      formData.append('product_id', productId.toString());
      
      try {
        const response = await fetch('/api/products/images/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          uploadedCount++;
        } else {
          showToast(`❌ Ошибка загрузки ${image.fileName}`, 'error');
        }
      } catch (error) {
        showToast(`❌ Ошибка загрузки ${image.fileName}`, 'error');
      }
    }
    
    if (uploadedCount > 0) {
      showToast(`✅ Загружено ${uploadedCount} изображений`, 'success');
      // Перезагружаем изображения товара после загрузки
      await loadProductImages();
    }
  };

  const loadProductImages = async () => {
    try {
      const response = await fetch(`/api/products/${id}/images`);
      if (response.ok) {
        const imagesData = await response.json();
        const productImages = (imagesData.images || []).map((img: any) => ({
          id: img.id,
          url: img.image_url.startsWith('http') 
            ? img.image_url 
            : `https://bznpvufwcmohaedsqber.supabase.co/storage/v1/object/public/images/${img.image_url}`,
          fileName: img.image_url.split('/').pop() || 'image'
        }));
        setImages(productImages);
      }
    } catch (error) {
      showToast('❌ Ошибка обновления изображений товара', 'error');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      // Валидация и нормализация артикула
      if (name === 'article') {
        const latinOnly = /^[a-zA-Z0-9\s\-_]*$/;
        if (!latinOnly.test(value)) {
          showToast('Артикул может содержать только латинские буквы, цифры, пробелы, дефисы и подчеркивания', 'error');
          return;
        }
        
        // Нормализуем артикул: первая буква должна быть заглавной
        let normalizedValue = value;
        if (value.length > 0) {
          const firstChar = value.charAt(0);
          if (firstChar >= 'a' && firstChar <= 'z') {
            normalizedValue = firstChar.toUpperCase() + value.slice(1);
          }
        }
        
        setFormData(prev => ({ ...prev, [name]: normalizedValue }));
        return;
      }
      
      setFormData(prev => ({ ...prev, [name]: value }));

      // Если изменилась категория, загружаем соответствующие размеры
      if (name === 'category_id' && value) {
        loadSizesByCategory(value);
      }
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    // Проверка обязательных полей
    if (!formData.name.trim()) {
      errors.push('Название товара обязательно');
    }
    if (!formData.brand_id) {
      errors.push('Бренд обязателен');
    }
    if (!formData.category_id) {
      errors.push('Категория обязательна');
    }
    if (!formData.color_id) {
      errors.push('Цвет обязателен');
    }
    if (!formData.article.trim()) {
      errors.push('Артикул обязателен');
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.push('Цена должна быть больше 0');
    }
    if (!formData.composition.trim()) {
      errors.push('Состав обязателен');
    }

    // Описание необязательно - убираем валидацию

    // Валидация артикула
    if (formData.article.trim()) {
      const latinOnly = /^[a-zA-Z0-9\s\-_]+$/;
      if (!latinOnly.test(formData.article)) {
        errors.push('Артикул может содержать только латинские буквы, цифры, пробелы, дефисы и подчеркивания');
      }
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    
    if (errors.length > 0) {
      errors.forEach(error => {
        showToast(error, 'error');
      });
      return;
    }

    setSaving(true);
    
    try {
      const productData = {
        ...formData,
        brand_id: formData.brand_id ? parseInt(formData.brand_id) : null,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        color_id: formData.color_id ? parseInt(formData.color_id) : null,
        price: formData.price ? parseFloat(formData.price) : null,
        old_price: formData.old_price ? parseFloat(formData.old_price) : null
      };

      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        const result = await response.json();

        showToast('Товар успешно обновлен', 'success');
        
        // Загружаем новые изображения, если они есть
        const newImages = images.filter(img => img.file);
        if (newImages.length > 0) {
          await uploadNewImages(result.id);
        }
        
        router.push('/products');
      } else {
        const errorData = await response.json();
        console.error('Ошибка сервера:', errorData); // Отладка ошибок
        
        // Специальная обработка ошибки изменения цвета
        if (errorData.error === 'Нельзя изменить цвет товара') {
          const stockInfo = errorData.stockInfo;
          const message = stockInfo 
            ? `Нельзя изменить цвет товара. На складе есть остатки: ${stockInfo.totalQuantity} шт.`
            : errorData.details?.[0] || errorData.error;
          showToast(message, 'error');
        } else if (errorData.details && Array.isArray(errorData.details)) {
          // Показываем все ошибки валидации
          errorData.details.forEach((error: string) => {
            showToast(error, 'error');
          });
        } else {
          showToast(errorData.error || 'Ошибка обновления товара', 'error');
        }
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showToast('Ошибка обновления товара', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Товар успешно удален', 'success');
        router.push('/products');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Ошибка удаления товара', 'error');
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      showToast('Ошибка удаления товара', 'error');
    }
  };

  const handleCopy = async () => {
    if (!product) return;

    // Перенаправляем на страницу создания товара с параметром copy
    router.push(`/products/new?copy=${product.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500">Загрузка</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Редактировать товар: ${product?.name || ''}`}
        showBackButton
        backHref="/products"
        copyAction={{
          label: 'Копия',
          onClick: handleCopy,
          disabled: saving
        }}
        deleteAction={{
          label: 'Удалить',
          onClick: handleDelete,
          loading: false
        }}
        action={{
          label: saving ? 'Сохранение...' : 'Сохранить',
          onClick: handleSubmit,
          disabled: saving
        }}
      />

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <ImageUploader 
          images={images}
          onImagesChange={setImages}
          maxImages={6}
          productId={id as string}
        />

        {/* Первая строка: Бренд, Категория, Цвет, Артикул */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Бренд */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Бренд <span className="text-red-500">*</span>
            </label>
            <select
              name="brand_id"
              value={formData.brand_id}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 "
              required
            >
              <option value="">Выберите бренд</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          {/* Категория */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Категория <span className="text-red-500">*</span>
            </label>
            {/* Debug: category_id={formData.category_id}, categories count={categories.length} */}
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 "
              required
            >
              <option value="">Выберите категорию</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Цвет */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Цвет <span className="text-red-500">*</span>
            </label>
            <select
              name="color_id"
              value={formData.color_id}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 "
              required
            >
              <option value="">Выберите цвет</option>
              {colors.map(color => (
                <option key={color.id} value={color.id}>
                  {color.name}
                </option>
              ))}
            </select>
            {colors.length === 0 && (
              <div className="mt-1">
                <p className="text-sm text-gray-500">Цвета не загружены</p>
                <button
                  type="button"
                  onClick={() => {
                    loadData();
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Перезагрузить цвета
                </button>
              </div>
            )}
          </div>

          {/* Артикул */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Артикул <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="article"
              value={formData.article}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 "
              placeholder="Только латинские буквы и цифры"
                                    />
                      </div>
        </div>

        {/* Вторая строка: Название товара, Состав, Цена, Старая цена */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Название товара */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название товара <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 "
              placeholder="Название товара"
              required
            />
          </div>

          {/* Состав */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Состав <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="composition"
              value={formData.composition}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 "
              placeholder="Например: 95% хлопок, 5% эластан"
            />
          </div>

          {/* Цена */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Цена (₽) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 "
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>

          {/* Старая цена */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Старая цена (₽)
            </label>
            <input
              type="number"
              name="old_price"
              value={formData.old_price}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 "
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Третья строка: Расширенные поля */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">

          {/* Описание товара */}
          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание товара</label>
            <textarea
              name="care_instructions"
              value={formData.care_instructions}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 "
              placeholder="Описание товара, особенности, характеристики"
              rows={3}
            />
          </div>
        </div>

        {/* Четвертая строка: Toggle переключатели */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Toggle
            id="is_popular"
            name="is_popular"
            checked={formData.is_popular}
            onChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))}
            label="Популярная модель"
          />

          <Toggle
            id="is_visible"
            name="is_visible"
            checked={formData.is_visible}
            onChange={(checked) => setFormData(prev => ({ ...prev, is_visible: checked }))}
            label="Отображать на сайте"
          />
        </div>
      </form>
    </div>
  );
};

export default EditProduct;