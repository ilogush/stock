/** @type {import('next').NextConfig} */
const nextConfig = {
  // Включаем StrictMode для обнаружения проблем
  reactStrictMode: true,
  
  // Включаем ESLint проверки во время сборки
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Включаем TypeScript проверки во время сборки
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Настройки для development
  ...(process.env.NODE_ENV === 'development' && {
    // Отключаем кеширование в development
    onDemandEntries: {
      // Период времени в миллисекундах, в течение которого страница будет оставаться в памяти
      maxInactiveAge: 25 * 1000,
      // Количество страниц, которые должны одновременно оставаться в памяти
      pagesBufferLength: 2,
    },
    
    // Оптимизация webpack для development
    webpack: (config, { dev, isServer }) => {
      if (dev) {
        // Отключаем кеширование в development
        config.cache = false;
        
        // Ускоряем сборку
        config.watchOptions = {
          poll: 1000,
          aggregateTimeout: 300,
          ignored: ['**/node_modules', '**/.git', '**/.next'],
        };
      }
      return config;
    },
  }),
  
  // Оптимизация изображений
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'bznpvufwcmohaedsqber.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [{
        protocol: 'https',
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
        port: '',
        pathname: '/storage/v1/object/public/**',
      }] : []),
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Экспериментальные оптимизации
  experimental: {
    optimizePackageImports: ['@heroicons/react'],
  },
  

  
  // Turbopack конфигурация
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Сжатие и оптимизация
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Оптимизация бандлов
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Оптимизация разделения кода
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
            priority: 5,
            reuseExistingChunk: true,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
          supabase: {
            test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 15,
            reuseExistingChunk: true,
          },
        },
      };
      
      // Минификация
      config.optimization.minimize = true;
      
      // Удаление console.log в production
      config.optimization.minimizer.forEach((minimizer) => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions.compress.drop_console = true;
        }
      });
    }
    
    // Оптимизация для уменьшения размера бандла
    config.resolve.alias = {
      ...config.resolve.alias,
      // Используем только нужные части библиотек
      '@heroicons/react/24/outline': '@heroicons/react/24/outline/index.js',
      '@heroicons/react/24/solid': '@heroicons/react/24/solid/index.js',
    };
    
    return config;
  },
  
  // Заголовки безопасности и кеширования
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Отключаем кеширование для статических файлов в development
          ...(process.env.NODE_ENV === 'development' ? [
            { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }
          ] : [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
          ]),
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      // Отключаем кеширование для всех JS файлов в development
      ...(process.env.NODE_ENV === 'development' ? [{
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }
        ],
      }] : []),
    ];
  },
  
  // Оптимизация для production
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: true,
    },
  }),
};

module.exports = nextConfig; 