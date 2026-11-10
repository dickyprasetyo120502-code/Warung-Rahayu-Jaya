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
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'cash' | 'edc'>('qris');

  const [orderNumber, setOrderNumber] = useState<string>(getNextOrderNumber());
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [cashGiven, setCashGiven] = useState<number | ''>('');

  useEffect(() => {
    setOrderNumber(getNextOrderNumber());
  }, []);

  const subtotal = grandTotal;
  const tax = Math.round(subtotal * 0.1);
  const totalAkhir = subtotal + tax;

  const actualCashGiven = typeof cashGiven === 'number' ? cashGiven : totalAkhir;
  const kembalian = typeof cashGiven === 'number' && cashGiven >= totalAkhir ? cashGiven - totalAkhir : 0;
  const isCashValid = paymentMethod !== 'cash' || (typeof cashGiven === 'number' && cashGiven >= totalAkhir);

  const qrisPayload = `https://app.midtrans.com/snap/v2/vtweb/${orderNumber.replace(/[^a-zA-Z0-9]/g, '')}?amount=${totalAkhir}&customer=${encodeURIComponent(
    nama || 'Tamu'
  )}&desc=WarungRahayuJaya`;

  // Step 1: Validasi form & konfirmasi pesanan dengan Zod
  const handleConfirmOrder = () => {
    setValidationError('');

    // ZOD VALIDATION FRONTEND
    const validationResult = createOrderSchema.safeParse({
      orderType,
      tableNumber: orderType === 'dine-in' ? tableNumber : null,
      guestCount: orderType === 'dine-in' ? guestCount : null,
      nama: nama.trim(),
      telepon: telepon.trim() || null,
      catatan: catatan.trim() || null,
      cartItems,
      paymentMethod,
    });

    if (!validationResult.success) {
      const issue = validationResult.error.issues[0]?.message || 'Data pesanan belum lengkap';
      setValidationError(issue);
      alert(issue);
      return;
    }

    if (paymentMethod === 'cash' && typeof cashGiven !== 'number') {
      setCashGiven(totalAkhir);
    }

    setIsConfirmed(true);

    const payArea = document.getElementById('payment-action-area');
    if (payArea) {
      payArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Step 2: Selesaikan pembayaran -> kirim ke Backend REST API dengan Axios (fallback lokal jika offline)
  const handlePaymentSuccess = async () => {
    if (paymentMethod === 'cash' && typeof cashGiven === 'number' && cashGiven < totalAkhir) {
      alert(`Uang tunai yang diberikan (Rp${cashGiven.toLocaleString('id-ID')}) kurang dari total tagihan (Rp${totalAkhir.toLocaleString('id-ID')})`);
      return;
    }

    setIsProcessing(true);

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
      paymentMethod,
      paymentStatus: 'PAID',
      cashGiven: paymentMethod === 'cash' ? actualCashGiven : undefined,
      change: paymentMethod === 'cash' ? kembalian : undefined,
      date: new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      timestamp: new Date().toISOString(),
    };

    try {
      // 1. Coba simpan ke Backend PostgreSQL REST API dengan Axios
      await api.post('/orders', orderData);
    } catch (e: any) {
      console.warn('Backend REST API tidak aktif, menyimpan ke penyimpanan lokal tersinkron:', e.message);
    }

    // 2. Simpan ke sinkronisasi lokal dan potong stok
    deductStock(cartItems);
    recordTransaction(orderData);
    incrementOrderNumber();

    setIsProcessing(false);
    setIsConfirmed(false);
    onResetCart();
    setNama('');
    setTelepon('');
    setCatatan('');
    setCashGiven('');
    setOrderNumber(getNextOrderNumber());

    onShowReceipt(orderData);
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
              onClick={() => {
                setOrderType('dine-in');
                setIsConfirmed(false);
              }}
            >
              Dine-In
            </button>
            <button
              type="button"
              className={`pos-pill ${orderType === 'take-away' ? 'active' : ''}`}
              onClick={() => {
                setOrderType('take-away');
                setIsConfirmed(false);
              }}
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
              onChange={(e) => {
                setNama(e.target.value);
                setIsConfirmed(false);
              }}
              required
            />
          </div>

          <div className="form-group">
            <label>No WhatsApp Customer</label>
            <input
              type="tel"
              placeholder="Contoh: 081234567890"
              value={telepon}
              onChange={(e) => {
                setTelepon(e.target.value);
                setIsConfirmed(false);
              }}
            />
          </div>

          {orderType === 'dine-in' && (
            <>
              <div className="form-group">
                <label>Nomor Meja *</label>
                <select
                  value={tableNumber}
                  onChange={(e) => {
                    setTableNumber(e.target.value);
                    setIsConfirmed(false);
                  }}
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
                  onChange={(e) => {
                    setGuestCount(e.target.value);
                    setIsConfirmed(false);
                  }}
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
              onChange={(e) => {
                setCatatan(e.target.value);
                setIsConfirmed(false);
              }}
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
                      onClick={() => {
                        onKurang(item.id);
                        setIsConfirmed(false);
                      }}
                      title="Kurangi"
                    >
                      -
                    </button>
                    <span>{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onTambah(item.id);
                        setIsConfirmed(false);
                      }}
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

      {/* 4. Pemilihan Metode Pembayaran & Step Pembayaran */}
      {cartItems.length > 0 && (
        <div className="pos-payment-card" id="payment-action-area">
          <div className="pos-cart-header">
            <div className="pos-cart-title">
              <span>💳</span>
              <strong>Metode Pembayaran</strong>
            </div>
            <span className="pos-count-tag">Pilih 1 Opsi</span>
          </div>

          <div className="payment-options-grid">
            <button
              type="button"
              className={`payment-option-card ${paymentMethod === 'qris' ? 'active' : ''}`}
              onClick={() => {
                setPaymentMethod('qris');
                setIsConfirmed(false);
              }}
            >
              <div className="pay-tag-midtrans">MIDTRANS QRIS</div>
              <div className="pay-icon">📱</div>
              <strong className="pay-name">QRIS Dinamis</strong>
              <small className="pay-desc">Gopay, OVO, Dana, BCA</small>
            </button>

            <button
              type="button"
              className={`payment-option-card ${paymentMethod === 'cash' ? 'active' : ''}`}
              onClick={() => {
                setPaymentMethod('cash');
                setIsConfirmed(false);
              }}
            >
              <div className="pay-icon">💵</div>
              <strong className="pay-name">Tunai</strong>
              <small className="pay-desc">Cash di Kasir</small>
            </button>

            <button
              type="button"
              className={`payment-option-card ${paymentMethod === 'edc' ? 'active' : ''}`}
              onClick={() => {
                setPaymentMethod('edc');
                setIsConfirmed(false);
              }}
            >
              <div className="pay-icon">💳</div>
              <strong className="pay-name">EDC / Kartu</strong>
              <small className="pay-desc">Debit / Kredit</small>
            </button>
          </div>

          {/* ================= TABEL RINCIAN PEMBAYARAN SEBELUM/SAAT KONFIRMASI ================= */}
          <div className="pos-order-summary-table-box">
            <div className="table-box-header">
              <span className="table-box-title">
                📋 Tabel Rincian Pembayaran Pesanan
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
                <span>Subtotal ({cartItems.reduce((acc, it) => acc + it.qty, 0)} porsi)</span>
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

          {/* ================= STEP 1: BELUM KONFIRMASI ================= */}
          {!isConfirmed ? (
            <div className="pos-pre-confirm-notice">
              <p className="notice-text">
                ⚠️ Pastikan nama pemesan dan nomor meja (jika Dine-In) sudah sesuai dengan tabel di atas.
                Klik <strong>Konfirmasi Pesanan</strong> untuk melanjutkan proses pembayaran.
              </p>
              <button
                type="button"
                className="btn-pos-confirm"
                onClick={handleConfirmOrder}
              >
                Konfirmasi Pesanan (Rp{totalAkhir.toLocaleString('id-ID')})
              </button>
            </div>
          ) : (
            /* ================= STEP 2: SUDAH KONFIRMASI (QRIS / TUNAI / EDC AKTIF) ================= */
            <div className="pos-confirmed-payment-box">
              {paymentMethod === 'qris' && (
                <div className="qris-display-box">
                  <div className="qris-box-header">
                    <span className="qris-badge-logo">QRIS</span>
                    <strong>Midtrans Dynamic Payment</strong>
                  </div>

                  <div className="qris-qr-wrapper">
                    <QRCodeSVG
                      value={qrisPayload}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <div className="qris-scanning-indicator">
                    <span className="spin-dot"></span>
                    <span>Menunggu pelanggan memindai QR Code...</span>
                  </div>

                  <p className="qris-instructions">
                    Arahkan layar atau cetak kode QR kepada customer. Mendukung BCA, GoPay, OVO, DANA, ShopeePay, dan seluruh m-Banking.
                  </p>

                  <div className="payment-action-buttons">
                    <button
                      type="button"
                      className="btn-pay-now btn-pay-qris"
                      onClick={handlePaymentSuccess}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Memproses Transaksi...' : `Selesaikan & Terbitkan Struk (Rp${totalAkhir.toLocaleString('id-ID')})`}
                    </button>
                  </div>
                </div>
              )}

              {paymentMethod === 'cash' && (
                <div className="cash-display-box active">
                  <div className="cash-icon-header">💵</div>
                  <h3>Pembayaran Tunai Kasir</h3>
                  <p className="cash-amount">
                    Total Tagihan: <strong>Rp{totalAkhir.toLocaleString('id-ID')}</strong>
                  </p>

                  {/* Form Kalkulator Kembalian Kasir */}
                  <div className="cash-payment-form">
                    <div className="cash-form-title">
                      <span>💰</span> Input Uang Diterima dari Pelanggan:
                    </div>
                    <input
                      type="number"
                      className="cash-input-field"
                      placeholder={`Minimal Rp${totalAkhir.toLocaleString('id-ID')}`}
                      value={cashGiven}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : '';
                        setCashGiven(val);
                      }}
                    />

                    <div className="quick-cash-btns">
                      <button
                        type="button"
                        className="btn-quick-cash"
                        onClick={() => setCashGiven(totalAkhir)}
                      >
                        Uang Pas (Rp{totalAkhir.toLocaleString('id-ID')})
                      </button>
                      {[50000, 100000, 150000, 200000].map(
                        (amt) =>
                          amt >= totalAkhir && (
                            <button
                              key={amt}
                              type="button"
                              className="btn-quick-cash"
                              onClick={() => setCashGiven(amt)}
                            >
                              Rp{amt.toLocaleString('id-ID')}
                            </button>
                          )
                      )}
                    </div>

                    <div className="cash-change-display">
                      <span>Uang Kembalian (Change):</span>
                      <strong>Rp{kembalian.toLocaleString('id-ID')}</strong>
                    </div>
                  </div>

                  <div className="payment-action-buttons">
                    <button
                      type="button"
                      className="btn-pay-now btn-pay-cash"
                      onClick={handlePaymentSuccess}
                      disabled={isProcessing || !isCashValid}
                    >
                      {isProcessing
                        ? 'Menyimpan...'
                        : !isCashValid
                        ? 'Uang Diterima Kurang'
                        : `Uang Diterima & Cetak Struk (Kembalian: Rp${kembalian.toLocaleString('id-ID')})`}
                    </button>
                  </div>
                </div>
              )}

              {paymentMethod === 'edc' && (
                <div className="cash-display-box active">
                  <div className="cash-icon-header">💳</div>
                  <h3>Pembayaran Mesin EDC / Debit</h3>
                  <p className="cash-amount">
                    Total Transaksi Kartu: <strong>Rp{totalAkhir.toLocaleString('id-ID')}</strong>
                  </p>
                  <p className="cash-instruction">
                    Silakan gesek atau tap kartu Debit / Kredit pelanggan pada mesin EDC Mandiri / BCA / BRI. Setelah transaksi approved di mesin EDC, tekan tombol berikut untuk menyelesaikan.
                  </p>

                  <div className="payment-action-buttons">
                    <button
                      type="button"
                      className="btn-pay-now btn-pay-edc"
                      onClick={handlePaymentSuccess}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Menyimpan...' : `EDC Approved & Cetak Struk (Rp${totalAkhir.toLocaleString('id-ID')})`}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setIsConfirmed(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6B7280',
                    fontSize: '12px',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  ← Edit Data / Ubah Menu Pesanan
                </button>
              </div>
            </div>
          )}

          <div className="pos-actions-bottom">
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

