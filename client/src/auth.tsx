import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; role: string; phone?: string }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('expohub_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem('expohub_token'))
      .finally(() => setLoading(false));
  }, []);

  const persist = (token: string, u: User) => {
    localStorage.setItem('expohub_token', token);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });
    persist(r.data.token, r.data.user);
    return r.data.user as User;
  };

  const register = async (data: { name: string; email: string; password: string; role: string; phone?: string }) => {
    const r = await api.post('/auth/register', data);
    persist(r.data.token, r.data.user);
    return r.data.user as User;
  };

  const logout = () => {
    localStorage.removeItem('expohub_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
