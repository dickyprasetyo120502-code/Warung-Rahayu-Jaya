import React, { useState } from 'react';
import { MENU_CATEGORIES } from '../../data/menuData';

export default function StockManagerModal({ stocks, onUpdateStock, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'low' | 'out'

  // Flatten all menu items
  const allItems = [];
  MENU_CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      allItems.push({ ...item, kategori: cat.title });
    });
  });

  const filteredItems = allItems.filter((item) => {
    const stock = stocks[item.id] !== undefined ? stocks[item.id] : 0;
    const matchSearch =
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    if (filter === 'low') return stock > 0 && stock <= 5;
    if (filter === 'out') return stock === 0;
    return true;
  });

  return (
    <div className="stock-modal-overlay" onClick={onClose}>
      <div className="stock-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="stock-modal-header">
          <div>
            <h2>📦 Pengatur Stok Menu & Bahan</h2>
            <p>Perubahan stok di sini langsung tersinkronisasi ke tampilan POS Kasir.</p>
          </div>
          <button type="button" className="close-x-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Search & Filter Pills */}
        <div className="stock-modal-toolbar">
          <input
            type="text"
            placeholder="🔍 Cari menu untuk atur stok..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="stock-search-input"
          />

          <div className="stock-filter-pills">
            <button
              type="button"
              className={`stock-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Semua ({allItems.length})
            </button>
            <button
              type="button"
              className={`stock-pill warning ${filter === 'low' ? 'active' : ''}`}
              onClick={() => setFilter('low')}
            >
              ⚠️ Menipis (≤5)
            </button>
            <button
              type="button"
              className={`stock-pill danger ${filter === 'out' ? 'active' : ''}`}
              onClick={() => setFilter('out')}
            >
              ❌ Habis (0)
            </button>
          </div>
        </div>

        {/* Stock Items List */}
        <div className="stock-items-table">
          {filteredItems.map((item) => {
            const stock = stocks[item.id] !== undefined ? stocks[item.id] : 0;
            const isOutOfStock = stock === 0;
            const isLowStock = stock > 0 && stock <= 5;

            return (
              <div key={item.id} className="stock-row-item">
                <div className="stock-item-info">
                  <img src={item.gambar} alt={item.nama} className="stock-item-img" />
                  <div>
                    <strong>{item.nama}</strong>
                    <small>
                      Rp{item.harga.toLocaleString('id-ID')} • {item.kategori}
                    </small>
                    <div>
                      {isOutOfStock && <span className="stock-tag-out">Habis</span>}
                      {isLowStock && <span className="stock-tag-low">Sisa {stock} porsi</span>}
                      {!isOutOfStock && !isLowStock && (
                        <span className="stock-tag-ok">Tersedia ({stock})</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="stock-control-group">
                  <button
                    type="button"
                    className="stock-btn-step"
                    onClick={() => onUpdateStock(item.id, Math.max(0, stock - 1))}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => onUpdateStock(item.id, e.target.value)}
                    className="stock-input-number"
                  />
                  <button
                    type="button"
                    className="stock-btn-step"
                    onClick={() => onUpdateStock(item.id, stock + 1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="stock-btn-quick"
                    onClick={() => onUpdateStock(item.id, stock + 10)}
                    title="Tambah 10 porsi"
                  >
                    +10
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="stock-modal-footer">
          <button type="button" className="btn-close-stock" onClick={onClose}>
            ✓ Selesai & Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

