'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { fetchPermissions, PermissionsData } from '@/lib/api';

interface PermissionContextValue {
  permissions: PermissionsData | null;
  loading: boolean;
  hasPermission: (key: string) => boolean;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: null,
  loading: true,
  hasPermission: () => true, // default allow when not loaded
  refresh: async () => {},
});

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    try {
      const result = await fetchPermissions();
      setPermissions(result.data);
    } catch {
      // Not logged in or no enterprise - set empty permissions
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = useCallback((key: string): boolean => {
    if (!permissions) return false;
    // Admins always have all permissions
    if (permissions.isAdmin) return true;
    return permissions.myPermissions.includes(key);
  }, [permissions]);

  return (
    <PermissionContext.Provider value={{ permissions, loading, hasPermission, refresh: loadPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
