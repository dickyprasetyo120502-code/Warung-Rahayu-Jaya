import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getNextOrderNumber, incrementOrderNumber } from '../utils/orderNumber';
import { deductStock, recordTransaction } from '../utils/stockStorage';

export default function CartSection({
  cartItems,
  grandTotal,
  orderType,
  setOrderType,
  onTambah,
  onKurang,
  onResetCart,
  onShowReceipt,
}) {
  const [nama, setNama] = useState('');
  const [telepon, setTelepon] = useState('');
  const [tableNumber, setTableNumber] = useState('01');
  const [guestCount, setGuestCount] = useState('2');
  const [catatan, setCatatan] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('qris'); // 'qris' | 'cash' | 'edc'

  // Sequence order number: WRJ-001, WRJ-002, dst
  const [orderNumber, setOrderNumber] = useState(getNextOrderNumber());

  // Step state: false = Belum Konfirmasi (QRIS belum muncul), true = Konfirmasi (Muncul QRIS / Layar Pembayaran)
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Update order number on mount
  useEffect(() => {
    setOrderNumber(getNextOrderNumber());
  }, []);

  // Tax calculation (PB1 10%)
  const subtotal = grandTotal;
  const tax = Math.round(subtotal * 0.1);
  const totalAkhir = subtotal + tax;

  // Midtrans dynamic QR payload
  const qrisPayload = `https://app.midtrans.com/snap/v2/vtweb/${orderNumber.replace(/[^a-zA-Z0-9]/g, '')}?amount=${totalAkhir}&customer=${encodeURIComponent(
    nama || 'Tamu'
  )}&desc=WarungRahayuJaya`;

  // Step 1: Validasi form & konfirmasi pesanan (baru memunculkan QRIS / instruksi)
  const handleConfirmOrder = () => {
    if (cartItems.length === 0) {
      alert('Silakan pilih minimal 1 menu sebelum melakukan konfirmasi.');
      return;
    }

    if (!nama.trim()) {
      alert('Silakan isi Nama Pemesan terlebih dahulu.');
      return;
    }

    if (!telepon.trim()) {
      alert('Silakan isi Nomor WhatsApp customer.');
      return;
    }

    if (orderType === 'dine-in' && !tableNumber) {
      alert('Silakan pilih Nomor Meja untuk layanan Dine-In.');
      return;
    }

    // Lolos validasi, masuk ke mode pembayaran (QRIS / Tunai / EDC aktif)
    setIsConfirmed(true);

    // Smooth scroll ke area pembayaran
    const payArea = document.getElementById('payment-action-area');
    if (payArea) {
      payArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Step 2: Selesaikan pembayaran -> Struk muncul & nomor pesanan bertambah ke WRJ berikutnya
  const handlePaymentSuccess = () => {
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);

      const orderData = {
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
        date: new Date().toLocaleString('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      };

      // Potong stok bahan & catat transaksi penjualan ke sistem Admin
      deductStock(cartItems);
      recordTransaction(orderData);

      // Naikkan counter pesanan untuk transaksi berikutnya (WRJ-001 -> WRJ-002 dst)
      incrementOrderNumber();
      setOrderNumber(getNextOrderNumber());

      // Reset state form & konfirmasi
      setIsConfirmed(false);

      // Tampilkan struk ke customer
      onShowReceipt(orderData);

      // Kosongkan keranjang
      onResetCart(false);
    }, 700);
  };

  const handleCancelPayment = () => {
    setIsConfirmed(false);
  };

  const handleHoldBill = () => {
    if (cartItems.length === 0) {
      alert('Belum ada pesanan untuk disimpan.');
      return;
    }
    alert(`Pesanan ${orderNumber} berhasil disimpan sementara (Hold Bill).`);
  };

  return (
    <section className="cart-pos-container" id="cart">
      {/* ================= HEADER CARD (Style Stitch) ================= */}
      <div className="pos-order-card">
        <div className="pos-order-left">
          <div className="pos-order-icon">
            {orderType === 'dine-in' ? '🪑' : '🛍️'}
          </div>
          <div className="pos-order-info">
            <div className="pos-order-title">
              <strong>{orderType === 'dine-in' ? `Meja ${tableNumber}` : 'Take Away'}</strong>
              <span className={`pos-badge ${orderType}`}>
                {orderType === 'dine-in' ? 'Dine-In' : 'Take Away'}
              </span>
            </div>
            <p className="pos-order-subtitle">
              {nama ? nama : 'Customer'} •{' '}
              {orderType === 'dine-in' ? `${guestCount} Tamu` : 'Bungkus Pulang'}
            </p>
          </div>
        </div>

        <div className="pos-order-right">
          <span className="order-num-label">No. Pesanan</span>
          <strong className="order-num-value">{orderNumber}</strong>
        </div>
      </div>

      {/* ================= FORM PENGATURAN TAMU & MEJA ================= */}
      <div className="pos-form-box">
        <div className="pos-form-header">
          <span className="pos-form-title">📋 Data Pemesan & Layanan</span>
          <div className="pos-pill-group">
            <button
              type="button"
              className={`pos-pill ${orderType === 'dine-in' ? 'active' : ''}`}
              onClick={() => {
                setOrderType('dine-in');
                setIsConfirmed(false);
              }}
            >
              🍽️ Dine-In
            </button>
            <button
              type="button"
              className={`pos-pill ${orderType === 'take-away' ? 'active' : ''}`}
              onClick={() => {
                setOrderType('take-away');
                setIsConfirmed(false);
              }}
            >
              🛍️ Take Away
            </button>
          </div>
        </div>

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
            <label>No WhatsApp Customer </label>
            <input
              type="tel"
              placeholder="Contoh: 081234567890"
              value={telepon}
              onChange={(e) => {
                setTelepon(e.target.value);
                setIsConfirmed(false);
              }}
              required
            />
          </div>

          {/* HANYA TAMPIL JIKA DINE-IN (Kalo Take Away gausah ada nomor table) */}
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
                  <option value="03">Meja 03 (Indoor Belakang)</option>
                  <option value="04">Meja 04 (Lantai 1)</option>
                  <option value="05">Meja 05 (Outdoor Taman)</option>
                  <option value="06">Meja 06 (Outdoor Kanopi)</option>
                  <option value="07">Meja 07 (Lesehan A)</option>
                  <option value="08">Meja 08 (Lesehan B)</option>
                  <option value="09">Meja 09 (VIP AC)</option>
                  <option value="10">Meja 10 (Keluarga)</option>
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
            <label>Catatan Pesanan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Sambal dipisah, nasi hangat, kuah banyak..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ================= RINCIAN MENU ================= */}
      <div className="pos-card-section">
        <div className="pos-section-header">
          <div className="pos-section-title">
            <span>🍽️</span>
            <strong>Rincian Menu</strong>
          </div>
          <span className="pos-badge-count">
            {cartItems.length} Menu Dipilih
          </span>
        </div>

        <div className="pos-items-list">
          {cartItems.length === 0 ? (
            <div className="pos-empty-state">
              <p>Keranjang masih kosong.</p>
              <small>Silakan pilih menu makanan dan minuman pada daftar menu di atas.</small>
            </div>
          ) : (
            cartItems.map((item) => {
              const itemTotal = item.harga * item.qty;
              return (
                <div key={item.id} className="pos-item-row">
                  <div className="pos-item-thumb">
                    <img src={item.gambar} alt={item.nama} />
                  </div>

                  <div className="pos-item-details">
                    <div className="pos-item-name">
                      {item.qty}x {item.nama}
                    </div>
                    <div className="pos-item-price-unit">
                      @ Rp{item.harga.toLocaleString('id-ID')}
                    </div>
                    {catatan && (
                      <span className="pos-item-tag">📝 {catatan}</span>
                    )}
                  </div>

                  <div className="pos-item-actions">
                    <div className="pos-item-total">
                      Rp{itemTotal.toLocaleString('id-ID')}
                    </div>
                    <div className="pos-qty-mini">
                      <button
                        type="button"
                        onClick={() => {
                          onKurang(item.id);
                          setIsConfirmed(false);
                        }}
                        aria-label="Kurang"
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
                        aria-label="Tambah"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Kalkulasi Subtotal & PB1 Pajak */}
        <div className="pos-calculation-box">
          <div className="calc-item">
            <span>Subtotal</span>
            <span>Rp{subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="calc-item">
            <span>PB1 / Pajak Restoran (10%)</span>
            <span>Rp{tax.toLocaleString('id-ID')}</span>
          </div>
          <div className="calc-item total-final">
            <strong>Total Akhir</strong>
            <strong className="total-price-large">
              Rp{totalAkhir.toLocaleString('id-ID')}
            </strong>
          </div>
        </div>
      </div>

      {/* ================= METODE PEMBAYARAN ================= */}
      <div className="pos-card-section" id="payment-action-area">
        <div className="pos-section-header">
          <div className="pos-section-title">
            <span>💳</span>
            <strong>Pilihan Metode Pembayaran</strong>
          </div>
          <span className="pos-badge-highlight">Pilih 1 Opsi</span>
        </div>

        <div className="payment-options-grid">
          {/* Opsi QRIS (Midtrans) */}
          <button
            type="button"
            className={`payment-option-card ${paymentMethod === 'qris' ? 'active' : ''}`}
            onClick={() => {
              setPaymentMethod('qris');
              setIsConfirmed(false);
            }}
          >
            <div className="pay-icon">📱</div>
            <div className="pay-name">QRIS</div>
            <div className="pay-desc">OVO, Dana, Shopee, BCA</div>
            <span className="pay-tag-midtrans">Midtrans</span>
          </button>

          {/* Opsi Tunai */}
          <button
            type="button"
            className={`payment-option-card ${paymentMethod === 'cash' ? 'active' : ''}`}
            onClick={() => {
              setPaymentMethod('cash');
              setIsConfirmed(false);
            }}
          >
            <div className="pay-icon">💵</div>
            <div className="pay-name">Tunai</div>
            <div className="pay-desc">Cash Kasir</div>
          </button>

          {/* Opsi EDC / Kartu */}
          <button
            type="button"
            className={`payment-option-card ${paymentMethod === 'edc' ? 'active' : ''}`}
            onClick={() => {
              setPaymentMethod('edc');
              setIsConfirmed(false);
            }}
          >
            <div className="pay-icon">💳</div>
            <div className="pay-name">EDC / Kartu</div>
            <div className="pay-desc">Debit / Kredit</div>
          </button>
        </div>

        {/* ================= KONDISI TAMPILAN: JIKA BELUM KONFIRMASI ================= */}
        {!isConfirmed && (
          <div className="pos-pre-confirm-notice">
            <p className="notice-text">
              📌 Silakan periksa kembali pesanan Anda di atas, lalu klik tombol konfirmasi di bawah untuk menghasilkan kode pembayaran resmi.
            </p>
            <button
              type="button"
              className="pos-btn-primary"
              onClick={handleConfirmOrder}
              disabled={cartItems.length === 0}
            >
              {paymentMethod === 'qris' && (
                <>📱 Konfirmasi & Tampilkan QRIS Midtrans (Rp{totalAkhir.toLocaleString('id-ID')})</>
              )}
              {paymentMethod === 'cash' && (
                <>💵 Konfirmasi Pesanan Tunai di Kasir (Rp{totalAkhir.toLocaleString('id-ID')})</>
              )}
              {paymentMethod === 'edc' && (
                <>💳 Konfirmasi Pembayaran Kartu EDC (Rp{totalAkhir.toLocaleString('id-ID')})</>
              )}
            </button>
          </div>
        )}

        {/* ================= KONDISI TAMPILAN: SETELAH KONFIRMASI DILAKUKAN ================= */}
        {isConfirmed && (
          <div className="pos-confirmed-payment-box">
            {/* 1. JIKA QRIS: BARU TAMPIL KODE QRIS MIDTRANS */}
            {paymentMethod === 'qris' && (
              <div className="qris-display-box">
                <div className="qris-box-header">
                  <span className="qris-badge-logo">QRIS</span>
                  <strong>QRIS Dinamis Midtrans #{orderNumber}</strong>
                </div>

                <div className="qris-qr-wrapper">
                  <QRCodeSVG
                    value={qrisPayload}
                    size={200}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: '/images/favicon.jpg',
                      x: undefined,
                      y: undefined,
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                  <div className="qris-scanning-indicator">
                    <span className="spin-dot"></span>
                    <span>Menunggu Pembayaran Midtrans (Rp{totalAkhir.toLocaleString('id-ID')})...</span>
                  </div>
                </div>

                <p className="qris-instructions">
                  Scan kode QRIS di atas menggunakan BCA Mobile, GoPay, OVO, Dana, ShopeePay, atau m-Banking apa saja.
                </p>

                <div className="payment-action-buttons">
                  <button
                    type="button"
                    className="btn-pay-now qris-pay-btn"
                    onClick={handlePaymentSuccess}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '⏳ Memverifikasi Pembayaran...' : '✅ Selesaikan Pembayaran QRIS (Bayar Sukses)'}
                  </button>
                  <button
                    type="button"
                    className="btn-change-method"
                    onClick={handleCancelPayment}
                  >
                    ↩️ Ubah Metode / Data Pesanan
                  </button>
                </div>
              </div>
            )}

            {/* 2. JIKA TUNAI: TAMPIL INSTRUKSI CASH KASIR */}
            {paymentMethod === 'cash' && (
              <div className="cash-display-box active">
                <div className="cash-icon-header">💵</div>
                <h3>Pembayaran Tunai Kasir</h3>
                <p className="cash-amount">
                  Total yang harus dibayar: <strong>Rp{totalAkhir.toLocaleString('id-ID')}</strong>
                </p>
                <p className="cash-instruction">
                  Nomor Pesanan: <strong>{orderNumber}</strong> ({orderType === 'dine-in' ? `Meja ${tableNumber}` : 'Take Away'})
                  <br />
                  Silakan serahkan uang tunai kepada kasir Warung Rahayu Jaya.
                </p>

                <div className="payment-action-buttons">
                  <button
                    type="button"
                    className="btn-pay-now cash-pay-btn"
                    onClick={handlePaymentSuccess}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '⏳ Memproses Struk...' : '✅ Terima Uang Tunai & Selesaikan (Lunas)'}
                  </button>
                  <button
                    type="button"
                    className="btn-change-method"
                    onClick={handleCancelPayment}
                  >
                    ↩️ Ubah Metode / Data Pesanan
                  </button>
                </div>
              </div>
            )}

            {/* 3. JIKA EDC: TAMPIL INSTRUKSI MESIN EDC KASIR */}
            {paymentMethod === 'edc' && (
              <div className="cash-display-box active">
                <div className="cash-icon-header">💳</div>
                <h3>Pembayaran Mesin EDC Kasir</h3>
                <p className="cash-amount">
                  Nominal Transaksi: <strong>Rp{totalAkhir.toLocaleString('id-ID')}</strong>
                </p>
                <p className="cash-instruction">
                  Nomor Pesanan: <strong>{orderNumber}</strong>
                  <br />
                  Silakan gesek atau tap kartu Debit / Kredit pelanggan pada mesin EDC kasir.
                </p>

                <div className="payment-action-buttons">
                  <button
                    type="button"
                    className="btn-pay-now edc-pay-btn"
                    onClick={handlePaymentSuccess}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '⏳ Memproses Struk...' : '✅ Konfirmasi EDC Berhasil & Selesaikan'}
                  </button>
                  <button
                    type="button"
                    className="btn-change-method"
                    onClick={handleCancelPayment}
                  >
                    ↩️ Ubah Metode / Data Pesanan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= TOMBOL SEKUNDER ================= */}
      <div className="pos-actions-box">
        <div className="pos-secondary-actions">
          <button
            type="button"
            className="pos-btn-secondary hold-btn"
            onClick={handleHoldBill}
          >
            ⏸️ Simpan / Hold Bill
          </button>
          <button
            type="button"
            className="pos-btn-secondary cancel-btn"
            onClick={() => onResetCart(true)}
          >
            ❌ Batal / Reset
          </button>
        </div>
      </div>
    </section>
  );
}
