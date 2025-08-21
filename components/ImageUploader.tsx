import React, { useState, useRef } from 'react';
import { useToast } from './ToastContext';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
interface UploadedImage {
  id?: string;
  url: string;
  fileName: string;
  file?: File;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  productId?: string | number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  images, 
  onImagesChange, 
  maxImages = 6,
  productId 
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [processing, setProcessing] = useState(false);
  const { showToast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Проверка общего количества изображений
    if (images.length + files.length > maxImages) {
      showToast(`Максимальное количество изображений: ${maxImages}`, 'error');
      return;
    }
    
    setProcessing(true);
    const newImages: UploadedImage[] = [];
    
    try {
      for (const file of files) {
        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
          showToast(`Файл ${file.name} не является изображением`, 'error');
          continue;
        }
        
        let processedFile = file;
        
        // Создаем preview изображения
        const reader = new FileReader();
        const imageUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(processedFile);
        });
        
        const newImage: UploadedImage = {
          url: imageUrl,
          fileName: processedFile.name,
          file: processedFile
        };
        
        newImages.push(newImage);
      }
      
      // Обновляем состояние
      const updatedImages = [...images, ...newImages];
      onImagesChange(updatedImages);
      
      // Показываем информацию об обработке
      if (newImages.length > 0) {
        showToast(`Добавлено ${newImages.length} изображений`, 'success');
      }
      
    } catch (error) {
      console.error('Ошибка обработки изображений:', error);
      showToast('Ошибка обработки изображений', 'error');
    } finally {
      setProcessing(false);
      
      // Сбрасываем input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = async (index: number) => {
    const imageToRemove = images[index];
    
    // Если это существующее изображение с ID, удаляем из БД
    if (imageToRemove.id && productId) {
      try {
        const response = await fetch(`/api/products/${productId}/images`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image_id: imageToRemove.id }),
        });
        
        if (!response.ok) {
          console.error('Ошибка удаления изображения с сервера');
          showToast('Ошибка удаления изображения', 'error');
          return;
        } else {
          showToast('Изображение удалено', 'success');
        }
      } catch (error) {
        console.error('Ошибка удаления изображения:', error);
        showToast('Ошибка удаления изображения', 'error');
        return;
      }
    }
    
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onImagesChange(newImages);
  };

  return (
    <div>
      <div className="grid grid-cols-6 mb-6 gap-3">
        {/* Существующие изображения */}
        {images.map((image, index) => (
          <div key={index} className="relative group aspect-square">
            <img
              src={image.url}
              alt={image.fileName}
              className="w-full h-full object-cover rounded-md border border-gray-300"
            />
            
            {/* Кнопка удаления - правый верхний угол */}
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 opacity-0 group-hover:opacity-100"
              title="Удалить изображение"
              disabled={processing}
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
            
            {/* Номер изображения */}
            <div className="absolute top-1 left-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
              {index + 1}
            </div>
          </div>
        ))}
        
        {/* Кнопка добавления - только одна */}
        {images.length < maxImages && (
          <label 
            htmlFor="imageFile" 
            className={`relative aspect-square border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-600 ${
              processing 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer hover:border-blue-500 hover:text-blue-500'
            }`}
          >
            {processing && (
              <div className="text-center">
                <div className="text-gray-500">Загрузка...</div>
                <p className="text-sm text-gray-500 mt-2">Обработка...</p>
              </div>
            )}
            <PlusIcon className="w-6 h-6 mb-1" />
            <span className="text-xs">Добавить</span>
            <input
              ref={fileInputRef}
              id="imageFile"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              disabled={processing}
              className="sr-only"
              onChange={handleFileSelect}
            />
          </label>
        )}
      </div>
    </div>
  );
};

export default ImageUploader; 