interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg';
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill';
}

interface OptimizedImageData {
  src: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

class ImageOptimizer {
  private cache = new Map<string, OptimizedImageData>();

  async optimizeImage(
    imageUrl: string,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImageData> {
    const cacheKey = `${imageUrl}-${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const {
      quality = 80,
      format = 'webp',
      width = 800,
      height = 600,
      fit = 'cover'
    } = options;

    try {
      // Создаем оптимизированный URL для Next.js Image
      const optimizedUrl = this.createOptimizedUrl(imageUrl, {
        quality,
        format,
        width,
        height,
        fit
      });

      const optimizedData: OptimizedImageData = {
        src: optimizedUrl,
        width,
        height,
        format,
        size: 0 // Размер будет определен после загрузки
      };

      this.cache.set(cacheKey, optimizedData);
      return optimizedData;
    } catch (error) {
      console.error('Ошибка оптимизации изображения:', error);
      return {
        src: imageUrl,
        width: 0,
        height: 0,
        format: 'original',
        size: 0
      };
    }
  }

  private createOptimizedUrl(imageUrl: string, options: ImageOptimizationOptions): string {
    // Для Supabase Storage используем специальную оптимизацию
    if (imageUrl.includes('supabase.co')) {
      return this.optimizeSupabaseUrl(imageUrl, options);
    }

    // Для других источников используем Next.js Image
    return imageUrl;
  }

  private optimizeSupabaseUrl(imageUrl: string, options: ImageOptimizationOptions): string {
    const url = new URL(imageUrl);
    
    // Добавляем параметры трансформации для Supabase Storage
    if (options.width) url.searchParams.set('width', options.width.toString());
    if (options.height) url.searchParams.set('height', options.height.toString());
    if (options.quality) url.searchParams.set('quality', options.quality.toString());
    if (options.format) url.searchParams.set('format', options.format);
    if (options.fit) url.searchParams.set('fit', options.fit);

    return url.toString();
  }

  // Предзагрузка изображений для улучшения UX
  preloadImages(imageUrls: string[]): void {
    imageUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  // Очистка кеша
  clearCache(): void {
    this.cache.clear();
  }

  // Получение статистики кеша
  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size
    };
  }
}

export const imageOptimizer = new ImageOptimizer();
export default imageOptimizer;
