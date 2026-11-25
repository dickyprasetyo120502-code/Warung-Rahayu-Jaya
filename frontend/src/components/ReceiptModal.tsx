import React, { useState } from 'react';
import { OrderData } from '../schemas/order.schema';
import { generateReceiptPdfBlob } from '../utils/generateReceiptPdf';

interface ReceiptModalProps {
  orderData: OrderData | null;
  onClose: () => void;
  onViewOrders?: () => void;
}

export default function ReceiptModal({ orderData, onClose, onViewOrders }: ReceiptModalProps) {
  const [waNotice, setWaNotice] = useState<string>('');

  if (!orderData) return null;

  const {
    orderNumber,
    orderType,
    tableNumber,
    guestCount,
    nama,
    telepon,
    catatan,
    cartItems,
    subtotal,
    tax,
    total,
    paymentMethod,
    date,
  } = orderData;

  const handleDownloadPdf = async () => {
    try {
      const blob = await generateReceiptPdfBlob(orderData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Struk-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('Gagal membuat file PDF struk.');
    }
  };

  const handleSendWA = () => {
    const rawPhone = telepon ? telepon.replace(/[^0-9]/g, '') : '';
    let phoneParam = rawPhone;

    if (phoneParam.startsWith('0')) {
      phoneParam = '62' + phoneParam.slice(1);
    }

    const itemsSummary = cartItems
      .map((it) => `• ${it.nama} (${it.qty}x) = Rp${(it.harga * it.qty).toLocaleString('id-ID')}`)
      .join('\n');

    const pesan = `Halo kak ${nama || 'Pelanggan'},\nBerikut struk pembelian resmi Anda di *Warung Rahayu Jaya*:\n\n*No. Pesanan:* ${orderNumber}\n*Waktu:* ${date}\n*Layanan:* ${orderType === 'dine-in' ? `Dine-In (Meja ${tableNumber})` : 'Take Away'}\n\n*Rincian Menu:*\n${itemsSummary}\n\n*Subtotal:* Rp${subtotal.toLocaleString('id-ID')}\n*PB1 (10%):* Rp${tax.toLocaleString('id-ID')}\n*Total Tagihan:* Rp${total.toLocaleString('id-ID')}\n*Metode:* ${paymentMethod.toUpperCase()} (LUNAS)\n\nTerima kasih atas kunjungan Anda di Warung Rahayu Jaya!`;

    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(pesan)}`
      : `https://wa.me/?text=${encodeURIComponent(pesan)}`;

    window.open(waUrl, '_blank');
    setWaNotice('WhatsApp dibuka. Anda dapat mengunggah file PDF struk jika diperlukan.');
  };

  const handlePrintThermal = () => {
    window.print();
  };

  return (
    <div className="receipt-overlay" onClick={onClose}>
      <div className="receipt-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="receipt-btn-close"
          onClick={onClose}
          aria-label="Tutup Struk"
        >
          ✕
        </button>

        <div className="receipt-header">
          <img
            src="/images/favicon.jpg"
            alt="Logo Warung Rahayu Jaya"
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              objectFit: 'cover',
              margin: '0 auto 10px',
              display: 'block',
              border: '2px solid #193D2C',
              boxShadow: '0 2px 8px rgba(25, 61, 44, 0.2)',
            }}
          />
          <div
            className="receipt-icon-success"
            style={{
              backgroundColor: orderData.paymentStatus === 'PENDING' ? '#F59E0B' : '#15803D',
            }}
          >
            {orderData.paymentStatus === 'PENDING' ? '⏳' : '✓'}
          </div>
          <h2>
            {orderData.paymentStatus === 'PENDING'
              ? 'Menunggu Pembayaran'
              : 'Pembayaran Berhasil!'}
          </h2>
          <p className="receipt-subtitle">Warung Rahayu Jaya</p>
          <small className="receipt-address">
            Villa Gading Harapan 3 No.19, Babelan, Bekasi
          </small>
        </div>

        <div className="receipt-divider-dashed"></div>

        <div className="receipt-meta-grid">
          <div className="receipt-meta-item">
            <span className="meta-label">No. Pesanan</span>
            <span className="meta-value order-id-bold">{orderNumber}</span>
          </div>
          <div className="receipt-meta-item text-right">
            <span className="meta-label">Waktu</span>
            <span className="meta-value">{date}</span>
          </div>
          <div className="receipt-meta-item">
            <span className="meta-label">Tipe Layanan</span>
            <span className="meta-value capitalize">
              {orderType === 'dine-in' ? `Meja ${tableNumber} (${guestCount} Tamu)` : 'Take Away (Bungkus)'}
            </span>
          </div>
          <div className="receipt-meta-item text-right">
            <span className="meta-label">Kasir</span>
            <span className="meta-value">Kasir Shift</span>
          </div>
          <div className="receipt-meta-item">
            <span className="meta-label">Pelanggan</span>
            <span className="meta-value">{nama}</span>
          </div>
          <div className="receipt-meta-item text-right">
            <span className="meta-label">No. WA</span>
            <span className="meta-value">{telepon || '-'}</span>
          </div>
        </div>

        {catatan && (
          <div className="receipt-notes-box">
            <span>Catatan:</span> {catatan}
          </div>
        )}

        <div className="receipt-divider-dashed"></div>

        <div className="receipt-items-list">
          <div className="receipt-items-header">
            <span>Menu</span>
            <span className="text-right">Subtotal</span>
          </div>

          {cartItems.map((item) => (
            <div key={item.id} className="receipt-item-row">
              <div className="receipt-item-name">
                <strong>{item.nama}</strong>
                <small>
                  {item.qty}x @Rp{item.harga.toLocaleString('id-ID')}
                </small>
              </div>
              <div className="receipt-item-price">
                Rp{(item.harga * item.qty).toLocaleString('id-ID')}
              </div>
            </div>
          ))}
        </div>

        <div className="receipt-divider-dashed"></div>

        <div className="receipt-totals-box">
          <div className="totals-row">
            <span>Subtotal</span>
            <span>Rp{subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="totals-row">
            <span>PB1 / Pajak Restoran (10%)</span>
            <span>Rp{tax.toLocaleString('id-ID')}</span>
          </div>
          <div className="totals-row total-highlight">
            <span>Total Akhir</span>
            <span>Rp{total.toLocaleString('id-ID')}</span>
          </div>

          {paymentMethod === 'cash' && orderData.cashGiven !== undefined && (
            <>
              <div className="totals-row" style={{ marginTop: '4px' }}>
                <span>Uang Tunai Diterima</span>
                <span>Rp{orderData.cashGiven.toLocaleString('id-ID')}</span>
              </div>
              <div className="totals-row" style={{ color: '#15803D', fontWeight: 'bold' }}>
                <span>Uang Kembalian (Change)</span>
                <span>Rp{(orderData.change || 0).toLocaleString('id-ID')}</span>
              </div>
            </>
          )}

          <div className="totals-row payment-status-row">
            <span>Metode Bayar</span>
            <span
              className={
                orderData.paymentStatus === 'PENDING'
                  ? 'badge-payment-pending'
                  : 'badge-payment-success'
              }
              style={{
                backgroundColor:
                  orderData.paymentStatus === 'PENDING' ? '#F59E0B' : '#15803D',
                color: '#FFFFFF',
                padding: '3px 8px',
                borderRadius: '4px',
                fontWeight: '800',
                fontSize: '11px',
              }}
            >
              {paymentMethod.toUpperCase()}{' '}
              {orderData.paymentStatus === 'PENDING' ? '(PENDING)' : '(LUNAS)'}
            </span>
          </div>
        </div>

        <div className="receipt-footer-thankyou">
          <p>Terima kasih atas kunjungan Anda!</p>
          <small>Struk ini merupakan bukti pembayaran resmi yang sah.</small>
        </div>

        <div className="receipt-action-buttons">
          <button
            type="button"
            className="btn-receipt-wa"
            onClick={handleSendWA}
          >
            <span>💬</span> Kirim Struk ke WhatsApp
          </button>

          <div className="receipt-sub-buttons">
            <button
              type="button"
              className="btn-receipt-pdf"
              onClick={handleDownloadPdf}
            >
              📄 Unduh PDF
            </button>
            <button
              type="button"
              className="btn-receipt-print"
              onClick={handlePrintThermal}
            >
              🖨️ Print Nota
            </button>
          </div>

          {onViewOrders && (
            <button
              type="button"
              className="btn-receipt-view-orders"
              onClick={() => {
                onClose();
                onViewOrders();
              }}
              style={{
                marginTop: '8px',
                padding: '11px',
                backgroundColor: '#E8F0EC',
                color: '#193D2C',
                border: '1.5px solid #CBE0D5',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13.5px',
                cursor: 'pointer',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📋</span> Lihat di Daftar Pesanan Customer
            </button>
          )}

          <button
            type="button"
            className="btn-receipt-finish"
            onClick={onClose}
            style={{
              marginTop: '8px',
              padding: '12px',
              backgroundColor: '#193D2C',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '800',
              fontSize: '14px',
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(25, 61, 44, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>✅</span> Selesai & Buat Pesanan Baru
          </button>
        </div>
      </div>
    </div>
  );
}
