'use client';

import { createContext, useContext } from 'react';

import type { AdminAccessSnapshot, AdminPermission } from '@/lib/access-control';

const AdminAccessContext = createContext<AdminAccessSnapshot | null>(null);

export function AdminAccessProvider({
  access,
  children,
}: {
  access: AdminAccessSnapshot;
  children: React.ReactNode;
}) {
  return (
    <AdminAccessContext.Provider value={access}>
      {children}
    </AdminAccessContext.Provider>
  );
}

export function useAdminAccess() {
  const value = useContext(AdminAccessContext);

  if (!value) {
    throw new Error('useAdminAccess debe usarse dentro de AdminAccessProvider');
  }

  return {
    ...value,
    hasPermission(permission: AdminPermission) {
      return value.permissions.includes(permission);
    },
  };
}
