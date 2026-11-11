import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../lib/api';
import { getNextOrderNumber, incrementOrderNumber } from '../utils/orderNumber';
import { deductStock, recordTransaction } from '../utils/stockStorage';
import { createOrderSchema, OrderItemInput, OrderData } from '../schemas/order.schema';

interface CartSectionProps {
  cartItems: OrderItemInput[];
  grandTotal: number;
  orderType: 'dine-in' | 'take-away';
  setOrderType: (type: 'dine-in' | 'take-away') => void;
  onTambah: (id: string) => void;
  onKurang: (id: string) => void;
  onResetCart: () => void;
  onShowReceipt: (data: OrderData) => void;
}

export default function CartSection({
  cartItems,
  grandTotal,
  orderType,
  setOrderType,
  onTambah,
  onKurang,
  onResetCart,
  onShowReceipt,
}: CartSectionProps) {
  const [nama, setNama] = useState<string>('');
  const [telepon, setTelepon] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('01');
  const [guestCount, setGuestCount] = useState<string>('2');
  const [catatan, setCatatan] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'edc' | 'qris'>('cash');

  const [orderNumber, setOrderNumber] = useState<string>(getNextOrderNumber());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [cashGiven, setCashGiven] = useState<number | ''>('');

  // State untuk Midtrans QRIS Snap
  const [snapToken, setSnapToken] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [isLoadingSnap, setIsLoadingSnap] = useState<boolean>(false);

  useEffect(() => {
    setOrderNumber(getNextOrderNumber());
  }, []);

  const subtotal = grandTotal;
  const tax = Math.round(subtotal * 0.1); // PB1 10%
  const totalAkhir = subtotal + tax;

  // Kalkulasi uang tunai & kembalian
  const numCash = typeof cashGiven === 'number' ? cashGiven : 0;
  const kembalian = numCash >= totalAkhir ? numCash - totalAkhir : 0;
  const isCashSufficient = paymentMethod !== 'cash' || (typeof cashGiven === 'number' && cashGiven >= totalAkhir);

  // Quick cash generator
  const getQuickAmounts = () => {
    const standard = [50000, 100000, 150000, 200000, 500000];
    const filtered = standard.filter((amt) => amt >= totalAkhir);
    const roundedUp = Math.ceil(totalAkhir / 10000) * 10000;
    const list = [...filtered];
    if (roundedUp > totalAkhir && !list.includes(roundedUp)) {
      list.unshift(roundedUp);
    }
    return list.slice(0, 4);
  };

  // Handler eksekusi pembayaran langsung -> simpan & langsung terbitkan struk
  const handleExecutePayment = async (selectedMethod: 'cash' | 'edc' | 'qris') => {
    setValidationError('');

    // Validasi input data pemesan & menu dengan ZOD
    const validationResult = createOrderSchema.safeParse({
      orderType,
      tableNumber: orderType === 'dine-in' ? tableNumber : null,
      guestCount: orderType === 'dine-in' ? guestCount : null,
      nama: nama.trim(),
      telepon: telepon.trim() || null,
      catatan: catatan.trim() || null,
      cartItems,
      paymentMethod: selectedMethod,
    });

    if (!validationResult.success) {
      const issue = validationResult.error.issues[0]?.message || 'Data pesanan belum lengkap';
      setValidationError(issue);
      alert('⚠️ ' + issue);
      return;
    }

    if (selectedMethod === 'cash') {
      if (typeof cashGiven !== 'number' || cashGiven < totalAkhir) {
        alert(
          `Uang tunai yang diberikan (Rp${(numCash).toLocaleString('id-ID')}) kurang dari total tagihan (Rp${totalAkhir.toLocaleString('id-ID')}).`
        );
        return;
      }
    }

    setIsProcessing(true);

    const actualCash = selectedMethod === 'cash' ? numCash : undefined;
    const actualChange = selectedMethod === 'cash' ? kembalian : undefined;

    const orderData: OrderData = {
      orderNumber,
      orderType,
      tableNumber: orderType === 'dine-in' ? tableNumber : null,
      guestCount: orderType === 'dine-in' ? guestCount : null,
      nama: nama.trim(),
      telepon: telepon.trim(),
      catatan: catatan.trim(),
      cartItems,
      subtotal,
      tax,
      total: totalAkhir,
      paymentMethod: selectedMethod,
      paymentStatus: 'PAID',
      cashGiven: actualCash,
      change: actualChange,
      date: new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      timestamp: new Date().toISOString(),
    };

    try {
      // 1. Simpan ke Backend PostgreSQL REST API via Axios
      await api.post('/orders', orderData);
    } catch (e: any) {
      console.warn(
        'Backend PostgreSQL offline/dalam proses sync, mencatat ke penyimpanan lokal kasir:',
        e.message
      );
    }

    // 2. Potong stok menu & catat transaksi lokal (otomatis sinkron ke Admin)
    deductStock(cartItems);
    recordTransaction(orderData);
    incrementOrderNumber();

    // 3. Kosongkan keranjang dan reset form pembayaran kasir
    setIsProcessing(false);
    onResetCart();
    setNama('');
    setTelepon('');
    setCatatan('');
    setCashGiven('');
    setSnapToken(null);
    setRedirectUrl(null);
    setOrderNumber(getNextOrderNumber());

    // 4. Otomatis gulir (scroll) layar ke bagian paling atas
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 5. Terbitkan struk resmi (Receipt Modal)
    onShowReceipt(orderData);
  };

  // Handler Buka Layar QRIS Midtrans (Snap Pop-up)
  const handleOpenMidtransQRIS = async () => {
    // Validasi form data dulu
    const validationResult = createOrderSchema.safeParse({
      orderType,
      tableNumber: orderType === 'dine-in' ? tableNumber : null,
      guestCount: orderType === 'dine-in' ? guestCount : null,
      nama: nama.trim(),
      telepon: telepon.trim() || null,
      catatan: catatan.trim() || null,
      cartItems,
      paymentMethod: 'qris',
    });

    if (!validationResult.success) {
      const issue = validationResult.error.issues[0]?.message || 'Data pesanan belum lengkap';
      setValidationError(issue);
      alert('⚠️ ' + issue);
      return;
    }

    setIsLoadingSnap(true);

    try {
      // Request Snap Token resmi dari backend
      const res = await api.post('/orders/snap-token', {
        orderNumber,
        grossAmount: totalAkhir,
        customerName: nama.trim() || 'Pelanggan',
        phone: telepon.trim() || undefined,
        items: cartItems.map((it) => ({
          id: it.id,
          price: it.harga,
          quantity: it.qty,
          name: it.nama,
        })),
      });

      if (res.data?.token) {
        setSnapToken(res.data.token);
        setRedirectUrl(res.data.redirect_url);

        const isProd = res.data?.isProduction;
        const clientKey = res.data?.clientKey || 'Mid-client-dEbUyTAiJ1ZXyGdi';
        const scriptSrc = isProd
          ? 'https://app.midtrans.com/snap/snap.js'
          : 'https://app.sandbox.midtrans.com/snap/snap.js';

        // Pastikan script Midtrans Snap yang cocok (Sandbox atau Production) dimuat
        let snapObj = (window as any).snap;
        if (
          !snapObj ||
          !(window as any).__midtrans_src ||
          (window as any).__midtrans_src !== scriptSrc
        ) {
          const old = document.getElementById('snap-midtrans-script');
          if (old) old.remove();
          const script = document.createElement('script');
          script.id = 'snap-midtrans-script';
          script.src = scriptSrc;
          script.setAttribute('data-client-key', clientKey);
          document.head.appendChild(script);
          await new Promise((resolve) => {
            script.onload = () => {
              (window as any).__midtrans_src = scriptSrc;
              resolve(true);
            };
            script.onerror = () => resolve(false);
          });
          snapObj = (window as any).snap;
        }

        // Jalankan popup Snap resmi Midtrans
        if (snapObj && typeof snapObj.pay === 'function') {
          snapObj.pay(res.data.token, {
            onSuccess: function (result: any) {
              console.log('Midtrans Snap Sukses:', result);
              handleExecutePayment('qris');
            },
            onPending: function (result: any) {
              console.log('Midtrans Snap Menunggu:', result);
              handleExecutePayment('qris');
            },
            onError: function (err: any) {
              console.error('Midtrans Snap Eror:', err);
              alert('Pembayaran QRIS Midtrans dibatalkan atau terjadi kendala.');
            },
            onClose: function () {
              console.log('Pop-up Midtrans ditutup kasir/pelanggan.');
            },
          });
        }
      }
    } catch (err: any) {
      console.warn('Gagal memanggil endpoint Midtrans:', err.message);
      const backendMsg = err.response?.data?.message;
      if (backendMsg) {
        alert(
          `⚠️ ${backendMsg}\n\n💡 Catatan Kasir: Anda tetap dapat memproses pesanan dan mencetak struk dengan menekan tombol hijau "Pelanggan Sudah Scan & Berhasil (Cetak Struk)" di bawah.`
        );
      } else {
        alert(
          'Catatan: Backend sedang offline atau belum terhubung ke Midtrans API. Anda tetap dapat mengonfirmasi pembayaran QRIS langsung dengan tombol hijau di bawah.'
        );
      }
    } finally {
      setIsLoadingSnap(false);
    }
  };

  return (
    <section className="cart-pos-container" id="cart">
      {/* 1. Header Ringkasan Pesanan & Nomor Meja */}
      <div className="pos-order-card">
        <div className="pos-order-left">
          <div className="pos-order-icon">
            {orderType === 'dine-in' ? '🍽️' : '🛍️'}
          </div>
          <div className="pos-order-info">
            <div className="pos-order-title">
              <strong>
                {orderType === 'dine-in' ? `Meja ${tableNumber || '01'}` : 'Take Away'}
              </strong>
              <span className={`pos-badge ${orderType}`}>
                {orderType === 'dine-in' ? 'Dine-In' : 'Bungkus'}
              </span>
            </div>
            <p className="pos-order-subtitle">
              {nama ? `Bpk/Ibu ${nama}` : 'Pelanggan Meja'}
              {orderType === 'dine-in' ? ` • ${guestCount} Tamu` : ' • Bawa Pulang'}
            </p>
          </div>
        </div>

        <div className="pos-order-right">
          <span className="order-num-label">No. Pesanan</span>
          <span className="order-num-value">#{orderNumber}</span>
        </div>
      </div>

      {/* 2. Form Identitas Pemesan & Nomor Meja */}
      <div className="pos-form-box">
        <div className="pos-form-header">
          <span className="pos-form-title">📝 Data Pemesan & Layanan</span>
          <div className="pos-pill-group">
            <button
              type="button"
              className={`pos-pill ${orderType === 'dine-in' ? 'active' : ''}`}
              onClick={() => setOrderType('dine-in')}
            >
              Dine-In
            </button>
            <button
              type="button"
              className={`pos-pill ${orderType === 'take-away' ? 'active' : ''}`}
              onClick={() => setOrderType('take-away')}
            >
              Take Away
            </button>
          </div>
        </div>

        {validationError && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md font-semibold">
            ⚠️ {validationError}
          </div>
        )}

        <div className="pos-form-grid">
          <div className="form-group">
            <label>Nama Pemesan *</label>
            <input
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>No WhatsApp Customer</label>
            <input
              type="tel"
              placeholder="Contoh: 081234567890"
              value={telepon}
              onChange={(e) => setTelepon(e.target.value)}
            />
          </div>

          {orderType === 'dine-in' && (
            <>
              <div className="form-group">
                <label>Nomor Meja *</label>
                <select
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                >
                  <option value="01">Meja 01 (Indoor Depan)</option>
                  <option value="02">Meja 02 (Indoor Tengah)</option>
                  <option value="03">Meja 03 (Indoor Kasir)</option>
                  <option value="04">Meja 04 (Indoor Jendela)</option>
                  <option value="05">Meja 05 (Outdoor Teras)</option>
                  <option value="06">Meja 06 (Outdoor Taman)</option>
                  <option value="07">Meja 07 (Lesehan 1)</option>
                  <option value="08">Meja 08 (Lesehan 2)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Jumlah Tamu</label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                >
                  <option value="1">1 Orang</option>
                  <option value="2">2 Orang</option>
                  <option value="3">3 Orang</option>
                  <option value="4">4 Orang</option>
                  <option value="5+">5+ Orang (Rombongan)</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group full-width">
            <label>Catatan Khusus Dapur (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Sambal dipisah, es batu sedikit, pedas sedang"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3. Daftar Rincian Menu Pesanan */}
      <div className="pos-cart-items-card">
        <div className="pos-cart-header">
          <div className="pos-cart-title">
            <span>🍽️</span>
            <strong>Rincian Menu</strong>
          </div>
          <span className="pos-count-tag">{cartItems.length} Menu Dipilih</span>
        </div>

        {cartItems.length === 0 ? (
          <div className="empty-cart-state">
            <div className="empty-cart-icon">🛒</div>
            <p>Keranjang pesanan masih kosong.</p>
            <small>Silakan pilih menu makanan & minuman di atas.</small>
          </div>
        ) : (
          <div className="pos-items-list">
            {cartItems.map((item) => (
              <div key={item.id} className="pos-item-row">
                <div className="pos-item-thumb">
                  <img
                    src={item.gambar || '/images/ayam-goreng.jpg'}
                    alt={item.nama}
                  />
                </div>
                <div className="pos-item-details">
                  <div className="pos-item-name">{item.nama}</div>
                  <div className="pos-item-price-unit">
                    @ Rp{item.harga.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="pos-item-actions">
                  <div className="pos-item-total">
                    Rp{(item.harga * item.qty).toLocaleString('id-ID')}
                  </div>
                  <div className="pos-qty-mini">
                    <button
                      type="button"
                      onClick={() => onKurang(item.id)}
                      title="Kurangi"
                    >
                      -
                    </button>
                    <span>{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => onTambah(item.id)}
                      title="Tambah"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Kalkulasi Subtotal & PB1 */}
            <div className="pos-calculation-box">
              <div className="calc-item">
                <span>Subtotal</span>
                <strong>Rp{subtotal.toLocaleString('id-ID')}</strong>
              </div>
              <div className="calc-item">
                <span>PB1 / Pajak Restoran (10%)</span>
                <strong>Rp{tax.toLocaleString('id-ID')}</strong>
              </div>
              <div className="calc-item total-final">
                <span>Total Akhir</span>
                <span className="total-price-large">
                  Rp{totalAkhir.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Pemilihan Metode Pembayaran & Konfirmasi Langsung */}
      {cartItems.length > 0 && (
        <div className="pos-payment-card" id="payment-action-area">
          <div className="pos-cart-header">
            <div className="pos-cart-title">
              <span>💳</span>
              <strong>Pilih Metode Pembayaran</strong>
            </div>
            <span className="pos-count-tag">1 Langkah Bayar & Cetak Struk</span>
          </div>

          <div className="payment-options-grid">
            <button
              type="button"
              className={`payment-option-card ${paymentMethod === 'cash' ? 'active' : ''}`}
              onClick={() => {
                setPaymentMethod('cash');
                if (typeof cashGiven !== 'number') {
                  setCashGiven(totalAkhir);
                }
              }}
            >
              <div className="pay-icon">💵</div>
              <strong className="pay-name">Tunai (Cash)</strong>
              <small className="pay-desc">Hitung Kembalian Kasir</small>
            </button>

            <button
              type="button"
              className={`payment-option-card ${paymentMethod === 'edc' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('edc')}
            >
              <div className="pay-icon">💳</div>
              <strong className="pay-name">EDC / Kartu</strong>
              <small className="pay-desc">Debit & Kredit Bank</small>
            </button>

            <button
              type="button"
              className={`payment-option-card ${paymentMethod === 'qris' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('qris')}
            >
              <div className="pay-tag-midtrans">MIDTRANS</div>
              <div className="pay-icon">📱</div>
              <strong className="pay-name">QRIS Dinamis</strong>
              <small className="pay-desc">GoPay, OVO, Dana, BCA</small>
            </button>
          </div>

          {/* ================= TABEL RINCIAN PEMBAYARAN ================= */}
          <div className="pos-order-summary-table-box">
            <div className="table-box-header">
              <span className="table-box-title">
                📋 Ringkasan Tagihan Transaksi
              </span>
              <span className="table-box-badge">
                {orderType === 'dine-in' ? `Dine-In (Meja ${tableNumber || '01'})` : 'Take Away (Bungkus)'}
              </span>
            </div>

            <div className="pos-summary-table-wrapper">
              <table className="pos-summary-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Menu Pesanan</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Harga Satuan</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ color: '#888' }}>{idx + 1}</td>
                      <td>
                        <strong>{item.nama}</strong>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.qty}x</td>
                      <td style={{ textAlign: 'right' }}>Rp{item.harga.toLocaleString('id-ID')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#193D2C' }}>
                        Rp{(item.harga * item.qty).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pos-table-calc-box">
              <div className="table-calc-row">
                <span>Subtotal ({cartItems.reduce((acc, it) => acc + it.qty, 0)} item)</span>
                <span>Rp{subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="table-calc-row">
                <span>PB1 / Pajak Restoran (10%)</span>
                <span>Rp{tax.toLocaleString('id-ID')}</span>
              </div>
              <div className="table-calc-row final-row">
                <span>Total Tagihan Pembayaran</span>
                <span style={{ color: '#193D2C' }}>Rp{totalAkhir.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* ================= AREA METODE PEMBAYARAN: TUNAI (CASH) ================= */}
          {paymentMethod === 'cash' && (
            <div className="cash-payment-form" style={{ marginTop: '16px' }}>
              <div className="cash-form-title">
                <span>💵</span> Tanya Dulu Duitnya: Berapa Uang Diterima dari Pelanggan?
              </div>

              <input
                type="number"
                className="cash-input-field"
                placeholder={`Ketik nominal, contoh: ${totalAkhir}`}
                value={cashGiven}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : '';
                  setCashGiven(val);
                }}
                autoFocus
              />

              {/* Tombol Cepat Pilihan Uang */}
              <div className="quick-cash-btns">
                <button
                  type="button"
                  className="btn-quick-cash"
                  style={{
                    backgroundColor: cashGiven === totalAkhir ? '#22C55E' : '#FFFFFF',
                    color: cashGiven === totalAkhir ? '#FFFFFF' : '#15803D',
                    fontWeight: '800',
                  }}
                  onClick={() => setCashGiven(totalAkhir)}
                >
                  Uang Pas (Rp{totalAkhir.toLocaleString('id-ID')})
                </button>

                {getQuickAmounts().map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="btn-quick-cash"
                    style={{
                      backgroundColor: cashGiven === amt ? '#22C55E' : '#FFFFFF',
                      color: cashGiven === amt ? '#FFFFFF' : '#15803D',
                      fontWeight: '800',
                    }}
                    onClick={() => setCashGiven(amt)}
                  >
                    Rp{amt.toLocaleString('id-ID')}
                  </button>
                ))}
              </div>

              {/* PENGINGAT KEMBALIAN (CHANGE REMINDER) SANGAT JELAS */}
              <div style={{ marginTop: '12px' }}>
                {cashGiven === '' || cashGiven === 0 ? (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#FEF3C7',
                      border: '1.5px solid #F59E0B',
                      color: '#B45309',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                  >
                    💡 Masukkan atau pilih nominal uang yang diserahkan pelanggan di atas.
                  </div>
                ) : cashGiven < totalAkhir ? (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#FEE2E2',
                      border: '1.5px solid #EF4444',
                      color: '#B91C1C',
                      fontSize: '13px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>⚠️ Uang Diterima Masih Kurang:</span>
                    <strong style={{ fontSize: '15px' }}>
                      - Rp{(totalAkhir - cashGiven).toLocaleString('id-ID')}
                    </strong>
                  </div>
                ) : cashGiven === totalAkhir ? (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#E0F2FE',
                      border: '1.5px solid #38BDF8',
                      color: '#0369A1',
                      fontSize: '14px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>✅ Uang Pas Sesuai Tagihan:</span>
                    <strong style={{ fontSize: '16px' }}>Kembalian Rp 0</strong>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      backgroundColor: '#DCFCE7',
                      border: '2px solid #22C55E',
                      color: '#14532D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 6px rgba(34, 197, 94, 0.15)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        💰 PENGINGAT UANG KEMBALIAN PELANGGAN:
                      </span>
                      <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                        Diterima Rp{cashGiven.toLocaleString('id-ID')} — Tagihan Rp{totalAkhir.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <strong style={{ fontSize: '22px', color: '#14532D', fontWeight: '900' }}>
                      Rp{kembalian.toLocaleString('id-ID')}
                    </strong>
                  </div>
                )}
              </div>

              {/* TOMBOL BAYAR TUNAI LANGSUNG MUNCULKAN STRUK */}
              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn-pay-now"
                  style={{
                    backgroundColor: !isCashSufficient ? '#9CA3AF' : '#193D2C',
                    cursor: !isCashSufficient ? 'not-allowed' : 'pointer',
                  }}
                  disabled={isProcessing || !isCashSufficient}
                  onClick={() => handleExecutePayment('cash')}
                >
                  {isProcessing
                    ? 'Menyimpan Transaksi...'
                    : !isCashSufficient
                    ? 'Uang Diterima Kurang'
                    : `Konfirmasi Pembayaran Tunai & Cetak Struk (Kembalian: Rp${kembalian.toLocaleString('id-ID')})`}
                </button>
              </div>
            </div>
          )}

          {/* ================= AREA METODE PEMBAYARAN: EDC (KARTU) ================= */}
          {paymentMethod === 'edc' && (
            <div className="cash-payment-form" style={{ marginTop: '16px', background: '#F8FAFC', borderColor: '#CBD5E1' }}>
              <div className="cash-form-title" style={{ color: '#1E293B' }}>
                <span>💳</span> Pembayaran Mesin EDC (Kartu Debit / Kredit)
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  marginBottom: '14px',
                  fontSize: '13px',
                  color: '#475569',
                  lineHeight: '1.5',
                }}
              >
                Silakan gesek atau tap kartu pelanggan pada mesin EDC kasir (BCA / Mandiri / BRI).
                Setelah struk dari mesin EDC keluar dengan status <strong>"APPROVED"</strong>, klik tombol di bawah untuk konfirmasi pembayaran dan mencetak struk resmi Warung Rahayu Jaya.
              </div>

              <button
                type="button"
                className="btn-pay-now"
                style={{ backgroundColor: '#1E3A8A' }}
                disabled={isProcessing}
                onClick={() => handleExecutePayment('edc')}
              >
                {isProcessing
                  ? 'Menyimpan Transaksi...'
                  : `Konfirmasi Pembayaran EDC & Cetak Struk (Rp${totalAkhir.toLocaleString('id-ID')})`}
              </button>
            </div>
          )}

          {/* ================= AREA METODE PEMBAYARAN: QRIS MIDTRANS ================= */}
          {paymentMethod === 'qris' && (
            <div className="qris-display-box" style={{ marginTop: '16px' }}>
              <div className="qris-box-header">
                <span className="qris-badge-logo">QRIS</span>
                <strong>Midtrans Dynamic Payment — Warung Rahayu Jaya</strong>
              </div>

              {/* Tampilan QR Code (Menampilkan link redirect resmi jika ada, atau petunjuk) */}
              <div className="qris-qr-wrapper" style={{ margin: '14px auto' }}>
                <QRCodeSVG
                  value={
                    redirectUrl ||
                    `https://app.midtrans.com/payment?merchant=warungrahayujaya&order=${orderNumber}&amt=${totalAkhir}`
                  }
                  size={190}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <p className="qris-instructions" style={{ fontSize: '12px', color: '#4B5563', marginBottom: '14px' }}>
                Mendukung pembayaran langsung via <strong>BCA Mobile, Livin Mandiri, BRImo, GoPay, OVO, DANA, ShopeePay</strong>, dan seluruh aplikasi perbankan berbasis QRIS.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Tombol Buka Pop-up Snap Midtrans */}
                <button
                  type="button"
                  className="btn-pay-now"
                  style={{ backgroundColor: '#0284C7' }}
                  disabled={isLoadingSnap || isProcessing}
                  onClick={handleOpenMidtransQRIS}
                >
                  {isLoadingSnap
                    ? 'Memuat Layar Midtrans...'
                    : '📱 Buka Layar QRIS Midtrans (Snap Pop-Up)'}
                </button>

                {/* Tombol Konfirmasi Langsung Kasir */}
                <button
                  type="button"
                  className="btn-pay-now"
                  style={{ backgroundColor: '#16A34A' }}
                  disabled={isProcessing}
                  onClick={() => handleExecutePayment('qris')}
                >
                  {isProcessing
                    ? 'Menyimpan Transaksi...'
                    : `Pelanggan Sudah Scan & Berhasil (Cetak Struk)`}
                </button>
              </div>
            </div>
          )}

          {/* Tombol Batalkan Keranjang */}
          <div className="pos-actions-bottom" style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn-clear-cart"
              onClick={onResetCart}
            >
              🗑️ Batalkan Pesanan
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
