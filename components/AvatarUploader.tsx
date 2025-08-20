import React, { useState, useRef } from 'react';

interface UploadedAvatar {
  id?: string;
  url: string;
  fileName: string;
  file?: File;
}

interface AvatarUploaderProps {
  avatar: UploadedAvatar | null;
  onAvatarChange: (avatar: UploadedAvatar | null) => void;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({ 
  avatar, 
  onAvatarChange 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      alert(`Файл ${file.name} не является изображением`);
      return;
    }
    
    // Обрабатываем изображение без сжатия
    const reader = new FileReader();
    reader.onload = (event) => {
      const newAvatar: UploadedAvatar = {
        url: event.target?.result as string,
        fileName: file.name,
        file: file,
      };
      onAvatarChange(newAvatar);
    };
    reader.readAsDataURL(file);
    
    // Сбрасываем input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAvatar = () => {
    onAvatarChange(null);
  };

  return (
    <div className="mb-6 pb-6 border-b border-gray-200">
      <div className="flex items-center gap-4">
        {/* Аватар */}
        <div className="relative group">
          {avatar ? (
            <div className="w-24 h-24 relative">
              <img
                src={avatar.url}
                alt={avatar.fileName}
                className="w-full h-full object-cover rounded-full border border-gray-300"
              />
              
              {/* Кнопка удаления */}
              <button
                type="button"
                onClick={removeAvatar}
                className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 opacity-0 group-hover:opacity-100"
                title="Удалить аватар"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center bg-gray-50">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>
        
        {/* Кнопка загрузки */}
        <div>
          <label 
            htmlFor="avatarFile" 
            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {avatar ? 'Изменить аватар' : 'Загрузить аватар'}
            <input
              ref={fileInputRef}
              id="avatarFile"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="sr-only"
              onChange={handleFileSelect}
            />
          </label>
          <p className="mt-1 text-xs text-gray-500">
            PNG, JPG, WEBP до 2MB
          </p>
        </div>
      </div>
    </div>
  );
};

export default AvatarUploader; 