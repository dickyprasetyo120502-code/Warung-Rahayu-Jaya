import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { loginSchema } from '../../schemas/auth.schema';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface LoginPageProps {
  onLoginSuccess: (user: any, targetView: 'admin' | 'pos') => void;
  targetView?: 'admin' | 'pos';
}

export default function LoginPage({ onLoginSuccess, targetView = 'pos' }: LoginPageProps) {
  const { login, quickLogin, isLoading, error: authError } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'KASIR' | 'ADMIN'>(
    targetView === 'admin' ? 'ADMIN' : 'KASIR'
  );
  const [username, setUsername] = useState<string>(targetView === 'admin' ? 'admin' : 'kasir');
  const [password, setPassword] = useState<string>(targetView === 'admin' ? 'admin123' : 'kasir123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');

  // Switch role tab
  const handleSelectRole = (role: 'KASIR' | 'ADMIN') => {
    setSelectedRole(role);
    setValidationError('');
    if (role === 'ADMIN') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('kasir');
      setPassword('kasir123');
    }
  };

  // Submit login form with Zod validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // ZOD VALIDATION FRONTEND
    const result = loginSchema.safeParse({
      username: username.trim(),
      password: password.trim(),
      role: selectedRole,
    });

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Input login tidak valid';
      setValidationError(firstIssue);
      return;
    }

    const success = await login(result.data);
    if (success) {
      onLoginSuccess(
        { username, role: selectedRole },
        selectedRole === 'ADMIN' ? 'admin' : 'pos'
      );
    }
  };

  const handleQuick = async (role: 'KASIR' | 'ADMIN') => {
    await quickLogin(role);
    onLoginSuccess({ username: role.toLowerCase(), role }, role === 'ADMIN' ? 'admin' : 'pos');
  };

  const displayError = validationError || authError;

  return (
    <div className="login-page-wrapper">
      <div className="login-card-container">
        {/* Header Logo & Brand */}
        <div className="login-header">
          <div className="login-logo-circle">
            <img
              src="/images/favicon.jpg"
              alt="Logo Warung Rahayu Jaya"
              className="login-brand-img"
            />
          </div>
          <h1 className="login-brand-title">Warung Rahayu Jaya</h1>
          <p className="login-brand-subtitle">
            Sistem Kasir POS & Manajemen Keuangan Restoran
          </p>
          <span className="login-branch-tag">📍 Cabang Villa Gading Harapan, Babelan</span>
        </div>

        {/* Tab Pemilih Akses: POS vs ADMIN */}
        <div className="login-role-selector">
          <button
            type="button"
            className={`login-role-tab ${selectedRole === 'KASIR' ? 'active' : ''}`}
            onClick={() => handleSelectRole('KASIR')}
          >
            <span className="role-tab-icon">🛒</span>
            <div className="role-tab-text">
              <strong>Kasir / POS</strong>
              <small>Pemesanan Meja</small>
            </div>
          </button>

          <button
            type="button"
            className={`login-role-tab ${selectedRole === 'ADMIN' ? 'active' : ''}`}
            onClick={() => handleSelectRole('ADMIN')}
          >
            <span className="role-tab-icon">⚙️</span>
            <div className="role-tab-text">
              <strong>Admin</strong>
              <small>Stok & Keuangan</small>
            </div>
          </button>
        </div>

        {/* Notifikasi Error jika login salah atau gagal validasi Zod */}
        {displayError && (
          <div className="login-error-alert">
            <span>⚠️</span>
            <p>{displayError}</p>
          </div>
        )}

        {/* Form Input Login */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label htmlFor="login-username">
              {selectedRole === 'ADMIN' ? 'Username Admin' : 'ID / Username Kasir'}
            </label>
            <div className="login-input-wrapper">
              <span className="input-icon">👤</span>
              <Input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={selectedRole === 'ADMIN' ? 'Contoh: admin' : 'Contoh: kasir'}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-input-group">
            <label htmlFor="login-password">
              {selectedRole === 'ADMIN' ? 'Password / PIN Admin' : 'PIN / Password Kasir'}
            </label>
            <div className="login-input-wrapper">
              <span className="input-icon">🔒</span>
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan PIN / Password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn-toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-bold bg-[#193D2C] hover:bg-[#112A1E] text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Memverifikasi...' : `Masuk ke ${selectedRole === 'ADMIN' ? 'Dashboard Admin' : 'Kasir POS'}`}
          </Button>
        </form>

        {/* Pemisah atau Masuk Cepat (Quick Demo) */}
        <div className="login-divider">
          <span>ATAU MASUK CEPAT (DEMO)</span>
        </div>

        <div className="quick-login-grid">
          <button
            type="button"
            className="btn-quick-kasir"
            onClick={() => handleQuick('KASIR')}
            disabled={isLoading}
          >
            <span>🛒</span>
            <div className="quick-btn-info">
              <strong>Masuk Kasir POS</strong>
              <small>User: kasir • PIN: 1234</small>
            </div>
          </button>

          <button
            type="button"
            className="btn-quick-admin"
            onClick={() => handleQuick('ADMIN')}
            disabled={isLoading}
          >
            <span>👑</span>
            <div className="quick-btn-info">
              <strong>Masuk Admin</strong>
              <small>User: admin • PIN: admin123</small>
            </div>
          </button>
        </div>

        {/* Footer Keamanan */}
        <div className="login-footer-notice">
          <p>🔒 Sistem Terenkripsi & Terintegrasi Real-Time dengan Midtrans</p>
          <small>© 2026 Warung Rahayu Jaya. Hak Cipta Dilindungi.</small>
        </div>
      </div>
    </div>
  );
}

