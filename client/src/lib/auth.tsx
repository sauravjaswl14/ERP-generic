import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, getToken, setToken } from './api';
import type { Role } from './access';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  tenant: { slug: string; name: string };
}

const WORKSPACE_KEY = 'erp_workspace';

/** Last workspace that signed in on this browser, to prefill the login form. */
export const lastWorkspace = () => {
  try {
    return localStorage.getItem(WORKSPACE_KEY) ?? '';
  } catch {
    return '';
  }
};

const remember = (slug: string) => {
  try {
    localStorage.setItem(WORKSPACE_KEY, slug);
  } catch {
    /* storage unavailable: the field simply will not be prefilled next time */
  }
};

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (workspace: string, email: string, password: string) => Promise<void>;
  register: (data: { companyName: string; workspace: string; adminName: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());
  const qc = useQueryClient();

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    if (!getToken()) return;
    api<{ user: User }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener('erp:unauthorized', logout);
    return () => window.removeEventListener('erp:unauthorized', logout);
  }, [logout]);

  const login = async (workspace: string, email: string, password: string) => {
    const r = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { workspace, email, password } });
    setToken(r.token);
    setUser(r.user);
    remember(r.user.tenant.slug);
  };

  const register: AuthState['register'] = async (data) => {
    const r = await api<{ token: string; user: User }>('/tenants/register', { method: 'POST', body: data });
    setToken(r.token);
    setUser(r.user);
    remember(r.user.tenant.slug);
  };

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
