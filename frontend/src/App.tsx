import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MenuSection from './components/MenuSection';
import CartSection from './components/CartSection';
import FloatingCart from './components/FloatingCart';
import AboutSection from './components/AboutSection';
import Footer from './components/Footer';
import ReceiptModal from './components/ReceiptModal';
import CustomerOrdersView from './components/CustomerOrdersView';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/auth/LoginPage';
import { getMenuCategories, MenuCategory } from './data/menuData';
import { getStocks, getTransactions } from './utils/stockStorage';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { OrderData } from './schemas/order.schema';

export default function App() {
  const { user, logout } = useAuth();
  const {
    cart,
    addItem,
    removeItem,
    resetCart,
    cartItems,
    totalQty,
    grandTotal,
    orderType,
    setOrderType,
    editingOrder,
    startEditingOrder,
    cancelEditingOrder,
  } = useCart();

  const [currentView, setCurrentView] = useState<'admin' | 'pos'>(() => {
    return window.location.pathname.startsWith('/admin') ? 'admin' : 'pos';
  });

  const [categories, setCategories] = useState<MenuCategory[]>(() => getMenuCategories());
  const [posTab, setPosTab] = useState<'menu' | 'orders'>('menu');
  const [ordersCount, setOrdersCount] = useState<number>(() => getTransactions().length);
  const [pendingCount, setPendingCount] = useState<number>(() => {
    return getTransactions().filter((t: any) => t.paymentStatus === 'PENDING').length;
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
    const handleMenuUpdate = () => {
      setCategories(getMenuCategories());
    };
    window.addEventListener('wrj_menu_updated', handleMenuUpdate);
    return () => window.removeEventListener('wrj_menu_updated', handleMenuUpdate);
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

  useEffect(() => {
    const handleTransactionsUpdate = () => {
      const txs = getTransactions();
      setOrdersCount(txs.length);
      setPendingCount(txs.filter((t: any) => t.paymentStatus === 'PENDING').length);
    };
    window.addEventListener('wrj_transactions_updated', handleTransactionsUpdate);
    window.addEventListener('storage', handleTransactionsUpdate);
    return () => {
      window.removeEventListener('wrj_transactions_updated', handleTransactionsUpdate);
      window.removeEventListener('storage', handleTransactionsUpdate);
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
        activeTab={posTab}
        onSelectTab={setPosTab}
        ordersCount={ordersCount}
        pendingCount={pendingCount}
      />

      {pendingCount > 0 && posTab === 'menu' && (
        <div
          onClick={() => {
            setPosTab('orders');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{
            background: 'linear-gradient(90deg, #DC2626 0%, #EA580C 100%)',
            color: '#FFFFFF',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: '700',
            boxShadow: '0 3px 10px rgba(220, 38, 38, 0.25)',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              backgroundColor: '#FFFFFF',
              color: '#DC2626',
              borderRadius: '9999px',
              padding: '2px 10px',
              fontSize: '12px',
              fontWeight: '900',
            }}
          >
            🔔 {pendingCount} PESANAN BELUM BAYAR
          </span>
          <span>
            Ada {pendingCount} pesanan customer menunggu pembayaran / konfirmasi kasir!
          </span>
          <span
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '800',
              border: '1px solid rgba(255, 255, 255, 0.4)',
            }}
          >
            Lihat Pesanan Customer →
          </span>
        </div>
      )}

      {posTab === 'orders' ? (
        <CustomerOrdersView
          onShowReceipt={(data) => {
            setReceiptData(data);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNewOrder={() => {
            setPosTab('menu');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onEditOrder={(order) => {
            startEditingOrder(order);
            setPosTab('menu');
            const cartEl = document.getElementById('cart');
            if (cartEl) {
              cartEl.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        />
      ) : (
        <>
          {editingOrder && (
            <div
              style={{
                position: 'sticky',
                top: '70px',
                zIndex: 40,
                backgroundColor: '#B45309',
                color: '#FFFFFF',
                padding: '10px 16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ fontSize: '16px' }}>⚡</span>
                <span>
                  Mode Edit: Sedang mengubah pesanan <strong>#{editingOrder.orderNumber}</strong> ({editingOrder.nama} - {editingOrder.orderType === 'dine-in' ? (editingOrder.tableNumber || 'Meja') : 'Take Away'}). Tambah menu lalu simpan di keranjang.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const cartEl = document.getElementById('cart');
                    if (cartEl) cartEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{
                    backgroundColor: '#F59E0B',
                    color: '#78350F',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                  }}
                >
                  Lihat Keranjang ({totalQty})
                </button>
                <button
                  type="button"
                  onClick={cancelEditingOrder}
                  style={{
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                  }}
                >
                  ✕ Batal
                </button>
              </div>
            </div>
          )}

          <Hero />
          <main id="menu">
            <MenuSection
              categories={categories}
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
        </>
      )}

      <Footer />

      <ReceiptModal
        orderData={receiptData}
        onClose={() => {
          setReceiptData(null);
          resetCart();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onViewOrders={() => {
          setPosTab('orders');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </>
  );
}
