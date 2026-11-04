import React from 'react';

export default function Navbar({ authUser, onLogout }) {
  return (
    <nav className="navbar">
      {/* Logo dan Nama Warung */}
      <div className="logo">
        <img
          src="/images/favicon.jpg"
          alt="Logo Warung Rahayu Jaya"
          className="logo-image"
          style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
        />
        <span>Warung Rahayu Jaya</span>
      </div>

      {/* Navigasi, Profil Kasir & Tombol Keluar (Logout) */}
      <div className="navbar-actions">
        <ul>
          <li>
            <a href="#menu">Menu</a>
          </li>
          <li>
            <a href="#tentang">Tentang</a>
          </li>
          <li>
            <a href="#kontak">Kontak</a>
          </li>
        </ul>

        {/* Profil Kasir Aktif (Tanpa nama individu) */}
        <div className="nav-user-profile" title="Petugas Kasir Aktif">
          <span>👤</span>
          <span>{authUser?.name === 'Admin' ? 'Admin' : 'Kasir'}</span>
        </div>

        {/* Tombol Keluar kembali ke Halaman Login */}
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
