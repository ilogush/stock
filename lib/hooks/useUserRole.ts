import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../components/AuthContext';

export type RoleName =
  | 'admin'
  | 'director'
  | 'user'
  | 'storekeeper'
  | 'brigadir'
  | 'manager'
  | 'brand_manager'
  | 'sales_manager'
  | 'production_manager'
  | 'accountant'
  | string;

export function useUserRole() {
  const { user } = useAuth();
  const [roleName, setRoleName] = useState<RoleName | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRoleName = async () => {
      if (!user) {
        setRoleName(null);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/roles');
        if (res.ok) {
          const data = await res.json();
          const rolesArray = Array.isArray(data) ? data : data.roles || [];
          const role = rolesArray.find((r: any) => r.id === user.role_id);
          const normalized = typeof role?.name === 'string' ? role.name.trim().toLowerCase() : null;
          setRoleName(normalized);
        }
      } catch (e) {
        // no-op; UI уже защищён маршрутами
      } finally {
        setLoading(false);
      }
    };
    fetchRoleName();
  }, [user]);

  const hasAnyRole = useMemo(() => {
    return (allowed: RoleName[]) => !!roleName && allowed.includes(roleName);
  }, [roleName]);

  return { roleName, hasAnyRole, loading } as const;
}


