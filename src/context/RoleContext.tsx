
import React, { createContext, useContext, useMemo, useState, ReactNode, useEffect } from 'react';

export type Role = 'viewer' | 'reviewer' | 'admin';

interface RoleContextValue {
  role: Role;
  setRole: (r: Role) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const defaultRole = (import.meta.env.VITE_DEFAULT_ROLE as Role) || 'admin';
  const [role, setRole] = useState<Role>(() => (localStorage.getItem('app.role') as Role) || defaultRole);

  useEffect(() => {
    localStorage.setItem('app.role', role);
  }, [role]);

  const value = useMemo(() => ({ role, setRole }), [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = (): RoleContextValue => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
};
