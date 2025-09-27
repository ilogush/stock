/**
 * Продвинутая система оптимизации изображений
 * Автоматическое сжатие, конвертация форматов и lazy loading
 */

interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  blur?: number;
  placeholder?: boolean;
}

export class ImageOptimizer {
  private static instance: ImageOptimizer;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer();
    }
    return ImageOptimizer.instance;
  }

  /**
   * Оптимизация изображения с выбором формата
   */
  async optimizeImage(
    file: File, 
    options: ImageOptimizationOptions = {}
  ): Promise<{ blob: Blob; size: number; originalSize: number }> {
    const {
      quality = 0.8,
      format = 'webp',
      width,
      height,
      blur = 0
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        // Вычисляем размеры
        let targetWidth = width || img.width;
        let targetHeight = height || img.height;

        // Сохраняем пропорции
        if (width && !height) {
          targetHeight = (img.height * width) / img.width;
        } else if (height && !width) {
          targetWidth = (img.width * height) / img.height;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Применяем blur если нужно
        if (blur > 0) {
          ctx.filter = `blur(${blur}px)`;
        }

        // Рисуем изображение
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Конвертируем в нужный формат
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                size: blob.size,
                originalSize: file.size
              });
            } else {
              reject(new Error('Ошибка конвертации изображения'));
            }
          },
          `image/${format}`,
          quality
        );
      };

      img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Создание placeholder изображения
   */
  async createPlaceholder(
    width: number, 
    height: number, 
    text = 'Загрузка...'
  ): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = width;
    canvas.height = height;

    // Градиентный фон
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Текст
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);

    return canvas.toDataURL('image/png', 0.1);
  }

  /**
   * Автоматический выбор формата на основе браузера
   */
  getOptimalFormat(): 'webp' | 'avif' | 'jpeg' {
    if (typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Проверяем поддержку AVIF
      if (ctx.canvas.toDataURL('image/avif', 0.1).startsWith('data:image/avif')) {
        return 'avif';
      }
      
      // Проверяем поддержку WebP
      if (ctx.canvas.toDataURL('image/webp', 0.1).startsWith('data:image/webp')) {
        return 'webp';
      }
    }
    
    return 'jpeg';
  }

  /**
   * Адаптивные размеры изображений
   */
  getResponsiveSizes(originalWidth: number, originalHeight: number) {
    return {
      thumbnail: { width: 150, height: 150 },
      small: { width: 300, height: 300 },
      medium: { width: 600, height: 600 },
      large: { width: 1200, height: 1200 },
      original: { width: originalWidth, height: originalHeight }
    };
  }
}

export const imageOptimizer = ImageOptimizer.getInstance();
