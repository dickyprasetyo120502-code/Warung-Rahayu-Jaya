// Utilitas Otentikasi & Sesi Login Warung Rahayu Jaya
// Mendukung login Kasir POS dan Admin
import { AuthUser } from '../schemas/auth.schema';

const AUTH_STORAGE_KEY = 'wrj_auth_user';

export const DEFAULT_ACCOUNTS = {
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'ADMIN',
    name: 'Admin',
    label: 'Admin',
  },
  kasir: {
    username: 'kasir',
    password: 'kasir123',
    role: 'KASIR',
    name: 'Kasir',
    label: 'Kasir',
  },
};

// Ambil sesi user yang sedang aktif
export const getAuthUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Gagal membaca sesi login:', err);
    return null;
  }
};

// Simpan sesi login
export const setAuthUser = (user: AuthUser | null): void => {
  try {
    if (!user) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
    window.dispatchEvent(new CustomEvent('wrj_auth_changed', { detail: user }));
  } catch (err) {
    console.error('Gagal menyimpan sesi login:', err);
  }
};

// Proses Login dengan Validasi
export const loginUser = (
  role: 'admin' | 'kasir' | 'ADMIN' | 'KASIR',
  username: string,
  password?: string
): { success: boolean; user?: AuthUser; message?: string } => {
  const cleanRole = role.toUpperCase();
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  // Validasi khusus admin
  if (cleanRole === 'ADMIN') {
    if (
      cleanUser === 'admin' &&
      (cleanPass === 'admin123' || cleanPass === '123456' || cleanPass === 'admin')
    ) {
      const user: AuthUser = {
        username: 'admin',
        role: 'ADMIN',
        name: 'Admin',
      };
      setAuthUser(user);
      return { success: true, user };
    }
    return {
      success: false,
      message: 'Username atau password Admin salah. (Default: admin / admin123)',
    };
  }

  // Validasi khusus kasir
  if (cleanRole === 'KASIR') {
    if (
      cleanUser === 'kasir' &&
      (cleanPass === 'kasir123' || cleanPass === '1234' || cleanPass === 'kasir')
    ) {
      const user: AuthUser = {
        username: 'kasir',
        role: 'KASIR',
        name: 'Kasir',
      };
      setAuthUser(user);
      return { success: true, user };
    }
    return {
      success: false,
      message: 'Username atau password Kasir salah. (Default: kasir / kasir123)',
    };
  }

  return { success: false, message: 'Role tidak dikenali.' };
};

// Quick Login (Demo Instant)
export const quickLogin = (role: 'admin' | 'kasir' | 'ADMIN' | 'KASIR'): AuthUser => {
  const cleanRole = role.toUpperCase();
  const account = cleanRole === 'ADMIN' ? DEFAULT_ACCOUNTS.admin : DEFAULT_ACCOUNTS.kasir;
  const user: AuthUser = {
    username: account.username,
    role: account.role as 'ADMIN' | 'KASIR',
    name: account.name,
  };
  setAuthUser(user);
  return user;
};

// Logout / Keluar Sesi
export const logoutUser = (): void => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('wrj_auth_changed', { detail: null }));
  } catch (err) {
    console.error('Gagal menghapus sesi login:', err);
  }
};
