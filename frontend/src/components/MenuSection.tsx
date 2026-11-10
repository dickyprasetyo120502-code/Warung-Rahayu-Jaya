import React from 'react';
import MenuCard from './MenuCard';
import { CategoryData } from '../schemas/menu.schema';

interface MenuSectionProps {
  categories: CategoryData[];
  cart: Record<string, number>;
  onTambah: (id: string) => void;
  onKurang: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  orderType: 'dine-in' | 'take-away';
  setOrderType: (type: 'dine-in' | 'take-away') => void;
  stocks?: Record<string, number>;
}

export default function MenuSection({
  categories,
  cart,
  onTambah,
  onKurang,
  searchQuery,
  setSearchQuery,
  orderType,
  setOrderType,
  stocks = {},
}: MenuSectionProps) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Filter items in each category
  const filteredCategories = categories
    .map((cat) => {
      const matchingItems = cat.items.filter((item) => {
        if (!normalizedQuery) return true;
        return (
          item.nama.toLowerCase().includes(normalizedQuery) ||
          (item.deskripsi && item.deskripsi.toLowerCase().includes(normalizedQuery))
        );
      });
      return { ...cat, items: matchingItems };
    })
    .filter((cat) => cat.items.length > 0);

  return (
    <>
      {/* Switch Tipe Pesanan: Dine-In vs Take Away */}
      <div className="order-type-container">
        <div className="order-type-switch">
          <button
            type="button"
            className={`order-type-btn ${orderType === 'dine-in' ? 'active' : ''}`}
            onClick={() => setOrderType('dine-in')}
          >
            <span className="icon">🍽️</span>
            <span className="text">
              <strong>Dine-In</strong>
              <small>Makan di Tempat</small>
            </span>
          </button>
          <button
            type="button"
            className={`order-type-btn ${orderType === 'take-away' ? 'active' : ''}`}
            onClick={() => setOrderType('take-away')}
          >
            <span className="icon">🛍️</span>
            <span className="text">
              <strong>Take Away</strong>
              <small>Bungkus / Bawa Pulang</small>
            </span>
          </button>
        </div>
        <p className="order-type-hint">
          {orderType === 'dine-in'
            ? '📌 Pesanan akan diantar ke meja pilihan Anda.'
            : '📌 Pesanan akan dikemas rapi untuk dibawa pulang.'}
        </p>
      </div>

      <div className="search-box">
        <input
          type="text"
          id="search"
          placeholder="🔍 Cari menu favorit Anda..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <h2 className="section-title">🍽️ Daftar Menu</h2>

      {filteredCategories.length === 0 ? (
        <p style={{ textAlign: 'center', margin: '40px 0', color: '#666', fontSize: '18px' }}>
          Menu "{searchQuery}" tidak ditemukan.
        </p>
      ) : (
        filteredCategories.map((cat) => (
          <div key={cat.id}>
            <h2 className="menu-title">{cat.title}</h2>
            <div className="menu-grid">
              {cat.items.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  qty={cart[item.id] || 0}
                  stock={stocks[item.id] !== undefined ? stocks[item.id] : 99}
                  onTambah={onTambah}
                  onKurang={onKurang}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </>
  );
}

