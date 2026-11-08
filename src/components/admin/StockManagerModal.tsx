import React, { useState } from 'react';
import { MENU_CATEGORIES } from '../../data/menuData';

interface StockManagerModalProps {
  stocks: Record<string, number>;
  onUpdateStock: (itemId: string, newStock: number) => void;
  onClose: () => void;
}

export default function StockManagerModal({ stocks, onUpdateStock, onClose }: StockManagerModalProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  // Flatten all menu items
  const allItems: { id: string; nama: string; harga: number; deskripsi?: string; gambar?: string; kategori: string }[] = [];
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
              className={`stock-pill ${filter === 'low' ? 'active' : ''}`}
              onClick={() => setFilter('low')}
            >
              ⚠️ Menipis (≤5)
            </button>
            <button
              type="button"
              className={`stock-pill ${filter === 'out' ? 'active' : ''}`}
              onClick={() => setFilter('out')}
            >
              ❌ Habis (0)
            </button>
          </div>
        </div>

        {/* Table of Items */}
        <div className="stock-modal-table-wrap">
          <table className="stock-modal-table">
            <thead>
              <tr>
                <th>Menu</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Status</th>
                <th className="text-center">Sisa Stok</th>
                <th className="text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: '24px', color: '#888' }}>
                    Menu tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const currentStock = stocks[item.id] !== undefined ? stocks[item.id] : 0;
                  const isOutOfStock = currentStock <= 0;
                  const isLowStock = currentStock > 0 && currentStock <= 5;

                  return (
                    <tr
                      key={item.id}
                      className={isOutOfStock ? 'stock-row-out' : isLowStock ? 'stock-row-low' : ''}
                    >
                      <td>
                        <div className="stock-row-menu">
                          <img
                            src={item.gambar || '/images/ayam-goreng.jpg'}
                            alt={item.nama}
                            className="stock-mini-thumb"
                          />
                          <span>{item.nama}</span>
                        </div>
                      </td>
                      <td>
                        <span className="stock-cat-badge">{item.kategori}</span>
                      </td>
                      <td>Rp{item.harga.toLocaleString('id-ID')}</td>
                      <td>
                        {isOutOfStock ? (
                          <span className="stock-tag-out">❌ Habis</span>
                        ) : isLowStock ? (
                          <span className="stock-tag-low">⚠️ Sisa {currentStock}</span>
                        ) : (
                          <span className="stock-tag-safe">✓ Tersedia</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="stock-counter">
                          <button
                            type="button"
                            onClick={() => onUpdateStock(item.id, Math.max(0, currentStock - 1))}
                            disabled={currentStock <= 0}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={currentStock}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              onUpdateStock(item.id, isNaN(val) ? 0 : Math.max(0, val));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateStock(item.id, currentStock + 1)}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="stock-quick-actions">
                          <button
                            type="button"
                            className="btn-add-quick"
                            onClick={() => onUpdateStock(item.id, currentStock + 5)}
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            className="btn-add-quick"
                            onClick={() => onUpdateStock(item.id, currentStock + 10)}
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            className="btn-set-zero"
                            onClick={() => onUpdateStock(item.id, 0)}
                          >
                            Habis
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

