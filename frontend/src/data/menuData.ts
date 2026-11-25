import { MenuItemData } from '../schemas/menu.schema';
import { updateStock } from '../utils/stockStorage';

export interface MenuCategory {
  id: string;
  title: string;
  items: MenuItemData[];
}

export const DEFAULT_MENU_CATEGORIES: MenuCategory[] = [
  {
    id: 'ayam',
    title: '🍗 Menu Ayam',
    items: [
      {
        id: 'ayam-goreng',
        nama: 'Ayam Goreng',
        harga: 15000,
        deskripsi: 'Ayam goreng gurih dengan bumbu khas Warung Rahayu Jaya.',
        gambar: '/images/ayam-goreng.jpg',
      },
      {
        id: 'ayam-bakar',
        nama: 'Ayam Bakar',
        harga: 15000,
        deskripsi: 'Ayam bakar berbumbu meresap dengan cita rasa khas Warung Rahayu Jaya.',
        gambar: '/images/ayam-bakar.jpg',
      },
      {
        id: 'ayam-bumbu-bali',
        nama: 'Ayam Bumbu Bali',
        harga: 30000,
        deskripsi: 'Ayam Bumbu Bali pedas gurih dengan bumbu khas Warung Rahayu Jaya.',
        gambar: '/images/ayam-bumbu-bali.jpg',
      },
      {
        id: 'ayam-bekakak',
        nama: 'Ayam Bekakak',
        harga: 60000,
        deskripsi: 'Ayam Bekakak 1 ekor empuk dengan bumbu rempah yang meresap sempurna.',
        gambar: '/images/ayam-bekakak.jpg',
      },
    ],
  },
  {
    id: 'ikan',
    title: '🐟 Menu Ikan',
    items: [
      {
        id: 'nila-goreng',
        nama: 'Ikan Nila Goreng',
        harga: 18000,
        deskripsi: 'Ikan nila goreng renyah dengan bumbu khas Warung Rahayu Jaya.',
        gambar: '/images/nila-goreng.jpg',
      },
      {
        id: 'nila-bakar',
        nama: 'Ikan Nila Bakar',
        harga: 18000,
        deskripsi: 'Ikan nila bakar dengan bumbu manis gurih dan aroma bakaran.',
        gambar: '/images/nila-bakar.jpg',
      },
      {
        id: 'ikan-pesmol',
        nama: 'Ikan Pesmol',
        harga: 18000,
        deskripsi: 'Ikan pesmol dengan kuah kuning khas yang kaya rempah.',
        gambar: '/images/ikan-pesmol.jpg',
      },
      {
        id: 'pecel-lele',
        nama: 'Pecel Lele',
        harga: 10000,
        deskripsi: 'Lele goreng renyah disajikan dengan sambal khas yang pedas nikmat.',
        gambar: '/images/pecel-lele.jpg',
      },
    ],
  },
  {
    id: 'tambahan',
    title: '🍽️ Menu Tambahan',
    items: [
      {
        id: 'soto',
        nama: 'Soto',
        harga: 10000,
        deskripsi: 'Soto hangat dengan kuah gurih yang cocok dinikmati kapan saja.',
        gambar: '/images/soto.jpg',
      },
      {
        id: 'ati-ampela',
        nama: 'Ati Ampela',
        harga: 4000,
        deskripsi: 'Ati ampela berbumbu gurih sebagai pelengkap menu favorit.',
        gambar: '/images/ati-ampela.jpg',
      },
      {
        id: 'tahu',
        nama: 'Tahu',
        harga: 1000,
        deskripsi: 'Tahu goreng hangat dengan tekstur lembut di dalam dan renyah di luar.',
        gambar: '/images/tahu.jpg',
      },
      {
        id: 'tempe',
        nama: 'Tempe',
        harga: 1000,
        deskripsi: 'Tempe goreng gurih yang pas sebagai lauk tambahan.',
        gambar: '/images/tempe.jpg',
      },
      {
        id: 'nasi-putih',
        nama: 'Nasi Putih',
        harga: 5000,
        deskripsi: 'Nasi putih hangat, pulen, dan cocok dipadukan dengan semua menu.',
        gambar: '/images/nasi-putih.jpg',
      },
    ],
  },
  {
    id: 'minuman',
    title: '🥤 Menu Minuman',
    items: [
      {
        id: 'es-teh-manis',
        nama: 'Es Teh Manis',
        harga: 5000,
        deskripsi: 'Es teh manis segar dengan racikan daun teh pilihan dan es batu kristal.',
        gambar: '/images/es-teh-manis.jpg',
      },
      {
        id: 'es-jeruk',
        nama: 'Es Jeruk',
        harga: 7000,
        deskripsi: 'Es jeruk peras segar alami kaya vitamin C yang menyegarkan.',
        gambar: '/images/es-jeruk.jpg',
      },
      {
        id: 'air-mineral',
        nama: 'Air Mineral',
        harga: 4000,
        deskripsi: 'Air mineral kemasan botol higienis dingin maupun suhu ruang.',
        gambar: '/images/air-mineral.jpg',
      },
      {
        id: 'es-batu',
        nama: 'Es Batu',
        harga: 2000,
        deskripsi: 'Es batu kristal higienis dalam gelas / cup tambahan.',
        gambar: '/images/es-batu.jpg',
      },
    ],
  },
];

const MENU_STORAGE_KEY = 'wrj_menu_categories';

export function getMenuCategories(): MenuCategory[] {
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let modified = false;
        let categoriesList: MenuCategory[] = parsed;

        const hasMinuman = categoriesList.some((c: MenuCategory) => c.id === 'minuman');
        if (!hasMinuman) {
          const defaultMinuman = DEFAULT_MENU_CATEGORIES.find((c) => c.id === 'minuman');
          if (defaultMinuman) {
            categoriesList = [...categoriesList, defaultMinuman];
            modified = true;
          }
        } else {
          categoriesList = categoriesList.map((cat) => {
            if (cat.id === 'minuman') {
              return {
                ...cat,
                items: cat.items.map((it) => {
                  if (it.gambar && it.gambar.startsWith('data:image/svg+xml')) {
                    modified = true;
                    return { ...it, gambar: `/images/${it.id}.jpg` };
                  }
                  return it;
                }),
              };
            }
            return cat;
          });
        }

        if (modified) {
          localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(categoriesList));
        }
        return categoriesList;
      }
    }
  } catch (e) {
    console.error('Gagal membaca data kategori menu:', e);
  }
  return DEFAULT_MENU_CATEGORIES;
}

export function saveMenuCategories(categories: MenuCategory[]): void {
  try {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(categories));
    window.dispatchEvent(new Event('wrj_menu_updated'));
  } catch (e) {
    console.error('Gagal menyimpan kategori menu:', e);
  }
}

export function addMenuItem(
  categoryId: string,
  item: Omit<MenuItemData, 'id'> & { id?: string; initialStock?: number },
  categoryTitle?: string
): MenuCategory[] {
  const current = getMenuCategories();
  const slug = item.id || (item.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-4));
  const newItem: MenuItemData = {
    id: slug,
    nama: item.nama.trim(),
    harga: item.harga,
    deskripsi: item.deskripsi ? item.deskripsi.trim() : null,
    gambar: item.gambar ? item.gambar.trim() : '/images/ayam-goreng.jpg',
  };

  const initialStock = item.initialStock !== undefined ? item.initialStock : 0;
  updateStock(slug, initialStock);

  let categoryFound = false;
  const updated = current.map((cat) => {
    if (cat.id.toLowerCase() === categoryId.toLowerCase()) {
      categoryFound = true;
      return {
        ...cat,
        items: [...cat.items, newItem],
      };
    }
    return cat;
  });

  if (!categoryFound) {
    const newCatTitle = categoryTitle || (categoryId.charAt(0).toUpperCase() + categoryId.slice(1));
    updated.push({
      id: categoryId.toLowerCase(),
      title: newCatTitle,
      items: [newItem],
    });
  }

  saveMenuCategories(updated);
  return updated;
}

export function updateMenuItem(
  itemId: string,
  updates: Partial<MenuItemData> & { initialStock?: number; categoryId?: string }
): MenuCategory[] {
  const current = getMenuCategories();
  const targetCategory = updates.categoryId;

  if (updates.initialStock !== undefined) {
    updateStock(itemId, updates.initialStock);
  }

  let foundItem: MenuItemData | null = null;
  let oldCatId = '';

  current.forEach((cat) => {
    const it = cat.items.find((i) => i.id === itemId);
    if (it) {
      foundItem = { ...it, ...updates };
      oldCatId = cat.id;
    }
  });

  if (!foundItem) return current;

  let updated = current.map((cat) => {
    return {
      ...cat,
      items: cat.items.map((it) => (it.id === itemId ? { ...it, ...updates } : it)),
    };
  });

  if (targetCategory && targetCategory.toLowerCase() !== oldCatId.toLowerCase()) {
    updated = updated.map((cat) => {
      if (cat.id === oldCatId) {
        return {
          ...cat,
          items: cat.items.filter((it) => it.id !== itemId),
        };
      }
      if (cat.id.toLowerCase() === targetCategory.toLowerCase()) {
        return {
          ...cat,
          items: [...cat.items, foundItem!],
        };
      }
      return cat;
    });
  }

  saveMenuCategories(updated);
  return updated;
}

export function deleteMenuItem(itemId: string): MenuCategory[] {
  const current = getMenuCategories();
  const updated = current.map((cat) => ({
    ...cat,
    items: cat.items.filter((it) => it.id !== itemId),
  }));
  saveMenuCategories(updated);
  return updated;
}

export const MENU_CATEGORIES: MenuCategory[] = getMenuCategories();

