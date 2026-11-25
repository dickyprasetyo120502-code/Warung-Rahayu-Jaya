import React, { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { getTransactions, updateOrderStatus, deleteTransaction, clearAllTransactions } from '../utils/stockStorage';
import { OrderData } from '../schemas/order.schema';

interface CustomerOrdersViewProps {
  onShowReceipt: (orderData: OrderData) => void;
  onNewOrder: () => void;
  onEditOrder?: (order: any) => void;
}

export default function CustomerOrdersView({ onShowReceipt, onNewOrder, onEditOrder }: CustomerOrdersViewProps) {
  const [orders, setOrders] = useState<any[]>(() => getTransactions());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'dine-in' | 'take-away' | 'pending' | 'paid'>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [payingOrder, setPayingOrder] = useState<any | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'qris' | 'edc'>('cash');
  const [payCashGiven, setPayCashGiven] = useState<number | ''>('');

  const fetchMergedOrders = async () => {
    setIsRefreshing(true);
    const localTx = getTransactions();

    try {
      const res = await api.get('/orders');
      if (res.data?.success && Array.isArray(res.data.orders)) {
        const apiOrders = res.data.orders.map((ord: any) => {
          const dateObj = ord.createdAt ? new Date(ord.createdAt) : new Date();
          return {
            orderNumber: ord.orderNumber,
            nama: ord.nama || 'Pelanggan',
            tableNumber: ord.tableNumber ? `Meja ${ord.tableNumber}` : 'Take Away',
            rawTableNumber: ord.tableNumber || '',
            guestCount: ord.guestCount || null,
            orderType: ord.orderType || (ord.tableNumber ? 'dine-in' : 'take-away'),
            total: ord.total || 0,
            subtotal: ord.subtotal || 0,
            tax: ord.tax || 0,
            paymentMethod: ord.paymentMethod || 'cash',
            paymentStatus: ord.paymentStatus || 'PAID',
            cartItems: Array.isArray(ord.items)
              ? ord.items.map((it: any) => ({
                  id: it.menuItemId || String(it.id),
                  nama: it.nama,
                  harga: it.harga,
                  qty: it.qty,
                }))
              : [],
            telepon: ord.telepon || '',
            catatan: ord.catatan || '',
            time: dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
            date: dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            status: ord.paymentStatus === 'PENDING' ? 'Menunggu Pembayaran' : 'Selesai',
            isServed: false,
          };
        });

        const mergedMap = new Map<string, any>();
        localTx.forEach((tx) => mergedMap.set(tx.orderNumber, tx));
        apiOrders.forEach((tx: any) => {
          if (!mergedMap.has(tx.orderNumber)) {
            mergedMap.set(tx.orderNumber, tx);
          } else {
            const existing = mergedMap.get(tx.orderNumber);
            mergedMap.set(tx.orderNumber, { ...existing, ...tx, isServed: existing.isServed });
          }
        });

        const mergedList = Array.from(mergedMap.values());
        setOrders(mergedList);
      } else {
        setOrders(localTx);
      }
    } catch {
      setOrders(localTx);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMergedOrders();

    const handleUpdate = () => {
      setOrders(getTransactions());
    };

    window.addEventListener('wrj_transactions_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('wrj_transactions_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleToggleServed = (orderNumber: string, currentServed: boolean) => {
    const updated = updateOrderStatus(orderNumber, {
      isServed: !currentServed,
      status: !currentServed ? 'Sudah Diantar / Selesai' : 'Siap Disajikan',
    });
    setOrders(updated);
  };

  const handleCancelOrder = async (orderNumber: string) => {
    if (window.confirm(`Apakah Anda yakin ingin membatalkan pesanan #${orderNumber}?`)) {
      try {
        await api.delete(`/orders/${orderNumber}`);
      } catch (e: any) {
        console.warn('Backend cancel offline:', e.message);
      }
      const updated = deleteTransaction(orderNumber);
      setOrders(updated);
    }
  };

  const handleResetAllOrders = async () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus SEMUA data pesanan customer sehingga kembali kosong (0)?')) {
      try {
        await api.delete('/orders/reset-all');
      } catch (e: any) {
        console.warn('Backend reset orders offline:', e.message);
      }
      clearAllTransactions();
      setOrders([]);
      alert('✅ Seluruh data pesanan customer berhasil dikosongkan (mulai dari 0).');
    }
  };

  const handleConfirmDirectPayment = async () => {
    if (!payingOrder) return;

    const total = payingOrder.total || 0;
    const numGiven = typeof payCashGiven === 'number' ? payCashGiven : 0;

    if (payMethod === 'cash' && numGiven < total) {
      alert(`Uang tunai kurang. Total tagihan: Rp${total.toLocaleString('id-ID')}, uang diterima: Rp${numGiven.toLocaleString('id-ID')}`);
      return;
    }

    const change = payMethod === 'cash' ? Math.max(0, numGiven - total) : undefined;
    const cashGiven = payMethod === 'cash' ? numGiven : undefined;

    try {
      await api.post(`/orders/${payingOrder.orderNumber}/pay`, {
        paymentMethod: payMethod,
        cashGiven,
        change,
      });
    } catch (e: any) {
      console.warn('Backend payment confirmation offline:', e.message);
    }

    const updated = updateOrderStatus(payingOrder.orderNumber, {
      paymentStatus: 'PAID',
      paymentMethod: payMethod,
      cashGiven,
      change,
      status: 'Lunas (Siap Disiapkan)',
    });
    setOrders(updated);

    const receiptData: OrderData = {
      orderNumber: payingOrder.orderNumber,
      orderType: payingOrder.orderType,
      tableNumber: payingOrder.rawTableNumber || (payingOrder.tableNumber ? payingOrder.tableNumber.replace(/[^0-9]/g, '') : null),
      guestCount: payingOrder.guestCount,
      nama: payingOrder.nama,
      telepon: payingOrder.telepon,
      catatan: payingOrder.catatan,
      cartItems: payingOrder.cartItems || [],
      subtotal: payingOrder.subtotal || Math.round(total / 1.1),
      tax: payingOrder.tax || Math.round(total - total / 1.1),
      total,
      paymentMethod: payMethod,
      paymentStatus: 'PAID',
      cashGiven,
      change,
      date: new Date().toLocaleDateString('id-ID'),
    };

    setPayingOrder(null);
    setPayCashGiven('');
    onShowReceipt(receiptData);
  };

  const handleOpenReceipt = (order: any) => {
    const receiptData: OrderData = {
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableNumber: order.rawTableNumber || (order.tableNumber ? order.tableNumber.replace(/[^0-9]/g, '') : null),
      guestCount: order.guestCount,
      nama: order.nama,
      telepon: order.telepon,
      catatan: order.catatan,
      cartItems: order.cartItems || [],
      subtotal: order.subtotal || Math.round((order.total || 0) / 1.1),
      tax: order.tax || Math.round((order.total || 0) - (order.total || 0) / 1.1),
      total: order.total || 0,
      paymentMethod: order.paymentMethod || 'cash',
      paymentStatus: order.paymentStatus || 'PAID',
      cashGiven: order.cashGiven,
      change: order.change,
      date: order.date || new Date().toLocaleDateString('id-ID'),
    };
    onShowReceipt(receiptData);
  };

  const handleSendWA = (order: any) => {
    const rawPhone = order.telepon ? String(order.telepon).replace(/[^0-9]/g, '') : '';
    let phoneParam = rawPhone;
    if (phoneParam.startsWith('0')) {
      phoneParam = '62' + phoneParam.slice(1);
    }

    const itemsSummary = (order.cartItems || [])
      .map((it: any) => `• ${it.nama} (${it.qty}x) = Rp${((it.harga || 0) * it.qty).toLocaleString('id-ID')}`)
      .join('\n');

    const pesan = `Halo kak ${order.nama || 'Pelanggan'},\nBerikut rincian pesanan Anda di *Warung Rahayu Jaya*:\n\n*No. Pesanan:* ${order.orderNumber}\n*Waktu:* ${order.time || 'Hari ini'}\n*Layanan:* ${order.orderType === 'dine-in' ? `${order.tableNumber}` : 'Take Away (Bungkus)'}\n\n*Menu Pesanan:*\n${itemsSummary}\n\n*Total Tagihan:* Rp${(order.total || 0).toLocaleString('id-ID')}\n*Metode:* ${(order.paymentMethod || 'cash').toUpperCase()} (${order.paymentStatus || 'PAID'})\n\nTerima kasih telah memesan di Warung Rahayu Jaya!`;

    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(pesan)}`
      : `https://wa.me/?text=${encodeURIComponent(pesan)}`;

    window.open(waUrl, '_blank');
  };

  const stats = useMemo(() => {
    let omset = 0;
    let dineInCount = 0;
    let takeAwayCount = 0;
    let pendingCount = 0;

    orders.forEach((ord) => {
      if (ord.paymentStatus !== 'PENDING') {
        omset += ord.total || 0;
      }
      if (ord.orderType === 'take-away' || String(ord.tableNumber).toLowerCase().includes('take')) {
        takeAwayCount++;
      } else {
        dineInCount++;
      }
      if (ord.paymentStatus === 'PENDING') {
        pendingCount++;
      }
    });

    return {
      totalOrders: orders.length,
      omset,
      dineInCount,
      takeAwayCount,
      pendingCount,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (filterType === 'dine-in') {
        const isTake = ord.orderType === 'take-away' || String(ord.tableNumber).toLowerCase().includes('take');
        if (isTake) return false;
      } else if (filterType === 'take-away') {
        const isTake = ord.orderType === 'take-away' || String(ord.tableNumber).toLowerCase().includes('take');
        if (!isTake) return false;
      } else if (filterType === 'pending') {
        if (ord.paymentStatus !== 'PENDING') return false;
      } else if (filterType === 'paid') {
        if (ord.paymentStatus === 'PENDING') return false;
      }

      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      const matchOrderNum = (ord.orderNumber || '').toLowerCase().includes(term);
      const matchName = (ord.nama || '').toLowerCase().includes(term);
      const matchTable = (ord.tableNumber || '').toLowerCase().includes(term);
      const matchPhone = (ord.telepon || '').includes(term);

      return matchOrderNum || matchName || matchTable || matchPhone;
    });
  }, [orders, filterType, searchTerm]);

  return (
    <div className="pos-orders-view-container">
      <div className="pos-orders-header">
        <div className="pos-orders-title-box">
          <div className="pos-orders-badge-row">
            <span className="pos-live-tag">● MONITOR PESANAN REAL-TIME</span>
          </div>
          <h1>Daftar Pesanan Masuk & Meja Kasir</h1>
          <p>
            Pantau pesanan customer (dine-in & take-away), edit / tambah menu pesanan pending, dan terima pembayaran kasir.
          </p>
        </div>

        <div className="pos-orders-header-actions">
          {orders.length > 0 && (
            <button
              type="button"
              onClick={handleResetAllOrders}
              title="Kosongkan semua data pesanan mulai dari 0"
              style={{
                background: '#FEF2F2',
                border: '1.5px solid #FECACA',
                color: '#DC2626',
                fontWeight: '700',
                fontSize: '13px',
                padding: '10px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🗑️</span>
              <span>Kosongkan (0)</span>
            </button>
          )}

          <button
            type="button"
            className="btn-refresh-orders"
            onClick={fetchMergedOrders}
            disabled={isRefreshing}
            title="Segarkan data pesanan terbaru"
          >
            <span>🔄</span>
            <span>{isRefreshing ? 'Memperbarui...' : 'Segarkan'}</span>
          </button>

          <button
            type="button"
            className="btn-new-order-direct"
            onClick={onNewOrder}
            title="Kembali ke menu kasir untuk buat pesanan baru"
          >
            <span>➕</span>
            <span>Buat Pesanan Baru</span>
          </button>
        </div>
      </div>

      <div className="pos-stats-summary-grid">
        <div className="pos-stat-card primary">
          <div className="stat-card-head">
            <span>Total Pesanan Hari Ini</span>
            <span className="stat-icon">🧾</span>
          </div>
          <div className="stat-card-value">{stats.totalOrders} Pesanan</div>
          <small className="stat-card-sub">Tercatat di sistem kasir</small>
        </div>

        <div className="pos-stat-card">
          <div className="stat-card-head">
            <span>Makan di Tempat (Dine-In)</span>
            <span className="stat-icon">🍽️</span>
          </div>
          <div className="stat-card-value">{stats.dineInCount} Meja</div>
          <small className="stat-card-sub">Perlu diantar ke meja</small>
        </div>

        <div className="pos-stat-card">
          <div className="stat-card-head">
            <span>Bungkus (Take Away)</span>
            <span className="stat-icon">🛍️</span>
          </div>
          <div className="stat-card-value">{stats.takeAwayCount} Pesanan</div>
          <small className="stat-card-sub">Dikemas bawa pulang</small>
        </div>

        <div className="pos-stat-card revenue">
          <div className="stat-card-head">
            <span>Total Omset Lunas</span>
            <span className="stat-icon">💰</span>
          </div>
          <div className="stat-card-value">Rp {stats.omset.toLocaleString('id-ID')}</div>
          <small className="stat-card-sub">
            {stats.pendingCount > 0 ? `⚠️ ${stats.pendingCount} Pesanan Belum Bayar` : '✓ Seluruh transaksi lunas'}
          </small>
        </div>
      </div>

      <div className="pos-orders-toolbar">
        <div className="orders-search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Cari no. order (WRJ-001), nama customer, atau no meja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className="orders-filter-pills">
          <button
            type="button"
            className={`order-pill ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Semua ({orders.length})
          </button>
          <button
            type="button"
            className={`order-pill ${filterType === 'dine-in' ? 'active' : ''}`}
            onClick={() => setFilterType('dine-in')}
          >
            🍽️ Dine-In ({stats.dineInCount})
          </button>
          <button
            type="button"
            className={`order-pill ${filterType === 'take-away' ? 'active' : ''}`}
            onClick={() => setFilterType('take-away')}
          >
            🛍️ Take Away ({stats.takeAwayCount})
          </button>
          <button
            type="button"
            className={`order-pill warning ${filterType === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterType('pending')}
          >
            ⏳ Belum Bayar ({stats.pendingCount})
          </button>
          <button
            type="button"
            className={`order-pill ${filterType === 'paid' ? 'active' : ''}`}
            onClick={() => setFilterType('paid')}
          >
            ✅ Lunas ({orders.length - stats.pendingCount})
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="pos-orders-empty-card">
          <div className="empty-icon-circle">📭</div>
          <h3>Belum Ada Pesanan yang Sesuai</h3>
          <p>
            {searchTerm
              ? `Tidak ditemukan pesanan dengan kata kunci "${searchTerm}".`
              : 'Semua data pesanan dimulai dari 0. Belum ada pesanan yang masuk saat ini.'}
          </p>
          <button
            type="button"
            className="btn-create-first-order"
            onClick={onNewOrder}
          >
            ➕ Buat Pesanan Baru di Menu
          </button>
        </div>
      ) : (
        <div className="pos-orders-cards-grid">
          {filteredOrders.map((ord) => {
            const isDineIn = ord.orderType === 'dine-in' || !String(ord.tableNumber).toLowerCase().includes('take');
            const totalItemsCount = (ord.cartItems || []).reduce((acc: number, it: any) => acc + (it.qty || 1), 0);
            const isPending = ord.paymentStatus === 'PENDING';

            return (
              <div
                key={ord.orderNumber}
                className={`pos-customer-order-card ${isPending ? 'pending-border' : ord.isServed ? 'served-card' : ''}`}
              >
                <div className="card-top-bar">
                  <div className="order-id-section">
                    <span className="order-number-tag">#{ord.orderNumber}</span>
                    <span className="order-time-stamp">⏱️ {ord.time || 'Baru Saja'}</span>
                  </div>

                  <div className="order-badges-group">
                    <span className={`table-badge ${isDineIn ? 'dinein' : 'takeaway'}`}>
                      {isDineIn ? `🍽️ ${ord.tableNumber || 'Meja'}` : '🛍️ Take Away'}
                    </span>

                    <span className={`payment-status-badge ${isPending ? 'pending' : 'paid'}`}>
                      {isPending ? '⏳ BELUM BAYAR' : '✓ LUNAS'}
                    </span>
                  </div>
                </div>

                <div className="customer-info-box">
                  <div className="customer-main-line">
                    <div className="customer-name-avatar">
                      <span>👤</span>
                      <strong>{ord.nama || 'Pelanggan'}</strong>
                    </div>
                    {ord.telepon && (
                      <span style={{ fontSize: '11.5px', color: '#55685D', fontWeight: '600' }}>
                        📞 {ord.telepon}
                      </span>
                    )}
                  </div>

                  {ord.guestCount && isDineIn && (
                    <div style={{ fontSize: '11.5px', color: '#55685D' }}>
                      👥 Jumlah Tamu: <strong>{ord.guestCount} Orang</strong>
                    </div>
                  )}

                  {ord.catatan && (
                    <div className="customer-kitchen-note">
                      <span>📝</span>
                      <span>
                        <strong>Catatan:</strong> "{ord.catatan}"
                      </span>
                    </div>
                  )}
                </div>

                <div className="order-items-breakdown">
                  <div className="items-head">
                    <span>Menu Pesanan ({totalItemsCount} porsi)</span>
                    <span>Subtotal</span>
                  </div>
                  <ul className="items-list">
                    {(ord.cartItems || []).map((item: any, itemIdx: number) => (
                      <li key={item.id || itemIdx} className="item-line">
                        <div className="item-left">
                          <span className="item-qty-badge">{item.qty}x</span>
                          <span className="item-name">{item.nama}</span>
                        </div>
                        <span className="item-price">
                          Rp {((item.harga || 0) * item.qty).toLocaleString('id-ID')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="order-financial-footer">
                  <div className="payment-meta">
                    <span className="method-label">Metode Pembayaran:</span>
                    <span className="method-value">
                      {ord.paymentMethod === 'qris'
                        ? '📱 QRIS (Midtrans)'
                        : ord.paymentMethod === 'edc'
                        ? '💳 EDC / Kartu'
                        : '💵 Tunai Kasir'}
                    </span>
                    {ord.cashGiven && ord.paymentMethod === 'cash' && (
                      <small className="cash-detail-text">
                        (Diterima: Rp {ord.cashGiven.toLocaleString('id-ID')} • Kembali: Rp{' '}
                        {(ord.change || 0).toLocaleString('id-ID')})
                      </small>
                    )}
                  </div>

                  <div className="total-amount-box">
                    <span className="total-label">Total Tagihan</span>
                    <strong className="total-val">
                      Rp {(ord.total || 0).toLocaleString('id-ID')}
                    </strong>
                  </div>
                </div>

                {isPending && (
                  <div
                    style={{
                      background: '#FEF3C7',
                      border: '1.5px solid #F59E0B',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#92400E', fontWeight: '700' }}>
                      ⏳ Menunggu Pembayaran Customer
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {onEditOrder && (
                        <button
                          type="button"
                          onClick={() => onEditOrder(ord)}
                          style={{
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '7px',
                            padding: '8px 10px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>✏️</span> Edit / Tambah
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPayingOrder(ord);
                          setPayCashGiven(ord.total || '');
                        }}
                        style={{
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '7px',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>💳</span> Bayar Sekarang
                      </button>
                    </div>
                  </div>
                )}

                <div className="order-actions-bar">
                  <button
                    type="button"
                    className="btn-action-receipt"
                    onClick={() => handleOpenReceipt(ord)}
                    title="Buka struk pembayaran resmi"
                  >
                    <span>🖨️</span>
                    <span>Nota</span>
                  </button>

                  <button
                    type="button"
                    className="btn-action-wa"
                    onClick={() => handleSendWA(ord)}
                    title="Kirim rincian nota ke WhatsApp pelanggan"
                  >
                    <span>💬</span>
                    <span>WA</span>
                  </button>

                  <button
                    type="button"
                    className={`btn-action-served ${ord.isServed ? 'is-served' : ''}`}
                    onClick={() => handleToggleServed(ord.orderNumber, !!ord.isServed)}
                    title="Tandai apakah pesanan sudah selesai diantar ke meja"
                  >
                    <span>{ord.isServed ? '✓ Selesai Diantar' : '⏳ Siap Disajikan'}</span>
                  </button>
                </div>

                {isPending && (
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(ord.orderNumber)}
                    style={{
                      width: '100%',
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FECACA',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    ❌ Batalkan Pesanan Pending Ini
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {payingOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1E293B' }}>
                  💳 Terima Pembayaran Kasir
                </h3>
                <small style={{ color: '#64748B' }}>
                  Pesanan #{payingOrder.orderNumber} • {payingOrder.nama} ({payingOrder.tableNumber})
                </small>
              </div>
              <button
                type="button"
                onClick={() => setPayingOrder(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                <span>Total Tagihan:</span>
                <strong style={{ fontSize: '17px', color: '#15803D' }}>
                  Rp {(payingOrder.total || 0).toLocaleString('id-ID')}
                </strong>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                PILIH METODE PEMBAYARAN:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPayMethod('cash')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: payMethod === 'cash' ? '2px solid #16A34A' : '1px solid #CBD5E1',
                    backgroundColor: payMethod === 'cash' ? '#DCFCE7' : '#FFFFFF',
                    color: payMethod === 'cash' ? '#15803D' : '#334155',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  💵 Tunai
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('qris')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: payMethod === 'qris' ? '2px solid #0284C7' : '1px solid #CBD5E1',
                    backgroundColor: payMethod === 'qris' ? '#E0F2FE' : '#FFFFFF',
                    color: payMethod === 'qris' ? '#0369A1' : '#334155',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  📱 QRIS
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('edc')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: payMethod === 'edc' ? '2px solid #1E3A8A' : '1px solid #CBD5E1',
                    backgroundColor: payMethod === 'edc' ? '#DBEAFE' : '#FFFFFF',
                    color: payMethod === 'edc' ? '#1E3A8A' : '#334155',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  💳 Mesin EDC
                </button>
              </div>
            </div>

            {payMethod === 'cash' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  UANG TUNAI DITERIMA:
                </label>
                <input
                  type="number"
                  value={payCashGiven}
                  onChange={(e) => setPayCashGiven(e.target.value ? parseInt(e.target.value, 10) : '')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '16px',
                    fontWeight: '700',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Ketik jumlah uang..."
                />

                <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setPayCashGiven(payingOrder.total || 0)}
                    style={{
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Uang Pas (Rp{(payingOrder.total || 0).toLocaleString('id-ID')})
                  </button>
                </div>

                {typeof payCashGiven === 'number' && payCashGiven >= (payingOrder.total || 0) && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#DCFCE7', borderRadius: '8px', color: '#166534', fontWeight: '700', fontSize: '13px' }}>
                    💰 Kembalian: Rp{(payCashGiven - (payingOrder.total || 0)).toLocaleString('id-ID')}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setPayingOrder(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDirectPayment}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#16A34A',
                  fontWeight: '800',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.4)',
                }}
              >
                ✓ Konfirmasi Lunas & Cetak Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
