import React from 'react';
import { AuthUser } from '../schemas/auth.schema';

interface NavbarProps {
  authUser: AuthUser | null;
  onLogout?: () => void;
  activeTab?: 'menu' | 'orders';
  onSelectTab?: (tab: 'menu' | 'orders') => void;
  ordersCount?: number;
  pendingCount?: number;
}

export default function Navbar({
  authUser,
  onLogout,
  activeTab = 'menu',
  onSelectTab,
  ordersCount = 0,
  pendingCount = 0,
}: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="logo" onClick={() => onSelectTab && onSelectTab('menu')} style={{ cursor: 'pointer' }}>
        <img
          src="/images/favicon.jpg"
          alt="Logo Warung Rahayu Jaya"
          className="logo-image"
          style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
        />
        <span>Warung Rahayu Jaya</span>
      </div>

      {onSelectTab && (
        <div className="pos-nav-switcher">
          <button
            type="button"
            className={`pos-nav-tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => onSelectTab('menu')}
          >
            <span>🛒</span>
            <span>Menu & Kasir</span>
          </button>

          <button
            type="button"
            className={`pos-nav-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => onSelectTab('orders')}
            style={{ position: 'relative' }}
            title={pendingCount > 0 ? `Ada ${pendingCount} pesanan belum dibayar!` : 'Lihat daftar pesanan customer'}
          >
            <span>📋</span>
            <span>Pesanan Customer</span>
            {pendingCount > 0 ? (
              <span
                className="pos-nav-badge has-pending"
                style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontWeight: '900',
                  padding: '2px 8px',
                  boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.85)',
                }}
              >
                {pendingCount}
              </span>
            ) : ordersCount > 0 ? (
              <span className="pos-nav-badge">{ordersCount}</span>
            ) : null}
          </button>
        </div>
      )}

      <div className="navbar-actions">
        <ul>
          <li>
            <a
              href="#menu"
              onClick={(e) => {
                if (onSelectTab) {
                  onSelectTab('menu');
                }
              }}
            >
              Menu
            </a>
          </li>
          <li>
            <a href="#tentang">Tentang</a>
          </li>
          <li>
            <a href="#kontak">Kontak</a>
          </li>
        </ul>

        <div className="nav-user-profile" title="Petugas Kasir Aktif">
          <span>👤</span>
          <span>{authUser?.role === 'ADMIN' ? 'Admin' : 'Kasir'}</span>
        </div>

        {onLogout && (
          <button
            type="button"
            className="btn-nav-logout"
            onClick={onLogout}
            title="Keluar / Logout ke Halaman Login"
          >
            <span>🚪</span>
            <span>Keluar</span>
          </button>
        )}
      </div>
    </nav>
  );
}
