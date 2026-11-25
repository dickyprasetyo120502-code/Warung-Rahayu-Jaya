import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { OrderData } from '../../schemas/order.schema';

interface ProfitReportProps {
  transactions?: OrderData[];
  stocks?: Record<string, number>;
  totalPendapatanHariIni?: number;
}

export default function ProfitReport({
  transactions = [],
  stocks = {},
}: ProfitReportProps) {
  const [period, setPeriod] = useState<'hari' | 'minggu' | 'bulan' | 'tahun' | 'semua'>('hari');

  const now = new Date();
  const fullDateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const fullTimeStr =
    now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WIB';

  const currentMonthYear = now.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  const periodBreakdown = useMemo(() => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    let dailyTotal = 0;
    let dailyCount = 0;
    let weeklyTotal = 0;
    let weeklyCount = 0;
    let monthlyTotal = 0;
    let monthlyCount = 0;
    let yearlyTotal = 0;
    let yearlyCount = 0;
    let allTotal = 0;
    let allCount = 0;

    const todayList: OrderData[] = [];

    transactions.forEach((tx) => {
      if (tx.paymentStatus === 'PENDING') return;
      const amount = tx.total || 0;
      const txTime = tx.timestamp ? new Date(tx.timestamp).getTime() : now.getTime();

      allTotal += amount;
      allCount++;

      if (txTime >= startOfToday) {
        dailyTotal += amount;
        dailyCount++;
        todayList.push(tx);
      }
      if (txTime >= sevenDaysAgo) {
        weeklyTotal += amount;
        weeklyCount++;
      }
      if (txTime >= startOfMonth) {
        monthlyTotal += amount;
        monthlyCount++;
      }
      if (txTime >= startOfYear) {
        yearlyTotal += amount;
        yearlyCount++;
      }
    });

    return {
      daily: { total: dailyTotal, count: dailyCount },
      weekly: { total: weeklyTotal, count: weeklyCount },
      monthly: { total: monthlyTotal, count: monthlyCount },
      yearly: { total: yearlyTotal, count: yearlyCount },
      all: { total: allTotal, count: allCount },
      todayOrders: todayList,
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const paidTx = (transactions || []).filter((tx) => tx.paymentStatus !== 'PENDING');
    if (paidTx.length === 0) return [];

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    return paidTx.filter((tx) => {
      const txMs = tx.timestamp ? new Date(tx.timestamp).getTime() : now.getTime();
      if (period === 'hari') return txMs >= startOfToday;
      if (period === 'minggu') return txMs >= sevenDaysAgo;
      if (period === 'bulan') return txMs >= startOfMonth;
      if (period === 'tahun') return txMs >= startOfYear;
      return true;
    });
  }, [transactions, period]);

  const financialStats = useMemo(() => {
    const txList = filteredTransactions;
    const txCount = txList.length;

    let gross = 0;
    let payQrisTotal = 0;
    let payCashTotal = 0;
    let payEdcTotal = 0;
    let payQrisCount = 0;
    let payCashCount = 0;
    let payEdcCount = 0;

    const soldMap: Record<string, { id: string; nama: string; harga: number; qty: number; total: number }> = {};

    txList.forEach((tx) => {
      const amount = tx.total || 0;
      gross += amount;

      if (tx.paymentMethod === 'qris') {
        payQrisTotal += amount;
        payQrisCount++;
      } else if (tx.paymentMethod === 'cash') {
        payCashTotal += amount;
        payCashCount++;
      } else if (tx.paymentMethod === 'edc') {
        payEdcTotal += amount;
        payEdcCount++;
      }

      if (tx.cartItems && Array.isArray(tx.cartItems)) {
        tx.cartItems.forEach((item) => {
          if (!soldMap[item.id]) {
            soldMap[item.id] = {
              id: item.id,
              nama: item.nama,
              harga: item.harga,
              qty: 0,
              total: 0,
            };
          }
          soldMap[item.id].qty += item.qty;
          soldMap[item.id].total += item.harga * item.qty;
        });
      }
    });

    const aov = txCount > 0 ? Math.round(gross / txCount) : 0;

    const totalPayCount = txCount || 1;
    const qrisPct = txCount > 0 ? Math.round((payQrisCount / totalPayCount) * 100) : 0;
    const cashPct = txCount > 0 ? Math.round((payCashCount / totalPayCount) * 100) : 0;
    const edcPct = txCount > 0 ? 100 - (qrisPct + cashPct) : 0;

    const soldItemsList = Object.values(soldMap).sort((a, b) => b.qty - a.qty);

    return {
      grossSales: gross,
      txCount,
      aov,
      payStats: {
        qrisTotal: payQrisTotal,
        cashTotal: payCashTotal,
        edcTotal: payEdcTotal,
        qrisCount: payQrisCount,
        cashCount: payCashCount,
        edcCount: payEdcCount,
        qrisPct,
        cashPct,
        edcPct,
      },
      soldItemsList,
    };
  }, [filteredTransactions]);

  const handlePrintPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(25, 61, 44);
    doc.text('WARUNG RAHAYU JAYA', pageWidth / 2, y, { align: 'center' });
    y += 5.5;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('LAPORAN PENGHASILAN KOTOR & HISTORI PENJUALAN', pageWidth / 2, y, { align: 'center' });
    y += 5;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text('Jl. Villa Gading Harapan 3 No.19 Blok D11, Babelan, Bekasi - Jawa Barat', pageWidth / 2, y, { align: 'center' });
    y += 4;

    doc.setDrawColor(25, 61, 44);
    doc.setLineWidth(0.8);
    doc.line(14, y, pageWidth - 14, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(`Tanggal Cetak: ${fullDateStr}, ${fullTimeStr}`, 14, y);
    y += 6;

    const drawRow = (title: string, valStr: string, isBold = false) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(title, 18, y);
      doc.text(valStr, pageWidth - 18, y, { align: 'right' });
      y += 5.5;
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(25, 61, 44);
    doc.text('1. RINGKASAN PENGHASILAN KOTOR PER PERIODE', 14, y);
    y += 6;

    drawRow(`• Hari Ini (${periodBreakdown.daily.count} pesanan):`, `Rp ${periodBreakdown.daily.total.toLocaleString('id-ID')}`);
    drawRow(`• Mingguan / 7 Hari (${periodBreakdown.weekly.count} pesanan):`, `Rp ${periodBreakdown.weekly.total.toLocaleString('id-ID')}`);
    drawRow(`• Bulanan (${periodBreakdown.monthly.count} pesanan):`, `Rp ${periodBreakdown.monthly.total.toLocaleString('id-ID')}`);
    drawRow(`• Tahunan (${periodBreakdown.yearly.count} pesanan):`, `Rp ${periodBreakdown.yearly.total.toLocaleString('id-ID')}`);
    y += 4;

    doc.setFillColor(232, 240, 236);
    doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'F');
    doc.setDrawColor(25, 61, 44);
    doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(25, 61, 44);
    doc.text(`TOTAL PENGHASILAN KOTOR (${period.toUpperCase()})`, 18, y + 9);
    doc.text(`Rp ${financialStats.grossSales.toLocaleString('id-ID')}`, pageWidth - 18, y + 9, { align: 'right' });
    y += 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(25, 61, 44);
    doc.text('2. DISTRIBUSI METODE PEMBAYARAN', 14, y);
    y += 6;

    drawRow(`• Tunai Kasir (${financialStats.payStats.cashPct}%):`, `${financialStats.payStats.cashCount} transaksi • Rp ${financialStats.payStats.cashTotal.toLocaleString('id-ID')}`);
    drawRow(`• QRIS Dinamis (${financialStats.payStats.qrisPct}%):`, `${financialStats.payStats.qrisCount} transaksi • Rp ${financialStats.payStats.qrisTotal.toLocaleString('id-ID')}`);
    drawRow(`• Mesin EDC (${financialStats.payStats.edcPct}%):`, `${financialStats.payStats.edcCount} transaksi • Rp ${financialStats.payStats.edcTotal.toLocaleString('id-ID')}`);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(25, 61, 44);
    doc.text('3. REKAP PENJUALAN MENU', 14, y);
    y += 6;

    const soldList = financialStats.soldItemsList.slice(0, 10);
    if (soldList.length > 0) {
      soldList.forEach((it) => {
        const liveStock = stocks[it.id] !== undefined ? stocks[it.id] : 0;
        drawRow(`• ${it.nama} (${it.qty} porsi)`, `Rp ${it.total.toLocaleString('id-ID')} | Sisa Stok: ${liveStock}`);
      });
    } else {
      drawRow('• Belum ada menu terjual pada periode ini.', 'Rp 0');
    }

    const filenameDate = now.toISOString().slice(0, 10);
    doc.save(`Laporan-Penghasilan-Kotor-WRJ-${filenameDate}.pdf`);
  };

  const handleExportExcel = () => {
    const rows = [
      ['WARUNG RAHAYU JAYA - LAPORAN PENGHASILAN KOTOR'],
      [`Tanggal Cetak: ${fullDateStr} ${fullTimeStr}`],
      [`Periode Filter: ${period}`],
      [],
      ['Ringkasan Penghasilan Kotor', 'Jumlah Transaksi', 'Total Kotor (Rp)'],
      ['Hari Ini', periodBreakdown.daily.count, periodBreakdown.daily.total],
      ['Mingguan (7 Hari)', periodBreakdown.weekly.count, periodBreakdown.weekly.total],
      ['Bulanan', periodBreakdown.monthly.count, periodBreakdown.monthly.total],
      ['Tahunan', periodBreakdown.yearly.count, periodBreakdown.yearly.total],
      ['Total Periode Terpilih', financialStats.txCount, financialStats.grossSales],
      [],
      ['Metode Pembayaran', 'Jumlah', 'Nominal (Rp)'],
      ['Tunai Kasir', financialStats.payStats.cashCount, financialStats.payStats.cashTotal],
      ['QRIS Dinamis', financialStats.payStats.qrisCount, financialStats.payStats.qrisTotal],
      ['Mesin EDC', financialStats.payStats.edcCount, financialStats.payStats.edcTotal],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan-Penghasilan-Kotor-WRJ-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="profit-report-container">
      <div className="report-top-header">
        <div className="report-title-area">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <img
              src="/images/favicon.jpg"
              alt="Logo Warung Rahayu Jaya"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid #193D2C',
              }}
            />
            <span className="report-kicker" style={{ margin: 0 }}>● PENGHASILAN KOTOR MURNI (TANPA POTONGAN)</span>
          </div>
          <div className="report-title-row">
            <h1>Laporan Penghasilan Kotor & Histori Pesanan</h1>
          </div>
          <p className="report-timestamp-meta">
            📅 {fullDateStr} • Pukul {fullTimeStr}
          </p>
        </div>

        <div className="report-action-buttons">
          <button
            type="button"
            className="btn-export-excel"
            onClick={handleExportExcel}
            title="Download CSV / Excel"
          >
            📊 Excel (CSV)
          </button>
          <button
            type="button"
            className="btn-export-pdf"
            onClick={handlePrintPdf}
            title="Cetak Dokumen PDF Resmi Lengkap"
          >
            📄 Cetak PDF
          </button>
        </div>
      </div>

      {/* 4 Kartu Penghasilan Kotor: Harian, Mingguan, Bulanan, Tahunan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #BBF7D0', borderRadius: '14px', padding: '18px', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#15803D', textTransform: 'uppercase', marginBottom: '6px' }}>
            📅 Penghasilan Kotor Hari Ini
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#14532D' }}>
            Rp {periodBreakdown.daily.total.toLocaleString('id-ID')}
          </div>
          <small style={{ color: '#64748B', fontSize: '12px' }}>
            {periodBreakdown.daily.count} pesanan lunas hari ini
          </small>
        </div>

        <div style={{ background: '#FFFFFF', border: '1.5px solid #BFDBFE', borderRadius: '14px', padding: '18px', boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1D4ED8', textTransform: 'uppercase', marginBottom: '6px' }}>
            📆 Penghasilan Kotor Mingguan
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#1E3A8A' }}>
            Rp {periodBreakdown.weekly.total.toLocaleString('id-ID')}
          </div>
          <small style={{ color: '#64748B', fontSize: '12px' }}>
            {periodBreakdown.weekly.count} pesanan (7 hari terakhir)
          </small>
        </div>

        <div style={{ background: '#FFFFFF', border: '1.5px solid #DDD6FE', borderRadius: '14px', padding: '18px', boxShadow: '0 2px 6px rgba(109, 40, 217, 0.08)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#6D28D9', textTransform: 'uppercase', marginBottom: '6px' }}>
            🗓️ Penghasilan Kotor Bulanan
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#4C1D95' }}>
            Rp {periodBreakdown.monthly.total.toLocaleString('id-ID')}
          </div>
          <small style={{ color: '#64748B', fontSize: '12px' }}>
            {periodBreakdown.monthly.count} pesanan ({currentMonthYear})
          </small>
        </div>

        <div style={{ background: '#FFFFFF', border: '1.5px solid #FDE68A', borderRadius: '14px', padding: '18px', boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#B45309', textTransform: 'uppercase', marginBottom: '6px' }}>
            📊 Penghasilan Kotor Tahunan
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#78350F' }}>
            Rp {periodBreakdown.yearly.total.toLocaleString('id-ID')}
          </div>
          <small style={{ color: '#64748B', fontSize: '12px' }}>
            {periodBreakdown.yearly.count} pesanan (Tahun {now.getFullYear()})
          </small>
        </div>
      </div>

      {/* Histori Pesanan Hari Ini (Sebelum dihitung ke total penghasilan) */}
      <div className="report-card-section" style={{ marginBottom: '24px' }}>
        <div className="section-head-between" style={{ marginBottom: '14px' }}>
          <div>
            <h3>🧾 Histori Pesanan Hari Ini</h3>
            <small>Rincian pesanan lunas hari ini sebelum dijumlahkan ke total penghasilan kotor</small>
          </div>
          <span style={{ background: '#DCFCE7', color: '#166534', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '800' }}>
            {periodBreakdown.todayOrders.length} Pesanan • Total Rp {periodBreakdown.daily.total.toLocaleString('id-ID')}
          </span>
        </div>

        {periodBreakdown.todayOrders.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', background: '#F8FAFC', borderRadius: '10px', color: '#64748B' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>📭</div>
            <strong>Belum Ada Histori Pesanan Hari Ini (Rp 0)</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              Semua data dimulai dari 0. Pesanan yang sudah lunas hari ini akan tercatat otomatis di tabel ini.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="laptop-stock-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>No. Order</th>
                  <th>Waktu</th>
                  <th>Pelanggan & Layanan</th>
                  <th>Rincian Menu</th>
                  <th>Metode</th>
                  <th style={{ textAlign: 'right' }}>Total Kotor</th>
                </tr>
              </thead>
              <tbody>
                {periodBreakdown.todayOrders.map((ord) => (
                  <tr key={ord.orderNumber}>
                    <td>
                      <strong style={{ color: '#193D2C' }}>#{ord.orderNumber}</strong>
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>
                      {(ord as any).time ||
                        (ord.timestamp
                          ? new Date(ord.timestamp).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            }) + ' WIB'
                          : 'Hari ini')}
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', fontSize: '13px' }}>{ord.nama || 'Pelanggan'}</div>
                      <small style={{ color: '#64748B' }}>
                        {ord.orderType === 'dine-in' ? `${ord.tableNumber || 'Meja'}` : 'Take Away'}
                      </small>
                    </td>
                    <td style={{ fontSize: '12px', color: '#334155' }}>
                      {(ord.cartItems || []).map((it) => `${it.nama} (${it.qty}x)`).join(', ')}
                    </td>
                    <td>
                      <span style={{ background: '#F1F5F9', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                        {(ord.paymentMethod || 'cash').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#15803D' }}>
                      Rp {(ord.total || 0).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filter Periode untuk Total Detail */}
      <div className="period-filter-nav">
        <button
          type="button"
          className={`period-btn ${period === 'hari' ? 'active' : ''}`}
          onClick={() => setPeriod('hari')}
        >
          Hari Ini
        </button>
        <button
          type="button"
          className={`period-btn ${period === 'minggu' ? 'active' : ''}`}
          onClick={() => setPeriod('minggu')}
        >
          Mingguan
        </button>
        <button
          type="button"
          className={`period-btn ${period === 'bulan' ? 'active' : ''}`}
          onClick={() => setPeriod('bulan')}
        >
          Bulanan
        </button>
        <button
          type="button"
          className={`period-btn ${period === 'tahun' ? 'active' : ''}`}
          onClick={() => setPeriod('tahun')}
        >
          Tahunan ({now.getFullYear()})
        </button>
        <button
          type="button"
          className={`period-btn ${period === 'semua' ? 'active' : ''}`}
          onClick={() => setPeriod('semua')}
        >
          Semua Data ({periodBreakdown.all.count} Transaksi)
        </button>
      </div>

      {/* Kartu Total Penghasilan Kotor Utama */}
      <div className="hero-profit-card">
        <div className="profit-card-top">
          <div className="profit-badge-margin">
            TOTAL PENGHASILAN KOTOR MURNI • TANPA POTONGAN
          </div>
          <span className="profit-medal-icon">💰</span>
        </div>

        <span className="profit-label">
          Total Penghasilan Kotor ({period === 'hari' ? 'Hari Ini' : period === 'minggu' ? 'Mingguan' : period === 'bulan' ? 'Bulanan' : period === 'tahun' ? 'Tahunan' : 'Semua Periode'})
        </span>
        <div className="profit-main-amount">
          Rp {financialStats.grossSales.toLocaleString('id-ID')}
        </div>

        <div className="profit-formula-box">
          <div className="formula-left">
            <span>📋</span>
            <span>Total pemasukan kotor seluruh penjualan tanpa potongan karyawan maupun bahan baku</span>
          </div>
          <span className="formula-growth">
            {financialStats.txCount > 0 ? `${financialStats.txCount} Transaksi Lunas` : 'Mulai dari 0'}
          </span>
        </div>
      </div>

      {/* Ringkasan Metode Pembayaran & Rekap Menu Terjual */}
      <div className="report-grid-layout">
        <div className="report-col">
          <div className="report-card-section">
            <div className="section-head-between">
              <h3>Metode Pembayaran Masuk</h3>
              <small className="accounting-std">Total {financialStats.txCount} Struk</small>
            </div>

            <div className="accounting-ledger">
              <div className="ledger-row">
                <div className="ledger-icon-box">💵</div>
                <div className="ledger-info">
                  <strong>Tunai Kasir ({financialStats.payStats.cashPct}%)</strong>
                  <small>{financialStats.payStats.cashCount} transaksi</small>
                </div>
                <div className="ledger-amount positive">
                  Rp {financialStats.payStats.cashTotal.toLocaleString('id-ID')}
                </div>
              </div>

              <div className="ledger-row">
                <div className="ledger-icon-box">📱</div>
                <div className="ledger-info">
                  <strong>QRIS Dinamis ({financialStats.payStats.qrisPct}%)</strong>
                  <small>{financialStats.payStats.qrisCount} transaksi</small>
                </div>
                <div className="ledger-amount positive">
                  Rp {financialStats.payStats.qrisTotal.toLocaleString('id-ID')}
                </div>
              </div>

              <div className="ledger-row">
                <div className="ledger-icon-box">💳</div>
                <div className="ledger-info">
                  <strong>Mesin EDC ({financialStats.payStats.edcPct}%)</strong>
                  <small>{financialStats.payStats.edcCount} transaksi</small>
                </div>
                <div className="ledger-amount positive">
                  Rp {financialStats.payStats.edcTotal.toLocaleString('id-ID')}
                </div>
              </div>

              <div className="ledger-row final-row">
                <div className="ledger-icon-box green">💰</div>
                <div className="ledger-info">
                  <strong>Total Semua Pemasukan Kotor</strong>
                  <small>Rata-rata Rp {financialStats.aov.toLocaleString('id-ID')} / order</small>
                </div>
                <div className="ledger-amount final-bold">
                  Rp {financialStats.grossSales.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="report-col">
          <div className="report-card-section">
            <div className="section-head-between">
              <h3>Rekap Penjualan Menu</h3>
              <small>{financialStats.soldItemsList.length} Jenis Menu Terjual</small>
            </div>

            {financialStats.soldItemsList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                Belum ada menu terjual pada periode ini.
              </div>
            ) : (
              <div className="accounting-ledger">
                {financialStats.soldItemsList.map((it) => (
                  <div key={it.id} className="ledger-row">
                    <div className="ledger-icon-box">🍽️</div>
                    <div className="ledger-info">
                      <strong>{it.nama}</strong>
                      <small>Terjual: {it.qty} porsi</small>
                    </div>
                    <div className="ledger-amount positive">
                      Rp {it.total.toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
