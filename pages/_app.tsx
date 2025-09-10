import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ToastProvider } from '../components/ToastContext';
import { AuthProvider } from '../components/AuthContext';
import Layout from '../components/Layout';

// Отключаем React DevTools в development для стабильности
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Отключаем предупреждение о React DevTools
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('Download the React DevTools')) {
      return; // Игнорируем предупреждение о React DevTools
    }
    originalConsoleWarn.apply(console, args);
  };
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <AuthProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </AuthProvider>
    </ToastProvider>
  );
} 