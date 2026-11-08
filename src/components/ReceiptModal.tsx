import React from 'react';
import { generateReceiptPdf } from '../utils/generateReceiptPdf';
import { OrderData } from '../schemas/order.schema';

interface ReceiptModalProps {
  orderData: OrderData | null;
  onClose: () => void;
}

function formatWhatsAppNumber(phone?: string | null): string {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export default function ReceiptModal({ orderData, onClose }: ReceiptModalProps) {
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

  const handleDownloadPdf = () => {
    generateReceiptPdf(orderData);
  };

  const handleSendWA = () => {
    const targetPhone = formatWhatsAppNumber(telepon);

    let pesan = `*STRUK PEMBAYARAN RESMI - WARUNG RAHAYU JAYA*%0A`;
    pesan += `━━━━━━━━━━━━━━━━━━━━━%0A`;
    pesan += `📋 *No. Pesanan* : *${orderNumber}*%0A`;
    pesan += `📅 *Waktu* : ${date}%0A`;
    pesan += `🍽️ *Layanan* : ${
      orderType === 'dine-in'
        ? `Dine-In (Meja ${tableNumber} • ${guestCount} Tamu)`
        : 'Take Away (Bungkus)'
    }%0A`;
    pesan += `👤 *Customer* : ${nama}%0A`;
    pesan += `📞 *No. WA* : ${telepon}%0A`;
    if (catatan) {
      pesan += `📝 *Catatan* : ${catatan}%0A`;
    }
    pesan += `━━━━━━━━━━━━━━━━━━━━━%0A`;
    pesan += `*DETAIL MENU PESANAN:*%0A`;

    cartItems.forEach((item) => {
      const itemTotal = item.harga * item.qty;
      pesan += `• ${item.nama} x${item.qty} = Rp${itemTotal.toLocaleString('id-ID')}%0A`;
    });

    pesan += `━━━━━━━━━━━━━━━━━━━━━%0A`;
    pesan += `Subtotal : Rp${subtotal.toLocaleString('id-ID')}%0A`;
    pesan += `PB1 (Pajak 10%) : Rp${tax.toLocaleString('id-ID')}%0A`;
    pesan += `*TOTAL AKHIR : Rp${total.toLocaleString('id-ID')}*%0A`;
    pesan += `*Metode Bayar* : ${paymentMethod.toUpperCase()} (LUNAS)%0A`;
    pesan += `━━━━━━━━━━━━━━━━━━━━━%0A`;
    pesan += `_Terima kasih telah bersantap di Warung Rahayu Jaya! Semoga berkah dan sehat selalu._`;

    const waUrl = `https://wa.me/${targetPhone}?text=${pesan}`;
    window.open(waUrl, '_blank');
  };

  const handlePrintThermal = () => {
    window.print();
  };

  return (
    <div className="receipt-overlay" onClick={onClose}>
      <div className="receipt-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Tombol Tutup Silang */}
        <button
          type="button"
          className="receipt-btn-close"
          onClick={onClose}
          aria-label="Tutup Struk"
        >
          ✕
        </button>

        {/* Header Struk Nota Kasir */}
        <div className="receipt-header">
          <div className="receipt-icon-success">✓</div>
          <h2>Pembayaran Berhasil!</h2>
          <p className="receipt-subtitle">Warung Rahayu Jaya</p>
          <small className="receipt-address">
            Villa Gading Harapan 3 No.19, Babelan, Bekasi
          </small>
        </div>

        {/* Garis Gerigi / Separator Nota */}
        <div className="receipt-divider-dashed"></div>

        {/* Info Meja & Nomor Pesanan */}
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

        {/* Garis Separator */}
        <div className="receipt-divider-dashed"></div>

        {/* Daftar Menu Pesanan */}
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

        {/* Garis Separator */}
        <div className="receipt-divider-dashed"></div>

        {/* Ringkasan Total & Pajak */}
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
          <div className="totals-row payment-status-row">
            <span>Metode Bayar</span>
            <span className="badge-payment-success">
              {paymentMethod.toUpperCase()} (LUNAS)
            </span>
          </div>
        </div>

        <div className="receipt-footer-thankyou">
          <p>Terima kasih atas kunjungan Anda!</p>
          <small>Struk ini merupakan bukti pembayaran resmi yang sah.</small>
        </div>

        {/* Aksi Struk: Cetak PDF, Kirim WA, Print Nota */}
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
        </div>
      </div>
    </div>
  );
}

