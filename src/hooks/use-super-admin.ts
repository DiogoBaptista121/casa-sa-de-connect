import { useAuth } from '@/contexts/AuthContext';

const SUPER_ADMIN_EMAIL = 'wp7.baptista.ktm@gmail.com';

/**
 * Hook to check if the current user is the super admin.
 * Super admin has exclusive access to delete operations.
 */
export function useSuperAdmin() {
  const { user, isAdmin } = useAuth();
  
  const isSuperAdmin = isAdmin && user?.email === SUPER_ADMIN_EMAIL;
  
  return { isSuperAdmin };
}
