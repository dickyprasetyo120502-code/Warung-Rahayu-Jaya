import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { AuthUser, LoginInput } from '../schemas/auth.schema';
import { loginUser as localLoginUser, quickLogin as localQuickLogin, logoutUser as localLogoutUser, getAuthUser } from '../utils/authStorage';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<boolean>;
  quickLogin: (role: 'ADMIN' | 'KASIR') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('wrj_jwt_token'));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync auth state across browser tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getAuthUser());
      setToken(localStorage.getItem('wrj_jwt_token'));
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('wrj_auth_changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wrj_auth_changed', handleStorageChange);
    };
  }, []);

  const login = async (input: LoginInput): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Coba panggil Backend REST API dengan Axios
      const res = await api.post('/auth/login', input);
      if (res.data && res.data.success) {
        const { user: apiUser, token: apiToken } = res.data;
        setUser(apiUser);
        setToken(apiToken);
        localStorage.setItem('wrj_jwt_token', apiToken);
        localStorage.setItem('wrj_auth_user', JSON.stringify(apiUser));
        window.dispatchEvent(new CustomEvent('wrj_auth_changed', { detail: apiUser }));
        setIsLoading(false);
        return true;
      }
    } catch (err: any) {
      console.warn('Backend API tidak merespons, beralih ke otentikasi lokal terintegrasi:', err.message);
    }

    // 2. Fallback ke sistem otentikasi lokal
    const localRes = localLoginUser(input.role.toLowerCase() as 'admin' | 'kasir', input.username, input.password);
    setIsLoading(false);

    if (localRes.success && localRes.user) {
      const formattedUser: AuthUser = {
        id: input.role === 'ADMIN' ? 1 : 2,
        username: localRes.user.username,
        role: input.role,
        name: localRes.user.name,
      };
      const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(formattedUser))}.signature`;
      setUser(formattedUser);
      setToken(mockJwt);
      localStorage.setItem('wrj_jwt_token', mockJwt);
      localStorage.setItem('wrj_auth_user', JSON.stringify(formattedUser));
      window.dispatchEvent(new CustomEvent('wrj_auth_changed', { detail: formattedUser }));
      return true;
    } else {
      setError(localRes.message || 'Username atau password salah.');
      return false;
    }
  };

  const quickLogin = async (role: 'ADMIN' | 'KASIR') => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', {
        username: role.toLowerCase(),
        password: role === 'ADMIN' ? 'admin123' : 'kasir123',
        role,
      });
      if (res.data?.success) {
        const { user: apiUser, token: apiToken } = res.data;
        setUser(apiUser);
        setToken(apiToken);
        localStorage.setItem('wrj_jwt_token', apiToken);
        localStorage.setItem('wrj_auth_user', JSON.stringify(apiUser));
        window.dispatchEvent(new CustomEvent('wrj_auth_changed', { detail: apiUser }));
        setIsLoading(false);
        return;
      }
    } catch {
      // fallback
    }

    const localUser = localQuickLogin(role.toLowerCase() as 'admin' | 'kasir');
    const formattedUser: AuthUser = {
      id: role === 'ADMIN' ? 1 : 2,
      username: localUser.username,
      role,
      name: role === 'ADMIN' ? 'Admin' : 'Kasir',
    };
    const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(formattedUser))}.signature`;
    setUser(formattedUser);
    setToken(mockJwt);
    localStorage.setItem('wrj_jwt_token', mockJwt);
    localStorage.setItem('wrj_auth_user', JSON.stringify(formattedUser));
    window.dispatchEvent(new CustomEvent('wrj_auth_changed', { detail: formattedUser }));
    setIsLoading(false);
  };

  const logout = () => {
    localLogoutUser();
    localStorage.removeItem('wrj_jwt_token');
    setUser(null);
    setToken(null);
    window.dispatchEvent(new CustomEvent('wrj_auth_changed', { detail: null }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        login,
        quickLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
};

