import React from 'react';
import { generateReceiptPdf } from '../utils/generateReceiptPdf';

function formatWhatsAppNumber(phone) {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export default function ReceiptModal({ orderData, onClose }) {
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
    pesan += `PB1 (10%) : Rp${tax.toLocaleString('id-ID')}%0A`;
    pesan += `*TOTAL BAYAR : Rp${total.toLocaleString('id-ID')}*%0A`;
    pesan += `Metode : *${paymentMethod.toUpperCase()}*%0A`;
    pesan += `*STATUS : LUNAS (PAID) ✅*%0A`;
    pesan += `━━━━━━━━━━━━━━━━━━━━━%0A`;
    pesan += `Halo Kak *${nama}*, terima kasih telah bersantap di *Warung Rahayu Jaya*!%0A`;
    pesan += `Struk pesanan resmi Kakak sudah lunas dan tersimpan dalam sistem. Silakan simpan pesan ini sebagai bukti pembayaran sah. Selamat menikmati masakan kami! 🙏🍲`;

    window.open(`https://wa.me/${targetPhone}?text=${pesan}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-overlay" onClick={onClose}>
      <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-badge-success">
          <span>✓ Pembayaran Berhasil Diselesaikan!</span>
        </div>

        <div className="receipt-header">
          <div className="receipt-logo">🍽️ Warung Rahayu Jaya</div>
          <p className="receipt-address">
            Villa Gading Harapan 3 No.19 Blk D11, Babelan, Bekasi
          </p>
          <p className="receipt-contact">WhatsApp: 0858-1015-2088</p>
          <div className="receipt-status-badge">✓ LUNAS / PAID</div>
        </div>

        <div className="receipt-divider"></div>

        <div className="receipt-meta">
          <div className="meta-row">
            <span>No. Transaksi</span>
            <strong>{orderNumber}</strong>
          </div>
          <div className="meta-row">
            <span>Waktu</span>
            <span>{date}</span>
          </div>
          <div className="meta-row">
            <span>Tipe Layanan</span>
            <strong>
              {orderType === 'dine-in'
                ? `Dine-In (Meja ${tableNumber} • ${guestCount} Tamu)`
                : 'Take Away (Bungkus)'}
            </strong>
          </div>
          <div className="meta-row">
            <span>Customer</span>
            <span>{nama}</span>
          </div>
          <div className="meta-row">
            <span>No. WhatsApp</span>
            <span>{telepon}</span>
          </div>
          {catatan && (
            <div className="meta-row note-row">
              <span>Catatan</span>
              <span>"{catatan}"</span>
            </div>
          )}
        </div>

        <div className="receipt-divider"></div>

        <div className="receipt-items">
          {cartItems.map((item) => (
            <div key={item.id} className="receipt-item-row">
              <div className="receipt-item-left">
                <strong>{item.nama}</strong>
                <small>
                  {item.qty}x @ Rp{item.harga.toLocaleString('id-ID')}
                </small>
              </div>
              <div className="receipt-item-right">
                Rp{(item.harga * item.qty).toLocaleString('id-ID')}
              </div>
            </div>
          ))}
        </div>

        <div className="receipt-divider"></div>

        <div className="receipt-calc">
          <div className="calc-row">
            <span>Subtotal</span>
            <span>Rp{subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="calc-row">
            <span>PB1 / Pajak (10%)</span>
            <span>Rp{tax.toLocaleString('id-ID')}</span>
          </div>
          <div className="calc-row grand-total-row">
            <strong>Total Akhir</strong>
            <strong>Rp{total.toLocaleString('id-ID')}</strong>
          </div>
          <div className="calc-row payment-method-row">
            <span>Metode Bayar</span>
            <span className="method-tag">{paymentMethod.toUpperCase()}</span>
          </div>
        </div>

        <div className="receipt-footer-text">
          <p>Terima kasih telah memesan di Warung Rahayu Jaya!</p>
          <small>Simpan struk ini sebagai bukti transaksi resmi.</small>
        </div>

        <div className="receipt-actions">
          {/* Unduh Struk PDF */}
          <button
            type="button"
            className="receipt-btn download-pdf-btn"
            onClick={handleDownloadPdf}
          >
            📥 Unduh Struk PDF Resmi
          </button>

          {/* Kirim ke WhatsApp Customer */}
          <button
            type="button"
            className="receipt-btn wa-btn-receipt"
            onClick={handleSendWA}
          >
            📲 Kirim Struk ke WhatsApp Customer ({telepon})
          </button>

          <div className="receipt-actions-row">
            <button
              type="button"
              className="receipt-btn print-btn"
              onClick={handlePrint}
            >
              🖨️ Cetak Nota
            </button>
            <button
              type="button"
              className="receipt-btn close-btn"
              onClick={onClose}
            >
              ✕ Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
