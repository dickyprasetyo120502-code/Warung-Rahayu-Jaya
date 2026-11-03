import React from 'react';

export default function Navbar({ onSwitchToAdmin }) {
  return (
    <nav className="navbar">
      {/* Logo dan Nama Warung */}
      <div className="logo">
        <img
          src="/images/favicon.jpg"
          alt="Logo Warung Rahayu Jaya"
          className="logo-image"
          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
        />
        <span>Warung Rahayu Jaya</span>
      </div>

      {/* Navigasi & Tombol Admin */}
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

        <button
          type="button"
          className="btn-nav-admin"
          onClick={onSwitchToAdmin}
          title="Buka Dashboard Admin & Stok"
        >
          ⚙️ Dashboard Admin
        </button>
      </div>
    </nav>
  );
}
