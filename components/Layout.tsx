import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CacheBuster from './CacheBuster';

import ErrorBoundary from './ErrorBoundary';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    if (!loading && !user && router.pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, router]);

  const toggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      // На десктопе переключаем collapsed состояние
      setSidebarCollapsed(!sidebarCollapsed);
    } else {
      // На мобильных переключаем открытие/закрытие
      setSidebarOpen(!sidebarOpen);
    }
  };

  if (router.pathname === '/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ErrorBoundary>
      <CacheBuster>
        <div className="antialiased bg-gray-50 min-h-screen">
          <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={toggleSidebar} />
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} collapsed={sidebarCollapsed} />
          
          <main className={`p-4 h-auto pt-20 bg-gray-50 ${
            sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
          }`}>
            {children}
          </main>
        </div>
      </CacheBuster>
    </ErrorBoundary>
  );
} 