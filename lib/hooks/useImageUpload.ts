import { useState } from 'react';
import { useToast } from '../../components/ToastContext';

interface UploadedImage {
  id?: string;
  fileName: string;
  file?: File;
  url?: string;
  preview?: string;
}

interface UseImageUploadOptions {
  maxFiles?: number;
  maxSize?: number; // в байтах
  allowedTypes?: string[];
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { showToast } = useToast();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);

  const {
    maxFiles = 6,
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  } = options;

  // Добавление изображений
  const addImages = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        showToast(`Неподдерживаемый формат: ${file.name}`, 'error');
        return false;
      }
      if (file.size > maxSize) {
        showToast(`Файл слишком большой: ${file.name}`, 'error');
        return false;
      }
      return true;
    });

    if (images.length + validFiles.length > maxFiles) {
      showToast(`Максимум ${maxFiles} изображений`, 'error');
      return;
    }

    const newImages: UploadedImage[] = validFiles.map(file => ({
      fileName: file.name,
      file,
      preview: URL.createObjectURL(file)
    }));

    setImages(prev => [...prev, ...newImages]);
  };

  // Удаление изображения
  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      const removed = newImages.splice(index, 1)[0];
      if (removed.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return newImages;
    });
  };

  // Загрузка изображений на сервер
  const uploadImages = async (productId: number): Promise<boolean> => {
    if (!productId) {
      showToast('❌ Ошибка: ID товара не определен', 'error');
      return false;
    }

    const imagesToUpload = images.filter(img => img.file);
    if (imagesToUpload.length === 0) return true;

    setUploading(true);
    let uploadedCount = 0;

    try {
      for (const image of imagesToUpload) {
        if (!image.file) continue;

        const formData = new FormData();
        formData.append('image', image.file);
        formData.append('product_id', productId.toString());

        const response = await fetch('/api/products/images/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          uploadedCount++;
        } else {
          showToast(`❌ Ошибка загрузки ${image.fileName}`, 'error');
        }
      }

      if (uploadedCount > 0) {
        showToast(`✅ Загружено ${uploadedCount} изображений`, 'success');
        return true;
      }
      return false;
    } catch (error) {
      showToast('❌ Ошибка загрузки изображений', 'error');
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Загрузка существующих изображений товара
  const loadProductImages = async (productId: number): Promise<void> => {
    try {
      const response = await fetch(`/api/products/${productId}/images`);
      if (response.ok) {
        const data = await response.json();
        const productImages = data.map((img: any) => ({
          id: img.id,
          fileName: img.file_name || 'image.jpg',
          url: img.image_url,
          preview: img.image_url
        }));
        setImages(productImages);
      }
    } catch (error) {
      showToast('❌ Ошибка обновления изображений товара', 'error');
    }
  };

  // Очистка всех изображений
  const clearImages = () => {
    images.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    setImages([]);
  };

  return {
    images,
    uploading,
    addImages,
    removeImage,
    uploadImages,
    loadProductImages,
    clearImages,
    setImages
  };
}
