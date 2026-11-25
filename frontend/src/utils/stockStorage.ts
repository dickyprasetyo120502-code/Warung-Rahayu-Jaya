import { OrderData } from '../schemas/order.schema';

const STOCK_STORAGE_KEY = 'wrj_menu_stocks';
const TRANSACTIONS_KEY = 'wrj_sales_transactions';

export const INITIAL_STOCKS: Record<string, number> = {
  'ayam-goreng': 0,
  'ayam-bakar': 0,
  'ayam-bumbu-bali': 0,
  'ayam-bekakak': 0,
  'nila-goreng': 0,
  'nila-bakar': 0,
  'ikan-pesmol': 0,
  'pecel-lele': 0,
  'soto': 0,
  'ati-ampela': 0,
  'tahu': 0,
  'tempe': 0,
  'nasi-putih': 0,
  'es-teh-manis': 0,
  'es-jeruk': 0,
  'air-mineral': 0,
  'es-batu': 0,
};

export function getStocks(): Record<string, number> {
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

export function updateStock(itemId: string, newStock: number | string): Record<string, number> {
  const current = getStocks();
  current[itemId] = Math.max(0, parseInt(String(newStock), 10) || 0);
  localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event('wrj_stock_updated'));
  return current;
}

export function setAllStocks(stocksObj: Record<string, number>): void {
  localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(stocksObj));
  window.dispatchEvent(new Event('wrj_stock_updated'));
}

export function deductStock(cartItems: Array<{ id?: string; qty?: number }>): Record<string, number> {
  const current = getStocks();
  cartItems.forEach((item) => {
    if (item.id && current[item.id] !== undefined) {
      current[item.id] = Math.max(0, current[item.id] - (item.qty || 1));
    }
  });
  localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event('wrj_stock_updated'));
  return current;
}

export function getTransactions(): any[] {
  try {
    const data = localStorage.getItem(TRANSACTIONS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read transactions', e);
  }
  return [];
}

export function recordTransaction(orderData: any): any[] {
  const current = getTransactions();
  const rawTable = orderData.tableNumber || '';
  const formattedTable = rawTable
    ? (String(rawTable).toLowerCase().startsWith('meja') ? rawTable : `Meja ${rawTable}`)
    : (orderData.orderType === 'take-away' ? 'Take Away' : 'Meja -');

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const newTx = {
    orderNumber: orderData.orderNumber,
    nama: orderData.nama || 'Pelanggan',
    tableNumber: formattedTable,
    rawTableNumber: rawTable,
    guestCount: orderData.guestCount || null,
    orderType: orderData.orderType || 'dine-in',
    total: orderData.total || 0,
    subtotal: orderData.subtotal || 0,
    tax: orderData.tax || 0,
    paymentMethod: orderData.paymentMethod || 'cash',
    paymentStatus: orderData.paymentStatus || (orderData.paymentMethod === 'qris' ? 'PENDING' : 'PAID'),
    cashGiven: orderData.cashGiven || null,
    change: orderData.change || null,
    cartItems: orderData.cartItems || [],
    telepon: orderData.telepon || '',
    catatan: orderData.catatan || '',
    time: orderData.time || timeStr,
    date: orderData.date || dateStr,
    timestamp: orderData.timestamp || now.toISOString(),
    status: orderData.status || (orderData.paymentStatus === 'PENDING' ? 'Menunggu Pembayaran' : 'Siap Disiapkan'),
    isServed: false,
  };

  const updated = [newTx, ...current.filter((it: any) => it.orderNumber !== newTx.orderNumber)];
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('wrj_transactions_updated'));
  return updated;
}

export function updateOrderStatus(orderNumber: string, updates: Partial<{ status: string; paymentStatus: string; isServed: boolean; total: number; subtotal: number; tax: number; cartItems: any[]; paymentMethod: string; cashGiven: any; change: any }>): any[] {
  const current = getTransactions();
  const updated = current.map((tx: any) => {
    if (tx.orderNumber === orderNumber) {
      return { ...tx, ...updates };
    }
    return tx;
  });
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('wrj_transactions_updated'));
  return updated;
}

export function deleteTransaction(orderNumber: string): any[] {
  const current = getTransactions();
  const updated = current.filter((tx: any) => tx.orderNumber !== orderNumber);
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('wrj_transactions_updated'));
  return updated;
}

export function clearAllTransactions(): any[] {
  localStorage.removeItem(TRANSACTIONS_KEY);
  localStorage.removeItem('wrj_order_counter');
  window.dispatchEvent(new Event('wrj_transactions_updated'));
  return [];
}
