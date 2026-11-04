// Utilitas Otentikasi & Sesi Login Warung Rahayu Jaya
// Mendukung login Kasir POS dan Admin

const AUTH_STORAGE_KEY = 'wrj_auth_user';

// Akun default sistem
export const DEFAULT_ACCOUNTS = {
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'Admin',
    label: 'Admin',
  },
  kasir: {
    username: 'kasir',
    password: 'kasir123',
    role: 'kasir',
    name: 'Kasir',
    label: 'Kasir',
  },
};

// Ambil sesi user yang sedang aktif
export const getAuthUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Gagal membaca sesi login:', err);
    return null;
  }
};

// Simpan sesi login
export const setAuthUser = (user) => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('wrj_auth_changed', { detail: user }));
  } catch (err) {
    console.error('Gagal menyimpan sesi login:', err);
  }
};

// Proses Login dengan Validasi
export const loginUser = (role, username, password) => {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  // Validasi khusus admin
  if (role === 'admin') {
    if (
      cleanUser === 'admin' &&
      (cleanPass === 'admin123' || cleanPass === '123456' || cleanPass === 'admin')
    ) {
      const user = {
        username: 'admin',
        role: 'admin',
        name: 'Admin',
        label: 'Admin',
        loginTime: new Date().toISOString(),
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
  if (role === 'kasir') {
    if (
      cleanUser === 'kasir' &&
      (cleanPass === 'kasir123' || cleanPass === '1234' || cleanPass === 'kasir')
    ) {
      const user = {
        username: 'kasir',
        role: 'kasir',
        name: 'Kasir',
        label: 'Kasir',
        loginTime: new Date().toISOString(),
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
export const quickLogin = (role) => {
  const account = DEFAULT_ACCOUNTS[role] || DEFAULT_ACCOUNTS.kasir;
  const user = {
    username: account.username,
    role: account.role,
    name: account.name,
    label: account.label,
    loginTime: new Date().toISOString(),
  };
  setAuthUser(user);
  return user;
};

// Logout / Keluar Sesi
export const logoutUser = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('wrj_auth_changed', { detail: null }));
  } catch (err) {
    console.error('Gagal menghapus sesi login:', err);
  }
};
