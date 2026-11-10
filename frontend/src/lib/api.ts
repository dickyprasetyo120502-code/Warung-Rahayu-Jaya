import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// Request interceptor untuk menyematkan JWT Token
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('wrj_jwt_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Gagal membaca token otentikasi:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor untuk menangani 401 (Token Expired / Invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('wrj_jwt_token');
      localStorage.removeItem('wrj_auth_user');
      window.dispatchEvent(new CustomEvent('wrj_auth_changed', { detail: null }));
    }
    return Promise.reject(error);
  }
);

export default api;

