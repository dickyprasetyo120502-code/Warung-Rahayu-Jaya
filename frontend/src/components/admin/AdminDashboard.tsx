import React, { useState, useEffect, useMemo } from 'react';
import ProfitReport from './ProfitReport';
import api from '../../lib/api';
import {
  getStocks,
  updateStock,
  setAllStocks,
  getTransactions,
  clearAllTransactions,
} from '../../utils/stockStorage';
import {
  getMenuCategories,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  MenuCategory,
} from '../../data/menuData';
import { AuthUser } from '../../schemas/auth.schema';
import { OrderData } from '../../schemas/order.schema';
import { updateStockSchema, MenuItemData } from '../../schemas/menu.schema';

const PRESET_IMAGES = [
  { label: 'Ayam Goreng', path: '/images/ayam-goreng.jpg' },
  { label: 'Ayam Bakar', path: '/images/ayam-bakar.jpg' },
  { label: 'Ayam Bumbu Bali', path: '/images/ayam-bumbu-bali.jpg' },
  { label: 'Ayam Bekakak', path: '/images/ayam-bekakak.jpg' },
  { label: 'Nila Goreng', path: '/images/nila-goreng.jpg' },
  { label: 'Nila Bakar', path: '/images/nila-bakar.jpg' },
  { label: 'Ikan Pesmol', path: '/images/ikan-pesmol.jpg' },
  { label: 'Pecel Lele', path: '/images/pecel-lele.jpg' },
  { label: 'Soto', path: '/images/soto.jpg' },
  { label: 'Ati Ampela', path: '/images/ati-ampela.jpg' },
  { label: 'Tahu', path: '/images/tahu.jpg' },
  { label: 'Tempe', path: '/images/tempe.jpg' },
  { label: 'Nasi Putih', path: '/images/nasi-putih.jpg' },
  { label: 'Es Teh Manis', path: '/images/es-teh-manis.jpg' },
  { label: 'Es Jeruk', path: '/images/es-jeruk.jpg' },
  { label: 'Air Mineral', path: '/images/air-mineral.jpg' },
  { label: 'Es Batu', path: '/images/es-batu.jpg' },
];

interface AdminDashboardProps {
  authUser?: AuthUser | null;
  onLogout?: () => void;
}

export default function AdminDashboard({ authUser, onLogout }: AdminDashboardProps) {
  const [categories, setCategories] = useState<MenuCategory[]>(() => getMenuCategories());
  const [stocks, setStocks] = useState<Record<string, number>>(getStocks());
  const [transactions, setTransactions] = useState<OrderData[]>(getTransactions());
  const [adminTab, setAdminTab] = useState<'dashboard' | 'kelola-menu' | 'laporan'>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchStock, setSearchStock] = useState<string>('');
  const [stockFilterType, setStockFilterType] = useState<'all' | 'low' | 'out'>('all');

  const [isMenuModalOpen, setIsMenuModalOpen] = useState<boolean>(false);
  const [editingMenuItem, setEditingMenuItem] = useState<(MenuItemData & { categoryId?: string }) | null>(null);
  const [menuFormName, setMenuFormName] = useState<string>('');
  const [menuFormCategory, setMenuFormCategory] = useState<string>('ayam');
  const [menuFormCustomCat, setMenuFormCustomCat] = useState<string>('');
  const [menuFormPrice, setMenuFormPrice] = useState<number | ''>('');
  const [menuFormStock, setMenuFormStock] = useState<number | ''>(0);
  const [menuFormDesc, setMenuFormDesc] = useState<string>('');
  const [menuFormImage, setMenuFormImage] = useState<string>('/images/ayam-goreng.jpg');
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');
  const [menuFilterCat, setMenuFilterCat] = useState<string>('all');

  useEffect(() => {
    const handleStockUpdate = () => {
      setStocks(getStocks());
    };
    const handleTxUpdate = () => {
      setTransactions(getTransactions());
    };
    const handleMenuUpdate = () => {
      setCategories(getMenuCategories());
    };

    window.addEventListener('wrj_stock_updated', handleStockUpdate);
    window.addEventListener('wrj_transactions_updated', handleTxUpdate);
    window.addEventListener('wrj_menu_updated', handleMenuUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'wrj_menu_stocks') setStocks(getStocks());
      if (e.key === 'wrj_sales_transactions') setTransactions(getTransactions());
      if (e.key === 'wrj_menu_categories') setCategories(getMenuCategories());
    });

    return () => {
      window.removeEventListener('wrj_stock_updated', handleStockUpdate);
      window.removeEventListener('wrj_transactions_updated', handleTxUpdate);
      window.removeEventListener('wrj_menu_updated', handleMenuUpdate);
    };
  }, []);

  const handleOpenAddMenu = () => {
    setEditingMenuItem(null);
    setMenuFormName('');
    setMenuFormCategory(categories[0]?.id || 'ayam');
    setMenuFormCustomCat('');
    setMenuFormPrice('');
    setMenuFormStock(20);
    setMenuFormDesc('');
    setMenuFormImage('/images/ayam-goreng.jpg');
    setIsMenuModalOpen(true);
  };

  const handleOpenEditMenu = (item: MenuItemData & { categoryId?: string }) => {
    setEditingMenuItem(item);
    setMenuFormName(item.nama);
    setMenuFormCategory(item.categoryId || 'ayam');
    setMenuFormCustomCat('');
    setMenuFormPrice(item.harga);
    setMenuFormStock(stocks[item.id] !== undefined ? stocks[item.id] : 20);
    setMenuFormDesc(item.deskripsi || '');
    setMenuFormImage(item.gambar || '/images/ayam-goreng.jpg');
    setIsMenuModalOpen(true);
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuFormName.trim()) {
      alert('⚠️ Nama menu wajib diisi.');
      return;
    }
    const priceNum = Number(menuFormPrice);
    if (!priceNum || priceNum <= 0) {
      alert('⚠️ Harga menu harus lebih dari Rp 0.');
      return;
    }
    const stockNum = menuFormStock === '' ? 20 : Math.max(0, Number(menuFormStock));

    let finalCatId = menuFormCategory;
    let finalCatTitle: string | undefined;

    if (menuFormCategory === '__new__') {
      if (!menuFormCustomCat.trim()) {
        alert('⚠️ Nama kategori baru wajib diisi.');
        return;
      }
      finalCatTitle = menuFormCustomCat.trim();
      finalCatId = finalCatTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    if (editingMenuItem) {
      try {
        await api.put(`/menu/${editingMenuItem.id}`, {
          nama: menuFormName.trim(),
          harga: priceNum,
          deskripsi: menuFormDesc.trim() || null,
          gambar: menuFormImage.trim() || '/images/ayam-goreng.jpg',
          stock: stockNum,
          categoryId: finalCatId,
          categoryTitle: finalCatTitle,
        });
      } catch (err: any) {
        console.warn('Backend edit menu offline:', err.message);
      }

      const updated = updateMenuItem(editingMenuItem.id, {
        nama: menuFormName.trim(),
        harga: priceNum,
        deskripsi: menuFormDesc.trim() || null,
        gambar: menuFormImage.trim() || '/images/ayam-goreng.jpg',
        initialStock: stockNum,
        categoryId: finalCatId,
      });
      setCategories(updated);
      setIsMenuModalOpen(false);
      alert(`✅ Menu "${menuFormName.trim()}" berhasil diperbarui!`);
    } else {
      let createdId: string | undefined;
      try {
        const res = await api.post('/menu', {
          nama: menuFormName.trim(),
          harga: priceNum,
          deskripsi: menuFormDesc.trim() || null,
          gambar: menuFormImage.trim() || '/images/ayam-goreng.jpg',
          stock: stockNum,
          categoryId: finalCatId,
          categoryTitle: finalCatTitle,
        });
        if (res.data?.item?.id) {
          createdId = res.data.item.id;
        }
      } catch (err: any) {
        console.warn('Backend add menu offline:', err.message);
      }

      const updated = addMenuItem(
        finalCatId,
        {
          id: createdId,
          nama: menuFormName.trim(),
          harga: priceNum,
          deskripsi: menuFormDesc.trim() || null,
          gambar: menuFormImage.trim() || '/images/ayam-goreng.jpg',
          initialStock: stockNum,
        },
        finalCatTitle
      );
      setCategories(updated);
      setIsMenuModalOpen(false);
      alert(`✅ Menu baru "${menuFormName.trim()}" berhasil ditambahkan!`);
    }
  };

  const handleDeleteMenu = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus menu "${itemName}"?`)) {
      return;
    }

    try {
      await api.delete(`/menu/${itemId}`);
    } catch (err: any) {
      console.warn('Backend delete menu offline:', err.message);
    }

    const updated = deleteMenuItem(itemId);
    setCategories(updated);
  };

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
    if (window.confirm('Apakah Anda yakin ingin mereset seluruh data transaksi dan stok semua menu kembali ke 0?')) {
      clearAllTransactions();
      setTransactions([]);

      const zeroStocks: Record<string, number> = {};
      categories.forEach((cat) => {
        cat.items.forEach((item) => {
          zeroStocks[item.id] = 0;
        });
      });
      setAllStocks(zeroStocks);
      setStocks(zeroStocks);

      alert('✅ Semua data pesanan dan stok menu berhasil direset ke 0.');
    }
  };

  const { totalPendapatan, totalTransaksi, aov, paymentStats, bestSellers } = useMemo(() => {
    let income = 0;
    const paymentCount = { qris: 0, cash: 0, edc: 0 };
    const menuSoldMap: Record<string, { id: string; nama: string; gambar?: string; harga: number; qty: number; totalRevenue: number }> = {};

    const paidTx = transactions.filter((tx) => tx.paymentStatus !== 'PENDING');
    paidTx.forEach((tx) => {
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

    const txCount = paidTx.length;
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

  const allMenuItems = useMemo(() => {
    const list: (MenuItemData & { categoryTitle: string })[] = [];
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        list.push({ ...item, categoryId: cat.id, categoryTitle: cat.title });
      });
    });
    return list;
  }, [categories]);

  const filteredManagedMenus = useMemo(() => {
    return allMenuItems.filter((item) => {
      if (menuFilterCat !== 'all' && item.categoryId !== menuFilterCat) {
        return false;
      }
      if (
        menuSearchQuery.trim() &&
        !item.nama.toLowerCase().includes(menuSearchQuery.toLowerCase().trim())
      ) {
        return false;
      }
      return true;
    });
  }, [allMenuItems, menuFilterCat, menuSearchQuery]);

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
            className={`admin-nav-tab-btn ${adminTab === 'kelola-menu' ? 'active' : ''}`}
            onClick={() => setAdminTab('kelola-menu')}
          >
            <span className="tab-icon">🍽️</span>
            <span>Kelola Menu (Tambah & Edit)</span>
          </button>

          <button
            type="button"
            className={`admin-nav-tab-btn ${adminTab === 'laporan' ? 'active' : ''}`}
            onClick={() => setAdminTab('laporan')}
          >
            <span className="tab-icon">📑</span>
            <span>Laporan Penghasilan Kotor & Histori</span>
          </button>
        </div>
      </div>

      {adminTab === 'laporan' ? (
        <ProfitReport
          transactions={transactions}
          stocks={stocks}
          totalPendapatanHariIni={totalPendapatan}
        />
      ) : adminTab === 'kelola-menu' ? (
        <div className="laptop-admin-content">
          <div className="laptop-welcome-banner" style={{ marginBottom: '24px' }}>
            <div className="welcome-info">
              <span className="welcome-date">{currentDateStr}</span>
              <h1>Manajemen Katalog Menu Restoran</h1>
              <p>
                Tambah menu baru, ubah nama, harga, kategori, stok, dan foto menu. Semua perubahan langsung tampil di layar kasir POS dan pemesanan customer.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddMenu}
              style={{
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>➕</span>
              <span>Tambah Menu Baru</span>
            </button>
          </div>

          <div className="laptop-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="stock-search-input" style={{ flex: '1', minWidth: '240px', maxWidth: '400px' }}>
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Cari nama menu untuk diedit..."
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                />
              </div>

              <div className="category-filter-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className={`filter-pill ${menuFilterCat === 'all' ? 'active' : ''}`}
                  onClick={() => setMenuFilterCat('all')}
                >
                  Semua ({allMenuItems.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`filter-pill ${menuFilterCat === cat.id ? 'active' : ''}`}
                    onClick={() => setMenuFilterCat(cat.id)}
                  >
                    {cat.title} ({cat.items.length})
                  </button>
                ))}
              </div>
            </div>

            <div className="laptop-table-container">
              <table className="laptop-stock-table">
                <thead>
                  <tr>
                    <th>Foto & Nama Menu</th>
                    <th>Kategori</th>
                    <th style={{ textAlign: 'right' }}>Harga Jual</th>
                    <th style={{ textAlign: 'center' }}>Stok</th>
                    <th style={{ textAlign: 'right' }}>Aksi Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredManagedMenus.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                        Belum ada menu yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredManagedMenus.map((item) => {
                      const currentStock = stocks[item.id] !== undefined ? stocks[item.id] : 20;
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="table-menu-cell">
                              <img
                                src={item.gambar || '/images/ayam-goreng.jpg'}
                                alt={item.nama}
                                className="table-menu-img"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/ayam-goreng.jpg';
                                }}
                              />
                              <div>
                                <div className="table-menu-name">{item.nama}</div>
                                <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.deskripsi || 'Tidak ada deskripsi'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ background: '#F1F5F9', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                              {item.categoryTitle}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '800', color: '#15803D', fontSize: '15px' }}>
                            Rp {item.harga.toLocaleString('id-ID')}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`stock-pill-badge ${currentStock === 0 ? 'empty' : currentStock <= 5 ? 'low' : 'ok'}`}>
                              {currentStock} porsi
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditMenu(item)}
                                style={{
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span>✏️</span> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMenu(item.id, item.nama)}
                                style={{
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  border: '1px solid #FECACA',
                                  borderRadius: '6px',
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                }}
                              >
                                🗑️ Hapus
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
      ) : (
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

          <div className="laptop-main-grid">
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
                    {categories.map((cat) => (
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

            <div className="laptop-column-right">
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
          className={`mobile-nav-btn ${adminTab === 'kelola-menu' ? 'active' : ''}`}
          onClick={() => {
            setAdminTab('kelola-menu');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="m-nav-icon">🍽️</span>
          <span className="m-nav-label">Menu</span>
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
          <span className="m-nav-label">Penghasilan</span>
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

      {isMenuModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1E293B' }}>
                  {editingMenuItem ? `✏️ Edit Menu: ${editingMenuItem.nama}` : '➕ Tambah Menu Baru'}
                </h2>
                <small style={{ color: '#64748B' }}>
                  Isi detail menu dengan lengkap. Perubahan akan langsung tersinkron ke kasir POS.
                </small>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  NAMA MENU *
                </label>
                <input
                  type="text"
                  required
                  value={menuFormName}
                  onChange={(e) => setMenuFormName(e.target.value)}
                  placeholder="Contoh: Bebek Goreng Sambal Korek"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    KATEGORI MENU *
                  </label>
                  <select
                    value={menuFormCategory}
                    onChange={(e) => setMenuFormCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box', background: '#FFFFFF' }}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title}
                      </option>
                    ))}
                    <option value="__new__">+ Buat Kategori Baru...</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    HARGA JUAL (RP) *
                  </label>
                  <input
                    type="number"
                    required
                    min={500}
                    value={menuFormPrice}
                    onChange={(e) => setMenuFormPrice(e.target.value ? parseInt(e.target.value, 10) : '')}
                    placeholder="Contoh: 25000"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {menuFormCategory === '__new__' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1D4ED8', marginBottom: '6px' }}>
                    NAMA KATEGORI BARU *
                  </label>
                  <input
                    type="text"
                    required
                    value={menuFormCustomCat}
                    onChange={(e) => setMenuFormCustomCat(e.target.value)}
                    placeholder="Contoh: 🥤 Minuman Segar"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #93C5FD', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#EFF6FF' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  STOK AWAL / PORSI TERSEDIA
                </label>
                <input
                  type="number"
                  min={0}
                  value={menuFormStock}
                  onChange={(e) => setMenuFormStock(e.target.value !== '' ? parseInt(e.target.value, 10) : '')}
                  placeholder="20"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  DESKRIPSI MENU
                </label>
                <textarea
                  rows={2}
                  value={menuFormDesc}
                  onChange={(e) => setMenuFormDesc(e.target.value)}
                  placeholder="Keterangan singkat tentang cita rasa atau isi menu..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  GAMBAR / FOTO MENU
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                  <img
                    src={menuFormImage || '/images/ayam-goreng.jpg'}
                    alt="Preview"
                    style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/ayam-goreng.jpg';
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <select
                      value={PRESET_IMAGES.some((p) => p.path === menuFormImage) ? menuFormImage : ''}
                      onChange={(e) => {
                        if (e.target.value) setMenuFormImage(e.target.value);
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', marginBottom: '6px', background: '#F8FAFC' }}
                    >
                      <option value="">-- Pilih Foto Bawaan atau ketik URL di bawah --</option>
                      {PRESET_IMAGES.map((img) => (
                        <option key={img.path} value={img.path}>
                          📷 {img.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={menuFormImage}
                      onChange={(e) => setMenuFormImage(e.target.value)}
                      placeholder="/images/ayam-goreng.jpg atau https://..."
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', paddingTop: '14px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#16A34A', fontWeight: '800', color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.3)' }}
                >
                  {editingMenuItem ? '💾 Simpan Perubahan Menu' : '➕ Tambahkan Menu Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

