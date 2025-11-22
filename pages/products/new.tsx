import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useToast } from '../../components/ToastContext';
import { useUserRole } from '../../lib/hooks/useUserRole';
import PageHeader from '../../components/PageHeader';
import ImageUploader from '../../components/ImageUploader';
import Toggle from '../../components/Toggle';

interface Category { id: number; name: string }
interface Brand { id: number; name: string }
interface Color { id: string; name: string }
interface Size { code: string; name: string; weight?: number }
interface SizeWeight {
  size_code: string;
  weight: number;
}

interface UploadedImage {
  id?: string;
  url: string;
  fileName: string;
  file?: File;
}

export default function NewProduct() {
  const router = useRouter();
  const { showToast } = useToast();
  const { hasAnyRole, loading: roleLoading } = useUserRole();
  const { copy } = router.query;

  // ВСЕ хуки должны быть вызваны до любых условных операторов
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [sizeWeights, setSizeWeights] = useState<SizeWeight[]>([]);

  const [images, setImages] = useState<UploadedImage[]>([]);
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
    is_visible: true,
    care_instructions: ''
  });

  // Проверка прав доступа - разрешено админам, директорам, менеджерам и кладовщикам
  const isAllowed = hasAnyRole(['admin', 'director', 'manager', 'storekeeper']);

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
      
      // Загружаем размеры по умолчанию (взрослые)
      const sizesRes = await fetch('/api/sizes');
      const sizesData = await sizesRes.json();
      setSizes(sizesData.sizes || []);
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
      setSizes(data.sizes || []);
    } catch (error) {
      console.error('Ошибка загрузки размеров по категории:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Загружаем данные копируемого товара, если есть параметр copy
  useEffect(() => {
    if (copy && typeof copy === 'string') {
      loadCopyData(copy);
    }
  }, [copy]);

  const loadCopyData = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const responseData = await response.json();
        const productData = responseData.data?.product || responseData;
        
        // Заполняем форму данными копируемого товара, кроме цвета
        setFormData({
          name: productData.name || '',
          brand_id: productData.brand_id?.toString() || '',
          category_id: productData.category_id?.toString() || '',
          color_id: '', // Цвет не копируем - пользователь выберет новый
          article: productData.article || '',
          composition: productData.composition || '',
          price: productData.price?.toString() || '',
          old_price: productData.old_price?.toString() || '',
          is_popular: productData.is_popular || false,
          is_visible: false, // По умолчанию копия не видна
          care_instructions: productData.care_instructions || ''
        });

        showToast('Данные товара загружены для копирования. Выберите уникальный цвет.', 'info');
      }
    } catch (error) {
      console.error('Ошибка загрузки данных для копирования:', error);
      showToast('Ошибка загрузки данных для копирования', 'error');
    }
  };

  useEffect(() => {
    if (sizes.length > 0) {
      const initialSizeWeights = sizes.map(size => ({
        size_code: size.code,
        weight: 0
      }));
      setSizeWeights(initialSizeWeights);
    }
  }, [sizes]);
  
  // Ранний возврат после всех хуков
  if (!isAllowed && !roleLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Доступ запрещён</div>
          <div className="text-gray-600">У вас нет прав для создания товаров</div>
        </div>
      </div>
    );
  }

  if (roleLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Проверка прав доступа...</div>
        </div>
      </div>
    );
  }

  const handleSizeWeightChange = (sizeCode: string, weight: number) => {
    const newWeights = sizeWeights.map(sw =>
      sw.size_code === sizeCode ? { ...sw, weight } : sw
    );
    setSizeWeights(newWeights);
  };

  const uploadNewImages = async (productId: number) => {
    if (!productId) {
      showToast('❌ Ошибка: ID товара не определен', 'error');
      return;
    }
    
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
      await loadProductImages(productId);
    }
  };

  const loadProductImages = async (productId: number) => {
    try {
      const response = await fetch(`/api/products/${productId}/images`);
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
        color_id: formData.color_id || null,
        price: formData.price ? parseFloat(formData.price) : null,
        old_price: formData.old_price ? parseFloat(formData.old_price) : null
      };

      const response = await fetch('/api/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Проверяем разные возможные структуры ответа
        let productId = result.data?.product?.id;
        
        if (!productId && result.id) {
          // Если API возвращает id напрямую (как в редактировании)
          productId = result.id;
        }
        
        if (!productId) {
          showToast('❌ Ошибка: API не вернул ID товара', 'error');
          return;
        }

        showToast(copy ? 'Товар успешно скопирован' : 'Товар успешно создан', 'success');

        // Загружаем новые изображения, если они есть
        const newImages = images.filter(img => img.file);
        if (newImages.length > 0) {
          await uploadNewImages(productId);
        }
        
        router.push('/products');
      } else {
        const errorData = await response.json();
        if (errorData.details && Array.isArray(errorData.details)) {
          // Показываем все ошибки валидации
          errorData.details.forEach((error: string) => {
            showToast(error, 'error');
          });
        } else {
          showToast(errorData.error || 'Ошибка создания товара', 'error');
        }
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showToast('Ошибка создания товара', 'error');
    } finally {
      setSaving(false);
    }
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
        title={copy ? "Копировать товар" : "Создать товар"} 
        showBackButton
        backHref="/products"
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
}