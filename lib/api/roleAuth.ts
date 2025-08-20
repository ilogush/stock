/**
 * Система ролевой авторизации для API endpoints
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import { getUserById } from '../auth';
import { handleAuthError, handlePermissionError } from './errorHandling';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: number;
    email: string;
    role_id: number;
    role?: {
      id: number;
      name: string;
      display_name: string;
    };
  };
}

/**
 * Роли и их уровни доступа
 */
export const ROLES = {
  ADMIN: 1,          // Администратор - полный доступ
  DIRECTOR: 2,       // Директор - управление и отчеты
  MANAGER: 3,        // Менеджер - товары, заказы, клиенты  
  BRAND_MANAGER: 4,  // Бренд-менеджер - только свои бренды
  STOREKEEPER: 5,    // Кладовщик - склад и поступления
  BRIGADIR: 6,       // Бригадир - производство
  USER: 7            // Обычный пользователь - только профиль
} as const;

/**
 * Проверки ролей
 */
export const RoleChecks = {
  isAdmin: (roleId: number) => roleId === ROLES.ADMIN,
  isDirector: (roleId: number) => roleId === ROLES.DIRECTOR,
  isManager: (roleId: number) => roleId === ROLES.MANAGER,
  isBrandManager: (roleId: number) => roleId === ROLES.BRAND_MANAGER,
  isStorekeeper: (roleId: number) => roleId === ROLES.STOREKEEPER,
  isBrigadir: (roleId: number) => roleId === ROLES.BRIGADIR,
  isUser: (roleId: number) => roleId === ROLES.USER,
  
  // Комбинированные проверки
  isAdminOrDirector: (roleId: number) => ([ROLES.ADMIN, ROLES.DIRECTOR] as number[]).includes(roleId),
  isManagement: (roleId: number) => ([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER] as number[]).includes(roleId),
  canManageProducts: (roleId: number) => ([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.BRAND_MANAGER] as number[]).includes(roleId),
  canManageWarehouse: (roleId: number) => ([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.STOREKEEPER] as number[]).includes(roleId),
  canManageProduction: (roleId: number) => ([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.BRIGADIR] as number[]).includes(roleId),
  canViewReports: (roleId: number) => ([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER] as number[]).includes(roleId)
};

/**
 * Middleware для проверки аутентификации
 */
export function withAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void | NextApiResponse>) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Получаем куки
      const cookies = parse(req.headers.cookie || '');
      const userIdStr = cookies.user_id;

      if (!userIdStr) {
        return handleAuthError('Требуется авторизация', res);
      }

      // Парсим userId как number
      const userId = parseInt(userIdStr, 10);
      if (isNaN(userId)) {
        return handleAuthError('Неверный токен авторизации', res);
      }

      // Получаем пользователя из БД
      const user = await getUserById(userId);
      
      if (!user) {
        return handleAuthError('Пользователь не найден', res);
      }

      if (user.is_blocked) {
        return handleAuthError('Пользователь заблокирован', res, 403);
      }

      // Добавляем пользователя в запрос
      req.user = user;

      // Вызываем основной обработчик
      return await handler(req, res);
    } catch (error) {
      console.error('Ошибка middleware аутентификации:', error);
      return handleAuthError('Ошибка авторизации', res, 500);
    }
  };
}

/**
 * Middleware для проверки конкретных ролей
 */
export function withRoles(allowedRoles: number[]) {
  return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void | NextApiResponse>) => {
    return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      if (!req.user) {
        return handleAuthError('Пользователь не аутентифицирован', res);
      }

      if (!allowedRoles.includes(req.user.role_id)) {
        return handlePermissionError(
          `Недостаточно прав. Требуется одна из ролей: ${allowedRoles.join(', ')}`
        , res);
      }

      return await handler(req, res);
    });
  };
}

/**
 * Middleware для проверки функциональных разрешений
 */
export function withPermissions(permissionCheck: (roleId: number) => boolean, errorMessage?: string) {
  return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void | NextApiResponse>) => {
    return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      if (!req.user) {
        return handleAuthError('Пользователь не аутентифицирован', res);
      }

      if (!permissionCheck(req.user.role_id)) {
        return handlePermissionError(
          errorMessage || 'Недостаточно прав для выполнения операции'
        , res);
      }

      return await handler(req, res);
    });
  };
}

/**
 * Middleware для админ-только endpoints
 */
export const withAdminOnly = withRoles([ROLES.ADMIN]);

/**
 * Middleware для управления (админ + директор)
 */
export const withManagement = withPermissions(RoleChecks.isManagement);

/**
 * Middleware для работы с товарами
 */
export const withProductAccess = withPermissions(
  RoleChecks.canManageProducts,
  'Недостаточно прав для управления товарами'
);

/**
 * Middleware для работы со складом
 */
export const withWarehouseAccess = withPermissions(
  RoleChecks.canManageWarehouse,
  'Недостаточно прав для работы со складом'
);

/**
 * Middleware для работы с производством
 */
export const withProductionAccess = withPermissions(
  RoleChecks.canManageProduction,
  'Недостаточно прав для управления производством'
);

/**
 * Middleware для просмотра отчетов
 */
export const withReportsAccess = withPermissions(
  RoleChecks.canViewReports,
  'Недостаточно прав для просмотра отчетов'
);

/**
 * Проверяет владение ресурсом (например, может ли пользователь редактировать конкретную запись)
 */
export function checkResourceOwnership(
  req: AuthenticatedRequest,
  resourceOwnerId: number,
  allowedRoles: number[] = [ROLES.ADMIN, ROLES.DIRECTOR]
): boolean {
  if (!req.user) return false;
  
  // Админы и директора могут всё
  if (allowedRoles.includes(req.user.role_id)) return true;
  
  // Проверяем владение ресурсом
  return req.user.id === resourceOwnerId;
}

/**
 * Middleware для проверки владения ресурсом или админских прав
 */
export function withResourceOwnership(
  getResourceOwnerId: (req: AuthenticatedRequest) => Promise<number | null>,
  allowedRoles: number[] = [ROLES.ADMIN, ROLES.DIRECTOR]
) {
  return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void | NextApiResponse>) => {
    return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      if (!req.user) {
        return handleAuthError('Пользователь не аутентифицирован', res);
      }

      // Получаем ID владельца ресурса
      const resourceOwnerId = await getResourceOwnerId(req);
      
      if (resourceOwnerId === null) {
        return handlePermissionError('Ресурс не найден или недоступен', res);
      }

      // Проверяем права
      if (!checkResourceOwnership(req, resourceOwnerId, allowedRoles)) {
        return handlePermissionError('Недостаточно прав для доступа к ресурсу', res);
      }

      return await handler(req, res);
    });
  };
}

/**
 * Утилиты для логирования доступа
 */
export function logAccess(req: AuthenticatedRequest, action: string, resource?: string) {
  const user = req.user;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  console.log(`[ACCESS] User:${user?.id} Role:${user?.role_id} Action:${action} Resource:${resource || 'N/A'} IP:${ip}`);
}
