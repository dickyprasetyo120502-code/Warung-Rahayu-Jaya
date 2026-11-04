import React, { useState, useMemo, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MenuSection from './components/MenuSection';
import CartSection from './components/CartSection';
import FloatingCart from './components/FloatingCart';
import AboutSection from './components/AboutSection';
import Footer from './components/Footer';
import ReceiptModal from './components/ReceiptModal';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/auth/LoginPage';
import { MENU_CATEGORIES } from './data/menuData';
import { getStocks } from './utils/stockStorage';
import { getAuthUser, logoutUser } from './utils/authStorage';

export default function App() {
  // Sesi Pengguna Aktif (Kasir / Admin)
  const [authUser, setAuthUser] = useState(() => getAuthUser());

  // URL path detection
  const [currentView, setCurrentView] = useState(() => {
    return window.location.pathname.startsWith('/admin') ? 'admin' : 'pos';
  });

  const [cart, setCart] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState('dine-in'); // 'dine-in' | 'take-away'
  const [receiptData, setReceiptData] = useState(null);
  const [stocks, setStocks] = useState(getStocks());

  // Listen to popstate (back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(window.location.pathname.startsWith('/admin') ? 'admin' : 'pos');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen to stock updates in real-time
  useEffect(() => {
    const handleStockUpdate = () => {
      setStocks(getStocks());
    };
    window.addEventListener('wrj_stock_updated', handleStockUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'wrj_menu_stocks') {
        setStocks(getStocks());
      }
    });
    return () => {
      window.removeEventListener('wrj_stock_updated', handleStockUpdate);
    };
  }, []);

  // Listener perubahan otentikasi antar-tab
  useEffect(() => {
    const handleAuthChange = (e) => {
      setAuthUser(e.detail);
    };
    window.addEventListener('wrj_auth_changed', handleAuthChange);
    return () => window.removeEventListener('wrj_auth_changed', handleAuthChange);
  }, []);

  const navigateTo = (view) => {
    setCurrentView(view);
    const path = view === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user, destination) => {
    setAuthUser(user);
    const target = destination || (user.role === 'admin' ? 'admin' : 'pos');
    navigateTo(target);
  };

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar (logout) ke Halaman Login?')) {
      logoutUser();
      setAuthUser(null);
      navigateTo('pos');
    }
  };

  // Flatten all items for quick lookup
  const allItemsMap = useMemo(() => {
    const map = new Map();
    MENU_CATEGORIES.forEach((category) => {
      category.items.forEach((item) => {
        map.set(item.id, item);
      });
    });
    return map;
  }, []);

  const handleTambah = (id) => {
    const availableStock = stocks[id] !== undefined ? stocks[id] : 99;
    const currentQty = cart[id] || 0;

    if (currentQty >= availableStock) {
      alert(`Maaf, stok item ini hanya tersisa ${availableStock} porsi.`);
      return;
    }

    setCart((prev) => ({
      ...prev,
      [id]: currentQty + 1,
    }));
  };

  const handleKurang = (id) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return {
        ...prev,
        [id]: current - 1,
      };
    });
  };

  const handleResetCart = (askConfirm = true) => {
    if (Object.keys(cart).length === 0) return;
    if (!askConfirm || window.confirm('Apakah Anda yakin ingin membatalkan dan mengosongkan semua pesanan?')) {
      setCart({});
    }
  };

  // Compute cart items, quantities, and totals
  const { cartItems, totalQty, grandTotal } = useMemo(() => {
    const items = [];
    let qtySum = 0;
    let totalSum = 0;

    Object.entries(cart).forEach(([id, qty]) => {
      if (qty > 0 && allItemsMap.has(id)) {
        const item = allItemsMap.get(id);
        items.push({ ...item, qty });
        qtySum += qty;
        totalSum += item.harga * qty;
      }
    });

    return {
      cartItems: items,
      totalQty: qtySum,
      grandTotal: totalSum,
    };
  }, [cart, allItemsMap]);

  // ================= 1. JIKA BELUM LOGIN: TAMPILKAN HALAMAN LOGIN =================
  if (!authUser) {
    return (
      <LoginPage
        targetView={currentView}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // ================= 2. JIKA DI ADMIN TAPI BUKAN ROLE ADMIN =================
  if (currentView === 'admin' && authUser.role !== 'admin') {
    return (
      <LoginPage
        targetView="admin"
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // ================= 3. JIKA LOGIN SEBAGAI ADMIN: HANYA AKSES ADMIN =================
  if (authUser.role === 'admin') {
    return (
      <AdminDashboard
        authUser={authUser}
        onLogout={handleLogout}
      />
    );
  }

  // ================= 4. JIKA LOGIN SEBAGAI KASIR: HANYA AKSES POS =================
  return (
    <>
      <Navbar
        authUser={authUser}
        onLogout={handleLogout}
      />
      <Hero />
      <main id="menu">
        <MenuSection
          categories={MENU_CATEGORIES}
          cart={cart}
          stocks={stocks}
          onTambah={handleTambah}
          onKurang={handleKurang}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          orderType={orderType}
          setOrderType={setOrderType}
        />

        <CartSection
          cartItems={cartItems}
          grandTotal={grandTotal}
          orderType={orderType}
          setOrderType={setOrderType}
          onTambah={handleTambah}
          onKurang={handleKurang}
          onResetCart={handleResetCart}
          onShowReceipt={(data) => setReceiptData(data)}
        />

        <AboutSection />
      </main>

      <FloatingCart totalQty={totalQty} grandTotal={grandTotal} />
      <Footer />

      {/* Modal Struk Transaksi Resmi */}
      <ReceiptModal
        orderData={receiptData}
        onClose={() => setReceiptData(null)}
      />
    </>
  );
}
