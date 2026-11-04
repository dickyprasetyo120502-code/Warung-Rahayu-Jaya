import React, { useState } from 'react';
import { loginUser, quickLogin } from '../../utils/authStorage';

export default function LoginPage({ onLoginSuccess, targetView = 'pos' }) {
  const [selectedRole, setSelectedRole] = useState(targetView === 'admin' ? 'admin' : 'kasir');
  const [username, setUsername] = useState(targetView === 'admin' ? 'admin' : 'kasir');
  const [password, setPassword] = useState(targetView === 'admin' ? 'admin123' : 'kasir123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Switch role tab
  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setErrorMessage('');
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('kasir');
      setPassword('kasir123');
    }
  };

  // Submit login form
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const res = loginUser(selectedRole, username, password);
      setIsLoading(false);
      if (res.success) {
        onLoginSuccess(res.user, selectedRole === 'admin' ? 'admin' : 'pos');
      } else {
        setErrorMessage(res.message);
      }
    }, 350);
  };

  // One-click quick login
  const handleQuickLogin = (role) => {
    setIsLoading(true);
    setTimeout(() => {
      const user = quickLogin(role);
      setIsLoading(false);
      onLoginSuccess(user, role === 'admin' ? 'admin' : 'pos');
    }, 250);
  };

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
            className={`login-role-tab ${selectedRole === 'kasir' ? 'active' : ''}`}
            onClick={() => handleSelectRole('kasir')}
          >
            <span className="role-tab-icon">🛒</span>
            <div className="role-tab-text">
              <strong>Kasir / POS</strong>
              <small>Pemesanan Meja</small>
            </div>
          </button>

          <button
            type="button"
            className={`login-role-tab ${selectedRole === 'admin' ? 'active' : ''}`}
            onClick={() => handleSelectRole('admin')}
          >
            <span className="role-tab-icon">⚙️</span>
            <div className="role-tab-text">
              <strong>Admin</strong>
              <small>Stok & Keuangan</small>
            </div>
          </button>
        </div>

        {/* Notifikasi Error jika login salah */}
        {errorMessage && (
          <div className="login-error-alert">
            <span>⚠️</span>
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Form Input Login */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label htmlFor="login-username">
              {selectedRole === 'admin' ? 'Username Admin' : 'ID / Username Kasir'}
            </label>
            <div className="login-input-wrapper">
              <span className="input-icon">👤</span>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={selectedRole === 'admin' ? 'Contoh: admin' : 'Contoh: kasir'}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-input-group">
            <label htmlFor="login-password">
              {selectedRole === 'admin' ? 'Password / PIN Admin' : 'PIN / Password Kasir'}
            </label>
            <div className="login-input-wrapper">
              <span className="input-icon">🔒</span>
              <input
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

          <button
            type="submit"
            className="btn-login-submit"
            disabled={isLoading}
          >
            {isLoading ? 'Memverifikasi...' : `Masuk ke ${selectedRole === 'admin' ? 'Dashboard Admin' : 'Kasir POS'}`}
          </button>
        </form>

        {/* Pemisah atau Masuk Cepat (Quick Demo) */}
        <div className="login-divider">
          <span>ATAU MASUK CEPAT (DEMO)</span>
        </div>

        <div className="quick-login-grid">
          <button
            type="button"
            className="btn-quick-kasir"
            onClick={() => handleQuickLogin('kasir')}
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
            onClick={() => handleQuickLogin('admin')}
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

