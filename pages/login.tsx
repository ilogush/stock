import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import type { NextPage } from 'next';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../components/AuthContext';
import { TOAST_MESSAGES } from '../lib/toastMessages';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const LoginPage: NextPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, loading: authLoading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginForm, setIsLoginForm] = useState(true);
  
  // Поля для регистрации
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  // Перенаправляем если пользователь уже авторизован
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Определяем, является ли введенное значение email
      const isEmail = username.includes('@');
      
      const loginData = isEmail 
        ? { email: username, password }
        : { username: username, password };
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(TOAST_MESSAGES.SUCCESS.LOGIN, 'success');
        router.push('/');
      } else {
        showToast(data.error || 'Неверный email/имя пользователя или пароль', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Ошибка при входе', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotPasswordEmail,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при восстановлении пароля');
      }

      showToast('Пароль отправлен на ваш email', 'success');
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Валидация пароля
    if (regPassword.length < 4) {
      showToast('Пароль должен содержать минимум 4 символа', 'error');
      setLoading(false);
      return;
    }
    
    try {
      // Создаем пользователя
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: regPassword,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при регистрации');
      }

      // Автоматически входим в систему после регистрации
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: regPassword,
        }),
      });

      const loginData = await loginResponse.json();
      
      if (!loginResponse.ok) {
        throw new Error(loginData.error || 'Ошибка при входе после регистрации');
      }
      
      showToast(TOAST_MESSAGES.SUCCESS.USER_CREATED, 'success');
      
      // Переадресация в админку после небольшой задержки для показа уведомления
      setTimeout(() => {
        router.push('/');
      }, 1000);
      
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Показываем загрузку пока проверяется аутентификация
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-500">Загрузка</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 px-2 py-0.52 bg-white">
      <div className="grid lg:grid-cols-2 items-center gap-6 max-w-6xl w-full">
        {/* форма входа/регистрации */}
        <div className="border border-slate-300 rounded-lg p-6 max-w-md shadow-[0_2px_22px_-4px_rgba(93,96,127,0.2)] max-lg:mx-auto bg-white">
          {isLoginForm ? (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="mb-12">
                <h1 className="text-slate-900 text-3xl font-semibold">Вход</h1>
              </div>

              <div>
                <label className="text-slate-900 text-sm font-medium mb-2 block">Email или имя пользователя</label>
                <div className="relative flex items-center">
                  <input
                    name="username"
                    type="text"
                    required
                    className="w-full text-sm text-slate-900 border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                    placeholder="Введите email или имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="#bbb"
                    className="w-[18px] h-[18px] absolute right-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <label className="text-slate-900 text-sm font-medium mb-2 block">Пароль</label>
                <div className="relative flex items-center">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full text-sm text-slate-900 border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {showPassword ? (
                    <EyeSlashIcon
                      className="w-[18px] h-[18px] absolute right-4 cursor-pointer text-gray-400"
                      onClick={() => setShowPassword(false)}
                    />
                  ) : (
                    <EyeIcon
                      className="w-[18px] h-[18px] absolute right-4 cursor-pointer text-gray-400"
                      onClick={() => setShowPassword(true)}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 shrink-0 text-blue-600 focus:ring-blue-500 border-slate-300 rounded-lg"
                  />
                  <label htmlFor="remember-me" className="ml-3 block text-sm text-slate-900">
                    Запомнить меня
                  </label>
                </div>
                <div className="text-sm">
                  <button
                    type="button"
                    className="text-blue-600 hover:underline font-medium"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Забыли пароль?
                  </button>
                </div>
              </div>

              <div className="mt-12">
                <button
                  type="submit"
                  className="w-full btn text-[15px] font-medium tracking-wide shadow-xl focus:outline-none"
                  disabled={loading}
                >
                  {loading ? 'Загрузка' : 'Войти'}
                </button>
                <p className="text-sm mt-6 text-center text-slate-600">
                  Нет аккаунта?
                  <button
                    type="button"
                    className="text-blue-600 font-medium hover:underline ml-1 whitespace-nowrap"
                    onClick={() => setIsLoginForm(false)}
                  >
                    Зарегистрироваться
                  </button>
                </p>
              </div>
            </form>
          ) : showForgotPassword ? (
            <form className="space-y-6" onSubmit={handleForgotPassword}>
              <div className="mb-12">
                <h1 className="text-slate-900 text-3xl font-semibold">Восстановление пароля</h1>
              </div>

              <div>
                <label className="text-slate-900 text-sm font-medium mb-2 block">Email</label>
                <div className="relative flex items-center">
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full text-sm text-slate-900 border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                    placeholder="Введите ваш email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="#bbb"
                    className="w-[18px] h-[18px] absolute right-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-12">
                <button
                  type="submit"
                  className="w-full btn text-[15px] font-medium tracking-wide shadow-xl focus:outline-none"
                  disabled={forgotPasswordLoading}
                >
                  {forgotPasswordLoading ? 'Отправка...' : 'Отправить пароль'}
                </button>
                <p className="text-sm mt-6 text-center text-slate-600">
                  <button
                    type="button"
                    className="text-blue-600 font-medium hover:underline"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Вернуться к входу
                  </button>
                </p>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleRegister}>
              <div className="mb-12">
                <h1 className="text-slate-900 text-3xl font-semibold">Регистрация</h1>
              </div>

              <div>
                <label className="text-slate-900 text-sm font-medium mb-2 block">Имя</label>
                <div className="relative flex items-center">
                  <input
                    name="firstName"
                    type="text"
                    required
                    className="w-full text-sm text-slate-900 border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                    placeholder="Введите ваше имя"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="#bbb"
                    className="w-[18px] h-[18px] absolute right-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <label className="text-slate-900 text-sm font-medium mb-2 block">Фамилия</label>
                <div className="relative flex items-center">
                  <input
                    name="lastName"
                    type="text"
                    required
                    className="w-full text-sm text-slate-900 border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                    placeholder="Введите вашу фамилию"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="#bbb"
                    className="w-[18px] h-[18px] absolute right-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <label className="text-slate-900 text-sm font-medium mb-2 block">Почта</label>
                <div className="relative flex items-center">
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full text-sm text-slate-900 border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                    placeholder="Введите вашу почту"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="#bbb"
                    className="w-[18px] h-[18px] absolute right-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <label className="text-slate-900 text-sm font-medium mb-2 block">Пароль</label>
                <div className="relative flex items-center">
                  <input
                    name="regPassword"
                    type={showRegPassword ? "text" : "password"}
                    required
                    minLength={4}
                    className="w-full text-sm text-slate-900 border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                    placeholder="Создайте пароль (минимум 4 символа)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                  {showRegPassword ? (
                    <EyeSlashIcon
                      className="w-[18px] h-[18px] absolute right-4 cursor-pointer text-gray-400"
                      onClick={() => setShowRegPassword(false)}
                    />
                  ) : (
                    <EyeIcon
                      className="w-[18px] h-[18px] absolute right-4 cursor-pointer text-gray-400"
                      onClick={() => setShowRegPassword(true)}
                    />
                  )}
                </div>
              </div>

              <div className="mt-12">
                <button
                  type="submit"
                  className="w-full btn text-[15px] font-medium tracking-wide shadow-xl focus:outline-none"
                  disabled={loading}
                >
                  {loading ? 'Загрузка' : 'Зарегистрироваться'}
                </button>
                <p className="text-sm mt-6 text-center text-slate-600">
                  Уже есть аккаунт?
                  <button
                    type="button"
                    className="text-blue-600 font-medium hover:underline ml-1 whitespace-nowrap"
                    onClick={() => setIsLoginForm(true)}
                  >
                    Войти
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>

        {/* image section - скрыто на мобильных устройствах */}
        <div className="max-lg:mt-8 hidden lg:block">
          <img
            src="https://readymadeui.com/login-image.webp"
            className="w-full aspect-[71/50] mx-auto block object-cover rounded-lg"
            alt="login img"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 