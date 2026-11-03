import { jsPDF } from 'jspdf';

export function generateReceiptPdf(orderData) {
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

  // Thermal receipt style dimensions (80mm width)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 160 + cartItems.length * 8],
  });

  const pageWidth = 80;
  let y = 10;

  // Header
  doc.setFont('courier', 'bold');
  doc.setFontSize(13);
  doc.text('WARUNG RAHAYU JAYA', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text('Villa Gading Harapan 3 No.19 Blk D11', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('Babelan, Bekasi - WA: 0858-1015-2088', pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Divider
  doc.text('------------------------------------------', pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Order Info
  doc.setFontSize(8.5);
  doc.text(`No. Order  : ${orderNumber}`, 5, y);
  y += 4;
  doc.text(`Waktu      : ${date}`, 5, y);
  y += 4;
  const tipeStr = orderType === 'dine-in' ? `Dine-In (Meja ${tableNumber})` : 'Take Away (Bungkus)';
  doc.text(`Layanan    : ${tipeStr}`, 5, y);
  y += 4;
  doc.text(`Pemesan    : ${nama}`, 5, y);
  y += 4;
  doc.text(`No. WA     : ${telepon}`, 5, y);
  y += 4;

  if (catatan) {
    doc.text(`Catatan    : ${catatan}`, 5, y);
    y += 4;
  }

  // Divider
  doc.text('------------------------------------------', pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Items
  doc.setFont('courier', 'bold');
  doc.text('ITEM', 5, y);
  doc.text('TOTAL', pageWidth - 5, y, { align: 'right' });
  y += 4;
  doc.setFont('courier', 'normal');

  cartItems.forEach((item) => {
    const itemTotal = item.harga * item.qty;
    doc.text(`${item.nama}`, 5, y);
    y += 3.5;
    doc.text(`  ${item.qty}x @ Rp${item.harga.toLocaleString('id-ID')}`, 5, y);
    doc.text(`Rp${itemTotal.toLocaleString('id-ID')}`, pageWidth - 5, y, { align: 'right' });
    y += 4.5;
  });

  // Divider
  doc.text('------------------------------------------', pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Calculation
  doc.text('Subtotal', 5, y);
  doc.text(`Rp${subtotal.toLocaleString('id-ID')}`, pageWidth - 5, y, { align: 'right' });
  y += 4;

  doc.text('PB1 / Pajak (10%)', 5, y);
  doc.text(`Rp${tax.toLocaleString('id-ID')}`, pageWidth - 5, y, { align: 'right' });
  y += 4;

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL AKHIR', 5, y);
  doc.text(`Rp${total.toLocaleString('id-ID')}`, pageWidth - 5, y, { align: 'right' });
  y += 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  const methodLabel = paymentMethod === 'qris' ? 'QRIS (MIDTRANS)' : paymentMethod === 'cash' ? 'TUNAI' : 'EDC / KARTU';
  doc.text(`Metode : ${methodLabel}`, 5, y);
  y += 4;
  doc.setFont('courier', 'bold');
  doc.text('Status : LUNAS (PAID)', 5, y);
  y += 5;

  // Divider
  doc.text('------------------------------------------', pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Footer
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text('Terima kasih telah memesan di', pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.text('Warung Rahayu Jaya!', pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.text('Simpan struk ini sebagai bukti pembayaran sah.', pageWidth / 2, y, { align: 'center' });

  // Save / trigger download
  doc.save(`Struk-${orderNumber}.pdf`);
}

