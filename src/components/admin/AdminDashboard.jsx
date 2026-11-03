import React, { useState, useEffect, useMemo } from 'react';
import ProfitReport from './ProfitReport';
import {
  getStocks,
  updateStock,
  getTransactions,
  clearAllTransactions,
} from '../../utils/stockStorage';
import { MENU_CATEGORIES } from '../../data/menuData';

export default function AdminDashboard({ onSwitchToPOS }) {
  const [stocks, setStocks] = useState(getStocks());
  const [transactions, setTransactions] = useState(getTransactions());
  const [adminTab, setAdminTab] = useState('dashboard'); // 'dashboard' | 'laporan'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchStock, setSearchStock] = useState('');
  const [stockFilterType, setStockFilterType] = useState('all'); // 'all' | 'low' | 'out'

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

  // Update stok per item
  const handleUpdateStock = (itemId, newStock) => {
    const updated = updateStock(itemId, newStock);
    setStocks(updated);
  };

  const handleQuickAdd = (itemId, addQty) => {
    const current = stocks[itemId] !== undefined ? stocks[itemId] : 0;
    const updated = updateStock(itemId, current + addQty);
    setStocks(updated);
  };

  const handleSetZero = (itemId) => {
    const updated = updateStock(itemId, 0);
    setStocks(updated);
  };

  // Reset semua transaksi menjadi 0 kembali
  const handleResetTransactions = () => {
    if (window.confirm('Apakah Anda yakin ingin mereset seluruh data transaksi hari ini kembali ke 0?')) {
      const empty = clearAllTransactions();
      setTransactions(empty);
    }
  };

  // Kalkulasi data finansial murni dimulai dari 0
  const { totalPendapatan, totalTransaksi, aov, paymentStats, bestSellers } = useMemo(() => {
    let income = 0;
    const paymentCount = { qris: 0, cash: 0, edc: 0 };
    const menuSoldMap = {};

    transactions.forEach((tx) => {
      income += tx.total || 0;
      if (tx.paymentMethod && paymentCount[tx.paymentMethod] !== undefined) {
        paymentCount[tx.paymentMethod] += 1;
      }

      // Count sold items
      if (Array.isArray(tx.cartItems)) {
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

    // Hitung persentase metode bayar
    const totalPay = txCount || 1;
    const qrisPct = txCount > 0 ? Math.round((paymentCount.qris / totalPay) * 100) : 0;
    const cashPct = txCount > 0 ? Math.round((paymentCount.cash / totalPay) * 100) : 0;
    const edcPct = txCount > 0 ? 100 - (qrisPct + cashPct) : 0;

    // Urutkan menu terlaris
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

  // Flatten all menu items untuk pengatur stok
  const allMenuItems = useMemo(() => {
    const list = [];
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

      // Filter kategori
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }

      // Filter search
      if (
        searchStock.trim() &&
        !item.nama.toLowerCase().includes(searchStock.toLowerCase())
      ) {
        return false;
      }

      // Filter status stok
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

          <button
            type="button"
            className="btn-laptop-pos"
            onClick={onSwitchToPOS}
          >
            🛒 Buka Kasir / POS
          </button>

          <button
            type="button"
            className="btn-laptop-reset"
            onClick={handleResetTransactions}
            title="Reset data transaksi ke 0"
          >
            🔄 Reset Data Hari Ini
          </button>
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
          totalPendapatanHariIni={totalPendapatan}
        />
      ) : (
        /* ================= KONDISI TAMPILAN: DASHBOARD OPERASIONAL & STOK ================= */
        <div className="laptop-admin-content">
          {/* Banner Selamat Datang Laptop */}
          <div className="laptop-welcome-banner">
            <div className="welcome-info">
              <span className="welcome-date">{currentDateStr}</span>
              <h1>Dashboard Operasional & Pengatur Stok</h1>
              <p>
                Semua angka penjualan dimulai dari 0 dan diperbarui secara otomatis saat ada transaksi di POS. Stok yang diubah di sini langsung tersinkron ke POS.
              </p>
            </div>
            <div className="welcome-shift-card">
              <div className="shift-dot-box">
                <span className="shift-pulse-dot"></span>
                <strong>Shift Aktif</strong>
              </div>
              <small>Kasir: Standar • Mode Real-Time</small>
            </div>
          </div>

          {/* 4 METRIC CARDS (MULAI DARI 0) */}
          <div className="laptop-metrics-grid">
            {/* 1. Pendapatan Hari Ini */}
            <div className="laptop-metric-card primary">
              <div className="metric-top">
                <span className="metric-title">Total Pendapatan Hari Ini</span>
                <span className="metric-icon-box">💰</span>
              </div>
              <div className="metric-large-num">
                Rp {totalPendapatan.toLocaleString('id-ID')}
              </div>
              <span className="metric-sub-info">
                {totalTransaksi > 0
                  ? `Akumulasi dari ${totalTransaksi} transaksi POS`
                  : 'Belum ada transaksi (Rp 0)'}
              </span>
            </div>

            {/* 2. Total Transaksi */}
            <div className="laptop-metric-card">
              <div className="metric-top">
                <span className="metric-title">Jumlah Transaksi</span>
                <span className="metric-icon-box">🧾</span>
              </div>
              <div className="metric-large-num">{totalTransaksi}</div>
              <span className="metric-sub-info">
                {totalTransaksi > 0 ? 'Pesanan berhasil diselesaikan' : 'Mulai dari 0 pesanan'}
              </span>
            </div>

            {/* 3. Laba Bersih */}
            <div className="laptop-metric-card">
              <div className="metric-top">
                <span className="metric-title">Laba Bersih Hari Ini</span>
                <span className="metric-icon-box">📈</span>
              </div>
              <div className="metric-large-num">
                Rp {totalPendapatan.toLocaleString('id-ID')}
              </div>
              <span className="metric-sub-info">Estimasi margin bersih ~100%</span>
            </div>

            {/* 4. Rata-rata Nilai Order (AOV) */}
            <div className="laptop-metric-card">
              <div className="metric-top">
                <span className="metric-title">Rata-rata Order (AOV)</span>
                <span className="metric-icon-box">📊</span>
              </div>
              <div className="metric-large-num">
                Rp {aov.toLocaleString('id-ID')}
              </div>
              <span className="metric-sub-info">Rata-rata per struk belanja</span>
            </div>
          </div>

          {/* LAYOUT 2 KOLOM BESAR LAPTOP (KIRI: PENGATUR STOK & PEMBAYARAN, KANAN: LIVE FEED & BEST SELLERS) */}
          <div className="laptop-main-layout">
            {/* ================= KOLOM KIRI: FITUR PENGATUR STOK REAL-TIME ================= */}
            <div className="laptop-col-left">
              <section className="laptop-card-box stock-manager-box">
                <div className="box-header-row">
                  <div>
                    <h2 className="box-title">📦 Pengatur Stok Menu (Real-Time POS)</h2>
                    <p className="box-subtitle">
                      Atur ketersediaan bahan/porsi di bawah ini (misal: Ayam Bakar 10 porsi, Ayam Goreng 6 porsi). Stok di POS akan langsung mengikuti, dan otomatis berkurang saat customer membeli!
                    </p>
                  </div>
                </div>

                {/* Toolbar Filter & Search Stok */}
                <div className="stock-toolbar-laptop">
                  <input
                    type="text"
                    placeholder="🔍 Cari nama menu (misal: Ayam, Nila, Nasi)..."
                    value={searchStock}
                    onChange={(e) => setSearchStock(e.target.value)}
                    className="stock-input-search"
                  />

                  <div className="stock-category-tabs">
                    <button
                      type="button"
                      className={`tab-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedCategory('all')}
                    >
                      Semua Kategori
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${selectedCategory === 'ayam' ? 'active' : ''}`}
                      onClick={() => setSelectedCategory('ayam')}
                    >
                      🍗 Menu Ayam
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${selectedCategory === 'ikan' ? 'active' : ''}`}
                      onClick={() => setSelectedCategory('ikan')}
                    >
                      🐟 Menu Ikan
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${selectedCategory === 'tambahan' ? 'active' : ''}`}
                      onClick={() => setSelectedCategory('tambahan')}
                    >
                      🍽️ Tambahan
                    </button>
                  </div>

                  <div className="stock-status-pills">
                    <button
                      type="button"
                      className={`pill-btn ${stockFilterType === 'all' ? 'active' : ''}`}
                      onClick={() => setStockFilterType('all')}
                    >
                      Semua ({allMenuItems.length})
                    </button>
                    <button
                      type="button"
                      className={`pill-btn warning ${stockFilterType === 'low' ? 'active' : ''}`}
                      onClick={() => setStockFilterType('low')}
                    >
                      ⚠️ Menipis (≤5)
                    </button>
                    <button
                      type="button"
                      className={`pill-btn danger ${stockFilterType === 'out' ? 'active' : ''}`}
                      onClick={() => setStockFilterType('out')}
                    >
                      ❌ Habis (0)
                    </button>
                  </div>
                </div>

                {/* Tabel / Grid Item Stok */}
                <div className="stock-grid-laptop">
                  {filteredStockItems.map((item) => {
                    const stock = stocks[item.id] !== undefined ? stocks[item.id] : 0;
                    const isOut = stock === 0;
                    const isLow = stock > 0 && stock <= 5;

                    return (
                      <div key={item.id} className={`stock-card-laptop ${isOut ? 'out' : ''}`}>
                        <div className="stock-card-top">
                          <img src={item.gambar} alt={item.nama} className="stock-thumb" />
                          <div className="stock-item-text">
                            <strong>{item.nama}</strong>
                            <span className="stock-category-name">{item.categoryTitle}</span>
                            <span className="stock-price-tag">Rp{item.harga.toLocaleString('id-ID')}</span>
                          </div>
                        </div>

                        <div className="stock-indicator-row">
                          <span className="stock-label-title">Status Stok di POS:</span>
                          {isOut && <span className="badge-out">❌ Stok Habis</span>}
                          {isLow && <span className="badge-low">⚠️ Sisa {stock} porsi</span>}
                          {!isOut && !isLow && (
                            <span className="badge-ok">✓ Tersedia ({stock} porsi)</span>
                          )}
                        </div>

                        {/* Kontrol Stok Instan */}
                        <div className="stock-actions-row">
                          <div className="stock-stepper">
                            <button
                              type="button"
                              className="btn-step"
                              onClick={() => handleUpdateStock(item.id, Math.max(0, stock - 1))}
                              title="Kurang 1 porsi"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={stock}
                              onChange={(e) => handleUpdateStock(item.id, e.target.value)}
                              className="input-stock-num"
                              title="Ketik angka stok langsung"
                            />
                            <button
                              type="button"
                              className="btn-step"
                              onClick={() => handleUpdateStock(item.id, stock + 1)}
                              title="Tambah 1 porsi"
                            >
                              +
                            </button>
                          </div>

                          <div className="stock-quick-btns">
                            <button
                              type="button"
                              className="btn-quick-add"
                              onClick={() => handleQuickAdd(item.id, 5)}
                              title="Tambah 5 porsi"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              className="btn-quick-add"
                              onClick={() => handleQuickAdd(item.id, 10)}
                              title="Tambah 10 porsi"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              className="btn-quick-zero"
                              onClick={() => handleSetZero(item.id)}
                              title="Set Stok Jadi 0 (Habis)"
                            >
                              Habis
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Metode Pembayaran Hari Ini */}
              <section className="laptop-card-box payment-ratio-laptop">
                <h3 className="box-title">💳 Metode Pembayaran Digunakan Hari Ini</h3>
                <p className="box-subtitle">
                  {totalTransaksi > 0
                    ? `Distribusi dari total ${totalTransaksi} pembayaran yang masuk`
                    : 'Belum ada transaksi pembayaran'}
                </p>

                <div className="payment-bar-laptop">
                  <div
                    className="bar-segment qris"
                    style={{ width: `${paymentStats.qrisPct || 0}%` }}
                    title={`QRIS: ${paymentStats.qris} transaksi`}
                  ></div>
                  <div
                    className="bar-segment cash"
                    style={{ width: `${paymentStats.cashPct || 0}%` }}
                    title={`Tunai: ${paymentStats.cash} transaksi`}
                  ></div>
                  <div
                    className="bar-segment edc"
                    style={{ width: `${paymentStats.edcPct || 0}%` }}
                    title={`EDC: ${paymentStats.edc} transaksi`}
                  ></div>
                </div>

                <div className="payment-legend-row">
                  <div className="legend-item">
                    <span className="dot qris"></span>
                    <strong>QRIS Midtrans</strong>
                    <span>{paymentStats.qris} Tx ({paymentStats.qrisPct}%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="dot cash"></span>
                    <strong>Tunai Kasir</strong>
                    <span>{paymentStats.cash} Tx ({paymentStats.cashPct}%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="dot edc"></span>
                    <strong>EDC / Kartu</strong>
                    <span>{paymentStats.edc} Tx ({paymentStats.edcPct}%)</span>
                  </div>
                </div>
              </section>
            </div>

            {/* ================= KOLOM KANAN: LIVE TRANSAKSI & MENU TERLARIS ================= */}
            <div className="laptop-col-right">
              {/* Live Feed Transaksi Terkini */}
              <section className="laptop-card-box live-tx-box">
                <div className="box-header-flex">
                  <div>
                    <h3 className="box-title">🧾 Transaksi Terkini</h3>
                    <p className="box-subtitle">Pembaruan otomatis dari POS Kasir</p>
                  </div>
                  <span className="badge-live-pulse">● Live Feed</span>
                </div>

                <div className="tx-list-laptop">
                  {transactions.length === 0 ? (
                    <div className="empty-tx-laptop">
                      <span className="empty-icon">📭</span>
                      <strong>Belum Ada Transaksi Hari Ini</strong>
                      <p>
                        Data dimulai dari 0. Saat customer memesan dan membayar di POS, rincian transaksi akan langsung muncul di sini.
                      </p>
                      <button
                        type="button"
                        className="btn-try-pos"
                        onClick={onSwitchToPOS}
                      >
                        Buka POS & Coba Transaksi
                      </button>
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
                          <span className="tx-timestamp">{tx.time}</span>
                        </div>
                        <div className="tx-row-right">
                          <strong className="tx-amount">
                            Rp {(tx.total || 0).toLocaleString('id-ID')}
                          </strong>
                          <span className="tx-method-pill">
                            {tx.paymentMethod ? tx.paymentMethod.toUpperCase() : 'QRIS'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Menu Terlaris Hari Ini (Murni dari Transaksi) */}
              <section className="laptop-card-box bestsellers-box">
                <h3 className="box-title">🔥 Menu Terlaris Hari Ini</h3>
                <p className="box-subtitle">Dihitung otomatis dari pesanan yang masuk</p>

                <div className="bestsellers-list-laptop">
                  {bestSellers.length === 0 ? (
                    <div className="empty-bestseller">
                      <p>Belum ada menu yang terjual hari ini.</p>
                    </div>
                  ) : (
                    bestSellers.map((item, idx) => (
                      <div key={item.id} className="bestseller-item-laptop">
                        <span className="rank-num">#{idx + 1}</span>
                        <img src={item.gambar} alt={item.nama} className="rank-thumb" />
                        <div className="rank-details">
                          <strong>{item.nama}</strong>
                          <small>{item.qty} porsi terjual</small>
                        </div>
                        <div className="rank-revenue">
                          <strong>Rp {item.totalRevenue.toLocaleString('id-ID')}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOTTOM NAVIGATION BAR KHUSUS HP ================= */}
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
          className="mobile-nav-btn"
          onClick={onSwitchToPOS}
        >
          <span className="m-nav-icon">🛒</span>
          <span className="m-nav-label">Kasir / POS</span>
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
      </nav>
    </div>
  );
}
