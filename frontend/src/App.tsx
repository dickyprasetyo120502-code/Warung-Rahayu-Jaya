import React, { useState, useEffect } from 'react';
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
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { OrderData } from './schemas/order.schema';

export default function App() {
  const { user, logout } = useAuth();
  const { cart, addItem, removeItem, resetCart, cartItems, totalQty, grandTotal, orderType, setOrderType } = useCart();

  const [currentView, setCurrentView] = useState<'admin' | 'pos'>(() => {
    return window.location.pathname.startsWith('/admin') ? 'admin' : 'pos';
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [receiptData, setReceiptData] = useState<OrderData | null>(null);
  const [stocks, setStocks] = useState<Record<string, number>>(getStocks());

  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(window.location.pathname.startsWith('/admin') ? 'admin' : 'pos');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const navigateTo = (view: 'admin' | 'pos') => {
    setCurrentView(view);
    const path = view === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar (logout)?')) {
      logout();
      navigateTo('pos');
    }
  };

  if (!user) {
    return (
      <LoginPage
        targetView={currentView}
        onLoginSuccess={(_, target) => navigateTo(target)}
      />
    );
  }

  if (currentView === 'admin' && user.role !== 'ADMIN') {
    return (
      <LoginPage
        targetView="admin"
        onLoginSuccess={(_, target) => navigateTo(target)}
      />
    );
  }

  if (user.role === 'ADMIN') {
    return (
      <AdminDashboard
        authUser={user}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <>
      <Navbar
        authUser={user}
        onLogout={handleLogout}
      />
      <Hero />
      <main id="menu">
        <MenuSection
          categories={MENU_CATEGORIES}
          cart={cart}
          stocks={stocks}
          onTambah={(id) => addItem(id, stocks[id])}
          onKurang={removeItem}
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
          onTambah={(id) => addItem(id, stocks[id])}
          onKurang={removeItem}
          onResetCart={resetCart}
          onShowReceipt={(data) => {
            setReceiptData(data);
            resetCart();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        <AboutSection />
      </main>

      <FloatingCart totalQty={totalQty} grandTotal={grandTotal} />
      <Footer />

      <ReceiptModal
        orderData={receiptData}
        onClose={() => {
          setReceiptData(null);
          resetCart();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </>
  );
}
