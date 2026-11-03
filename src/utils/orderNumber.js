const STORAGE_KEY = 'wrj_order_sequence';

export function getNextOrderNumber() {
  const saved = localStorage.getItem(STORAGE_KEY);
  let num = 1;
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed > 0) {
      num = parsed;
    }
  }
  return `WRJ-${String(num).padStart(3, '0')}`;
}

export function incrementOrderNumber() {
  const saved = localStorage.getItem(STORAGE_KEY);
  let num = 1;
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed > 0) {
      num = parsed;
    }
  }
  localStorage.setItem(STORAGE_KEY, String(num + 1));
}

