import React, { useState, useEffect, useMemo } from 'react';
import ProfitReport from './ProfitReport';
import api from '../../lib/api';
import {
  getStocks,
  updateStock,
  getTransactions,
  clearAllTransactions,
} from '../../utils/stockStorage';
import { MENU_CATEGORIES } from '../../data/menuData';
import { AuthUser } from '../../schemas/auth.schema';
import { OrderData } from '../../schemas/order.schema';
import { updateStockSchema, MenuItemData } from '../../schemas/menu.schema';

interface AdminDashboardProps {
  authUser?: AuthUser | null;
  onLogout?: () => void;
}

export default function AdminDashboard({ authUser, onLogout }: AdminDashboardProps) {
  const [stocks, setStocks] = useState<Record<string, number>>(getStocks());
  const [transactions, setTransactions] = useState<OrderData[]>(getTransactions());
  const [adminTab, setAdminTab] = useState<'dashboard' | 'laporan'>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchStock, setSearchStock] = useState<string>('');
  const [stockFilterType, setStockFilterType] = useState<'all' | 'low' | 'out'>('all');

  // Listener sinkronisasi real-time antar tab / window
  useEffect(() => {
    const handleStockUpdate = () => {
      setStocks(getStocks());
    };
    const handleTxUpdate = () => {
      setTransactions(getTransactions());
    };

    window.addEventListener('wrj_stock_updated', handleStockUpdate);
    window.addEventListener('wrj_transactions_updated', handleTxUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'wrj_menu_stocks') setStocks(getStocks());
      if (e.key === 'wrj_sales_transactions') setTransactions(getTransactions());
    });

    return () => {
      window.removeEventListener('wrj_stock_updated', handleStockUpdate);
      window.removeEventListener('wrj_transactions_updated', handleTxUpdate);
    };
  }, []);

  // Update stok per item dengan Zod validation & Axios API call
  const handleUpdateStock = async (itemId: string, newStock: number) => {
    const valResult = updateStockSchema.safeParse({ stock: newStock });
    if (!valResult.success) {
      alert(valResult.error.issues[0]?.message || 'Stok tidak valid');
      return;
    }

    try {
      await api.put(`/menu/${itemId}/stock`, { stock: newStock });
    } catch (e: any) {
      console.warn('Backend REST API tidak aktif, mengupdate stok lokal:', e.message);
    }

    const updated = updateStock(itemId, newStock);
    setStocks(updated);
  };

  const handleQuickAdd = (itemId: string, addQty: number) => {
    const current = stocks[itemId] !== undefined ? stocks[itemId] : 0;
    handleUpdateStock(itemId, current + addQty);
  };

  const handleSetZero = (itemId: string) => {
    handleUpdateStock(itemId, 0);
  };

  const handleResetTransactions = () => {
    if (window.confirm('Apakah Anda yakin ingin mereset seluruh data transaksi hari ini kembali ke 0?')) {
      clearAllTransactions();
      setTransactions([]);
      alert('Data transaksi hari ini telah direset ke 0.');
    }
  };

  // Metrik Finansial
  const { totalPendapatan, totalTransaksi, aov, paymentStats, bestSellers } = useMemo(() => {
    let income = 0;
    const paymentCount = { qris: 0, cash: 0, edc: 0 };
    const menuSoldMap: Record<string, { id: string; nama: string; gambar?: string; harga: number; qty: number; totalRevenue: number }> = {};

    transactions.forEach((tx) => {
      income += tx.total || 0;

      if (tx.paymentMethod === 'qris') paymentCount.qris++;
      else if (tx.paymentMethod === 'cash') paymentCount.cash++;
      else if (tx.paymentMethod === 'edc') paymentCount.edc++;

      if (tx.cartItems && Array.isArray(tx.cartItems)) {
        tx.cartItems.forEach((item) => {
          if (!menuSoldMap[item.id]) {
            menuSoldMap[item.id] = {
              id: item.id,
              nama: item.nama,
              gambar: item.gambar,
              harga: item.harga,
              qty: 0,
              totalRevenue: 0,
            };
          }
          menuSoldMap[item.id].qty += item.qty;
          menuSoldMap[item.id].totalRevenue += item.harga * item.qty;
        });
      }
    });

    const txCount = transactions.length;
    const averageOrder = txCount > 0 ? Math.round(income / txCount) : 0;

    const totalPay = txCount || 1;
    const qrisPct = txCount > 0 ? Math.round((paymentCount.qris / totalPay) * 100) : 0;
    const cashPct = txCount > 0 ? Math.round((paymentCount.cash / totalPay) * 100) : 0;
    const edcPct = txCount > 0 ? 100 - (qrisPct + cashPct) : 0;

    const sortedBestSellers = Object.values(menuSoldMap).sort((a, b) => b.qty - a.qty);

    return {
      totalPendapatan: income,
      totalTransaksi: txCount,
      aov: averageOrder,
      paymentStats: {
        qris: paymentCount.qris,
        cash: paymentCount.cash,
        edc: paymentCount.edc,
        qrisPct,
        cashPct,
        edcPct,
      },
      bestSellers: sortedBestSellers,
    };
  }, [transactions]);

  // Flatten menu items untuk panel pengatur stok
  const allMenuItems = useMemo(() => {
    const list: (MenuItemData & { categoryTitle: string })[] = [];
    MENU_CATEGORIES.forEach((cat) => {
      cat.items.forEach((item) => {
        list.push({ ...item, categoryId: cat.id, categoryTitle: cat.title });
      });
    });
    return list;
  }, []);

  // Filter items di panel pengatur stok
  const filteredStockItems = useMemo(() => {
    return allMenuItems.filter((item) => {
      const stock = stocks[item.id] !== undefined ? stocks[item.id] : 0;

      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }

      if (
        searchStock.trim() &&
        !item.nama.toLowerCase().includes(searchStock.toLowerCase().trim())
      ) {
        return false;
      }

      if (stockFilterType === 'low') return stock > 0 && stock <= 5;
      if (stockFilterType === 'out') return stock === 0;

      return true;
    });
  }, [allMenuItems, stocks, selectedCategory, searchStock, stockFilterType]);

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

  return (
    <div className="laptop-admin-wrapper">
      {/* ================= TOP BAR LAPTOP ================= */}
      <header className="laptop-admin-topbar">
        <div className="topbar-left">
          <div className="brand-badge">
            <img
              src="/images/favicon.jpg"
              alt="Logo Warung Rahayu Jaya"
              className="admin-brand-img"
            />
            <span className="brand-logo">Warung Rahayu Jaya</span>
            <span className="badge-admin">ADMIN PORTAL</span>
          </div>
          <span className="branch-info">• Cabang Utama (Bekasi)</span>
        </div>

        <div className="topbar-right">
          <div className="sync-status-indicator">
            <span className="live-dot-green"></span>
            <span>Sinkronisasi POS Real-Time Aktif</span>
          </div>

          <div className="nav-user-profile" title="Administrator">
            <span>👑</span>
            <span>Admin</span>
          </div>

          <button
            type="button"
            className="btn-laptop-reset"
            onClick={handleResetTransactions}
            title="Reset data transaksi ke 0"
          >
            🔄 Reset Data Hari Ini
          </button>

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
      </header>

      {/* ================= TAB NAVIGASI UTAMA ADMIN (DASHBOARD VS LAPORAN KEUANGAN) ================= */}
      <div className="admin-nav-tabs-wrapper">
        <div className="admin-nav-tabs-container">
          <button
            type="button"
            className={`admin-nav-tab-btn ${adminTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setAdminTab('dashboard')}
          >
            <span className="tab-icon">📊</span>
            <span>Dashboard & Pengatur Stok</span>
          </button>

          <button
            type="button"
            className={`admin-nav-tab-btn ${adminTab === 'laporan' ? 'active' : ''}`}
            onClick={() => setAdminTab('laporan')}
          >
            <span className="tab-icon">📑</span>
            <span>Laporan Laba Bersih (Financial F&B)</span>
            <span className="badge-tab-new">Resmi</span>
          </button>
        </div>
      </div>

      {/* ================= KONDISI TAMPILAN: LAPORAN LABA BERSIH ================= */}
      {adminTab === 'laporan' ? (
        <ProfitReport
          transactions={transactions}
          stocks={stocks}
          totalPendapatanHariIni={totalPendapatan}
        />
      ) : (
        /* ================= KONDISI TAMPILAN: DASHBOARD OPERASIONAL & STOK ================= */
        <div className="laptop-admin-content">
          <div className="laptop-welcome-banner">
            <div className="welcome-info">
              <span className="welcome-date">{currentDateStr}</span>
              <h1>Dashboard Operasional & Pengatur Stok</h1>
              <p>
                Semua angka penjualan dimulai dari 0 dan diperbarui secara otomatis saat ada transaksi di POS. Stok yang diubah di sini langsung tersinkron ke POS.
              </p>
            </div>
            <div className="welcome-shift-badge">
              <span className="live-dot-green"></span>
              <span>Shift Kasir Aktif</span>
            </div>
          </div>

          {/* 4 Kartu Metrik Utama */}
          <div className="laptop-metrics-grid">
            <div className="metric-card-laptop primary-green">
              <div className="metric-header">
                <span className="metric-label">Total Pendapatan Hari Ini</span>
                <span className="metric-icon-badge">💰</span>
              </div>
              <div className="metric-value-huge">
                Rp {totalPendapatan.toLocaleString('id-ID')}
              </div>
              <div className="metric-subtext">
                {totalTransaksi > 0 ? (
                  <span className="text-trend-up">↗ Terhubung langsung dari POS</span>
                ) : (
                  <span>Data dari 0 • Menunggu pesanan pertama</span>
                )}
              </div>
            </div>

            <div className="metric-card-laptop">
              <div className="metric-header">
                <span className="metric-label">Jumlah Transaksi Hari Ini</span>
                <span className="metric-icon-badge">🧾</span>
              </div>
              <div className="metric-value-huge">{totalTransaksi} Transaksi</div>
              <div className="metric-subtext">
                <span>Struk kasir lunas tercatat</span>
              </div>
            </div>

            <div className="metric-card-laptop">
              <div className="metric-header">
                <span className="metric-label">Rata-rata Nilai Pesanan (AOV)</span>
                <span className="metric-icon-badge">📊</span>
              </div>
              <div className="metric-value-huge">
                Rp {aov.toLocaleString('id-ID')}
              </div>
              <div className="metric-subtext">
                <span>Per meja / transaksi pelanggan</span>
              </div>
            </div>

            <div className="metric-card-laptop">
              <div className="metric-header">
                <span className="metric-label">Status Stok Bahan / Menu</span>
                <span className="metric-icon-badge">📦</span>
              </div>
              <div className="metric-value-huge">
                {Object.values(stocks).filter((s) => s <= 0).length} Habis
              </div>
              <div className="metric-subtext">
                <span className="text-warning">
                  {Object.values(stocks).filter((s) => s > 0 && s <= 5).length} Bahan Menipis (≤5)
                </span>
              </div>
            </div>
          </div>

          {/* ================= LAYOUT 2 KOLOM BESAR LAPTOP ================= */}
          <div className="laptop-main-grid">
            {/* KOLOM KIRI: FITUR PENGATUR STOK */}
            <div className="laptop-column-left">
              <div className="stock-manager-card">
                <div className="stock-card-header">
                  <div className="header-title-box">
                    <span className="icon">⚙️</span>
                    <div>
                      <h2>Pengatur Stok Bahan & Menu Dapur</h2>
                      <p>
                        Ubah stok di bawah ini. Nilai stok akan langsung tersinkron ke POS kasir dan otomatis berkurang saat menu dibeli.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Filter & Pencarian Stok */}
                <div className="stock-controls-bar">
                  <div className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Cari ayam, nila, bebek, soto..."
                      value={searchStock}
                      onChange={(e) => setSearchStock(e.target.value)}
                    />
                  </div>

                  <div className="filter-pill-group">
                    <button
                      type="button"
                      className={`filter-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedCategory('all')}
                    >
                      Semua ({allMenuItems.length})
                    </button>
                    {MENU_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`filter-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        {cat.title}
                      </button>
                    ))}
                  </div>

                  <div className="status-filter-pills">
                    <button
                      type="button"
                      className={`status-pill ${stockFilterType === 'all' ? 'active' : ''}`}
                      onClick={() => setStockFilterType('all')}
                    >
                      Semua Status
                    </button>
                    <button
                      type="button"
                      className={`status-pill low ${stockFilterType === 'low' ? 'active' : ''}`}
                      onClick={() => setStockFilterType('low')}
                    >
                      ⚠️ Menipis (≤5)
                    </button>
                    <button
                      type="button"
                      className={`status-pill out ${stockFilterType === 'out' ? 'active' : ''}`}
                      onClick={() => setStockFilterType('out')}
                    >
                      ❌ Habis (0)
                    </button>
                  </div>
                </div>

                {/* Tabel Pengatur Stok Laptop */}
                <div className="stock-table-container">
                  <table className="stock-table">
                    <thead>
                      <tr>
                        <th>Menu / Item</th>
                        <th>Kategori</th>
                        <th>Harga</th>
                        <th>Status</th>
                        <th className="text-center">Sisa Stok</th>
                        <th className="text-center">Aksi Cepat Restock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStockItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center empty-td">
                            Tidak ada item menu yang cocok dengan filter pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredStockItems.map((item) => {
                          const currentStock =
                            stocks[item.id] !== undefined ? stocks[item.id] : 0;
                          const isOut = currentStock <= 0;
                          const isLow = currentStock > 0 && currentStock <= 5;

                          return (
                            <tr
                              key={item.id}
                              className={isOut ? 'row-out-of-stock' : isLow ? 'row-low-stock' : ''}
                            >
                              <td>
                                <div className="stock-item-info">
                                  <img
                                    src={item.gambar || '/images/ayam-goreng.jpg'}
                                    alt={item.nama}
                                    className="stock-thumb"
                                  />
                                  <div>
                                    <strong>{item.nama}</strong>
                                    <small>{item.id}</small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="category-tag">{item.categoryTitle}</span>
                              </td>
                              <td>
                                <span className="price-tag">
                                  Rp {item.harga.toLocaleString('id-ID')}
                                </span>
                              </td>
                              <td>
                                {isOut ? (
                                  <span className="badge-status-out">❌ Stok Habis</span>
                                ) : isLow ? (
                                  <span className="badge-status-low">⚠️ Sisa {currentStock} Porsi</span>
                                ) : (
                                  <span className="badge-status-safe">✓ Aman ({currentStock})</span>
                                )}
                              </td>
                              <td className="text-center">
                                <div className="stock-input-counter">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStock(item.id, Math.max(0, currentStock - 1))}
                                    title="Kurangi 1"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentStock}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      handleUpdateStock(item.id, isNaN(val) ? 0 : Math.max(0, val));
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStock(item.id, currentStock + 1)}
                                    title="Tambah 1"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="text-center">
                                <div className="quick-action-buttons">
                                  <button
                                    type="button"
                                    className="btn-quick-add"
                                    onClick={() => handleQuickAdd(item.id, 5)}
                                  >
                                    +5
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-quick-add"
                                    onClick={() => handleQuickAdd(item.id, 10)}
                                  >
                                    +10
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-quick-zero"
                                    onClick={() => handleSetZero(item.id)}
                                    title="Set stok menjadi 0 (Habis)"
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

            {/* KOLOM KANAN: KANAL PEMBAYARAN, MENU TERLARIS & LOG TRANSAKSI */}
            <div className="laptop-column-right">
              {/* Distribusi Kanal Pembayaran */}
              <div className="admin-side-card">
                <div className="side-card-header">
                  <h3>Metode Pembayaran (Hari Ini)</h3>
                  <span className="badge-live-tag">Live Sync</span>
                </div>

                <div className="payment-distribution-bar">
                  <div
                    className="pay-segment qris"
                    style={{ width: `${paymentStats.qrisPct || (totalTransaksi === 0 ? 33 : 0)}%` }}
                    title={`QRIS: ${paymentStats.qrisPct}%`}
                  ></div>
                  <div
                    className="pay-segment cash"
                    style={{ width: `${paymentStats.cashPct || (totalTransaksi === 0 ? 34 : 0)}%` }}
                    title={`Tunai: ${paymentStats.cashPct}%`}
                  ></div>
                  <div
                    className="pay-segment edc"
                    style={{ width: `${paymentStats.edcPct || (totalTransaksi === 0 ? 33 : 0)}%` }}
                    title={`EDC: ${paymentStats.edcPct}%`}
                  ></div>
                </div>

                <div className="payment-legend-list">
                  <div className="legend-item">
                    <span className="dot qris"></span>
                    <span>QRIS Dinamis</span>
                    <strong>{paymentStats.qrisPct}% ({paymentStats.qris}x)</strong>
                  </div>
                  <div className="legend-item">
                    <span className="dot cash"></span>
                    <span>Tunai Kasir</span>
                    <strong>{paymentStats.cashPct}% ({paymentStats.cash}x)</strong>
                  </div>
                  <div className="legend-item">
                    <span className="dot edc"></span>
                    <span>Debit / EDC</span>
                    <strong>{paymentStats.edcPct}% ({paymentStats.edc}x)</strong>
                  </div>
                </div>
              </div>

              {/* Menu Terlaris */}
              <div className="admin-side-card">
                <div className="side-card-header">
                  <h3>Menu Terlaris (Hari Ini)</h3>
                  <span className="badge-count-tag">{bestSellers.length} Menu</span>
                </div>

                <div className="best-sellers-list-laptop">
                  {bestSellers.length === 0 ? (
                    <div className="empty-sellers">
                      <span>🍽️</span>
                      <p>Belum ada menu yang terjual hari ini.</p>
                      <small>Data otomatis terakumulasi saat ada pesanan di POS.</small>
                    </div>
                  ) : (
                    bestSellers.slice(0, 5).map((item, idx) => (
                      <div key={item.id} className="best-seller-row">
                        <div className="seller-rank">{idx + 1}</div>
                        <img
                          src={item.gambar || '/images/ayam-goreng.jpg'}
                          alt={item.nama}
                          className="seller-img"
                        />
                        <div className="seller-info">
                          <strong>{item.nama}</strong>
                          <small>{item.qty} porsi terjual</small>
                        </div>
                        <div className="seller-revenue">
                          Rp {item.totalRevenue.toLocaleString('id-ID')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Transaksi Terkini */}
              <div className="admin-side-card">
                <div className="side-card-header">
                  <h3>Transaksi Terkini (Feed Kasir)</h3>
                  <span className="badge-count-tag">{transactions.length} Total</span>
                </div>

                <div className="tx-list-laptop">
                  {transactions.length === 0 ? (
                    <div className="empty-tx-laptop">
                      <span className="empty-icon">📭</span>
                      <strong>Belum Ada Transaksi Hari Ini</strong>
                      <p>
                        Data dimulai dari 0. Saat pesanan dibayar di kasir POS, rincian transaksi akan langsung muncul di sini secara real-time.
                      </p>
                    </div>
                  ) : (
                    transactions.map((tx, idx) => (
                      <div key={idx} className="tx-row-laptop">
                        <div className="tx-row-left">
                          <div className="tx-id-badge">
                            <strong>{tx.orderNumber}</strong>
                            <span className="tx-badge-status">Lunas</span>
                          </div>
                          <span className="tx-customer-name">
                            {tx.nama || 'Customer'} • {tx.tableNumber || 'Take Away'}
                          </span>
                          <small className="tx-time-meta">
                            {tx.date} • {tx.paymentMethod?.toUpperCase()}
                          </small>
                        </div>
                        <div className="tx-row-right">
                          <span className="tx-nominal">
                            Rp {tx.total?.toLocaleString('id-ID')}
                          </span>
                          <span className="tx-items-count">
                            {tx.cartItems?.length || 0} Menu
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigasi Mobile Bawah untuk HP */}
      <nav className="admin-mobile-bottom-nav">
        <button
          type="button"
          className={`mobile-nav-btn ${adminTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            setAdminTab('dashboard');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="m-nav-icon">📊</span>
          <span className="m-nav-label">Dashboard</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${adminTab === 'laporan' ? 'active' : ''}`}
          onClick={() => {
            setAdminTab('laporan');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="m-nav-icon">📑</span>
          <span className="m-nav-label">Laba Bersih</span>
        </button>

        <button
          type="button"
          className="mobile-nav-btn"
          onClick={handleResetTransactions}
        >
          <span className="m-nav-icon">🔄</span>
          <span className="m-nav-label">Reset 0</span>
        </button>

        {onLogout && (
          <button
            type="button"
            className="mobile-nav-btn"
            onClick={onLogout}
            style={{ color: '#EF4444' }}
          >
            <span className="m-nav-icon">🚪</span>
            <span className="m-nav-label">Keluar</span>
          </button>
        )}
      </nav>
    </div>
  );
}

