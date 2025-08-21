import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  telegram: string | null;
  role_id: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string, passwordOnly?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Проверяем аутентификацию при загрузке
  useEffect(() => {
    checkAuth();
  }, []);



  const checkAuth = async () => {
    try {
      // Добавляем небольшую задержку для более плавной работы
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        setUser(null);
        // Перенаправляем на страницу входа если не авторизован и не на публичной странице
        if (router.pathname !== '/login') {
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Ошибка проверки аутентификации:', error);
      setUser(null);
      if (router.pathname !== '/login') {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      }
    } catch (error) {
      console.error('Ошибка обновления данных пользователя:', error);
    }
  };

  const login = async (identifier: string, password: string, passwordOnly: boolean = false): Promise<boolean> => {
    try {
      setLoading(true);
      
      let loginData;
      
      if (passwordOnly) {
        // Вход только по паролю
        loginData = { password };
      } else {
        // Определяем, является ли identifier email или именем
        const isEmail = identifier.includes('@');
        loginData = isEmail 
          ? { email: identifier, password }
          : { username: identifier, password };
      }
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setLoading(false);
        return true;
      } else {
        // Если бэкенд сообщил, что сессия на другом устройстве завершила текущую — покажем тост/редирект обработает checkAuth
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 