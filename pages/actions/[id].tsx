import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { useToast } from '../../components/ToastContext';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../components/AuthContext';
import { useRouter } from 'next/router';
import { useUserRole } from '../../lib/hooks/useUserRole';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface UserAction {
  id: number;
  user_id: number;
  action_name: string;
  status: string;
  details: string | null;
  created_at: string;
  user: User | null;
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = params?.id;
  const { data, error } = await supabaseAdmin
    .from('user_actions')
    .select(`
      *,
      user:users!user_actions_user_id_fkey (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('id', id)
    .single();
    
  if (error || !data) {
    return { notFound: true };
  }
  return { props: { action: data } };
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'bg-green-100 text-green-800';
    case 'error': return 'bg-red-100 text-red-800';
    case 'warning': return 'bg-yellow-100 text-yellow-800';
    case 'info': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'success': return 'Успешно';
    case 'error': return 'Ошибка';
    case 'warning': return 'Предупреждение';
    case 'info': return 'Информация';
    default: return status;
  }
};

export default function ActionDetail({ action }: { action: UserAction }) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { hasAnyRole, loading: roleLoading } = useUserRole();
  const router = useRouter();

  // Проверяем роль пользователя
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Показываем загрузку или сообщение о запрете доступа
  const allowed = hasAnyRole(['admin', 'director']);
  if (!user || roleLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Проверка прав доступа...</div>
        </div>
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Доступ запрещён</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ---------- WEB VIEW (не печать) ---------- */}
      <div className="space-y-6 print:hidden">
        <PageHeader
          title={`Действие #${action.id}`}
          showBackButton
        >
          <button
            onClick={() => window.print()}
            className="btn text-xs flex items-center justify-center hover:bg-gray-800 hover:text-white hidden sm:flex"
            title="Печать"
          >
            <PrinterIcon className="w-4 h-4" />
          </button>
        </PageHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium">ID действия:</span> {action.id}
            </div>
            <div>
              <span className="font-medium">Дата и время:</span> {new Date(action.created_at).toLocaleString('ru-RU')}
            </div>
            <div>
              <span className="font-medium">Пользователь:</span> {action.user?.first_name || 'Неизвестный'} {action.user?.last_name || 'пользователь'}
            </div>
            <div>
              <span className="font-medium">Email:</span> {action.user?.email || 'Не указан'}
            </div>
            <div>
              <span className="font-medium">Действие:</span> {action.action_name}
            </div>
            <div>
              <span className="font-medium">Статус:</span>{' '}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(action.status)}`}>
                {getStatusLabel(action.status).toLowerCase()}
              </span>
            </div>
          </div>
          
          {action.details && (
            <div>
              <span className="font-medium">Детали:</span>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
                {action.details}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- PRINT VIEW ---------- */}
      <div className="hidden print:block">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Действие пользователя</h1>
          <p className="text-gray-600">ID: {action.id}</p>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><strong>Дата и время:</strong> {new Date(action.created_at).toLocaleString('ru-RU')}</div>
            <div><strong>Пользователь:</strong> {action.user?.first_name || 'Неизвестный'} {action.user?.last_name || 'пользователь'}</div>
            <div><strong>Email:</strong> {action.user?.email || 'Не указан'}</div>
            <div><strong>Действие:</strong> {action.action_name}</div>
            <div><strong>Статус:</strong> {getStatusLabel(action.status).toLowerCase()}</div>
          </div>
          
          {action.details && (
            <div>
              <strong>Детали:</strong>
              <div className="mt-2 p-3 border rounded">
                {action.details}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 