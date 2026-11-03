const STOCK_STORAGE_KEY = 'wrj_menu_stocks';
const TRANSACTIONS_KEY = 'wrj_sales_transactions';

// Stok awal realistis (bisa diubah-ubah bebas oleh Admin kapan saja)
export const INITIAL_STOCKS = {
  'ayam-goreng': 6,
  'ayam-bakar': 10,
  'ayam-bumbu-bali': 5,
  'ayam-bekakak': 3,
  'nila-goreng': 8,
  'nila-bakar': 8,
  'ikan-pesmol': 5,
  'pecel-lele': 10,
  'soto': 12,
  'ati-ampela': 15,
  'tahu': 20,
  'tempe': 20,
  'nasi-putih': 30,
};

// Ambil stok saat ini
export function getStocks() {
  try {
    const data = localStorage.getItem(STOCK_STORAGE_KEY);
    if (data) {
      return { ...INITIAL_STOCKS, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Failed to read stocks', e);
  }
  return { ...INITIAL_STOCKS };
}

// Update stok untuk 1 item (langsung emit event agar POS & Admin ter-update)
export function updateStock(itemId, newStock) {
  const current = getStocks();
  current[itemId] = Math.max(0, parseInt(newStock, 10) || 0);
  localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event('wrj_stock_updated'));
  return current;
}

// Update seluruh stok sekaligus
export function setAllStocks(stocksObj) {
  localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(stocksObj));
  window.dispatchEvent(new Event('wrj_stock_updated'));
}

// Kurangi stok saat ada pembelian selesai di POS
export function deductStock(cartItems) {
  const current = getStocks();
  cartItems.forEach((item) => {
    if (current[item.id] !== undefined) {
      current[item.id] = Math.max(0, current[item.id] - item.qty);
    }
  });
  localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event('wrj_stock_updated'));
  return current;
}

// ================= TRANSAKSI PENJUALAN (MULAI DARI 0) =================

export function getTransactions() {
  try {
    const data = localStorage.getItem(TRANSACTIONS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read transactions', e);
  }
  return []; // Dimulai dari 0 / kosong
}

export function recordTransaction(orderData) {
  const current = getTransactions();
  const newTx = {
    orderNumber: orderData.orderNumber,
    nama: orderData.nama,
    tableNumber: orderData.tableNumber ? `Meja ${orderData.tableNumber}` : 'Take Away',
    orderType: orderData.orderType,
    total: orderData.total,
    paymentMethod: orderData.paymentMethod,
    cartItems: orderData.cartItems || [],
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    status: 'Selesai',
  };

  const updated = [newTx, ...current];
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('wrj_transactions_updated'));
  return updated;
}

// Fungsi reset data transaksi untuk Admin jika ingin mulai dari 0 kembali
export function clearAllTransactions() {
  localStorage.removeItem(TRANSACTIONS_KEY);
  window.dispatchEvent(new Event('wrj_transactions_updated'));
  return [];
}
