import { MenuItemData } from '../schemas/menu.schema';

export interface MenuCategory {
  id: string;
  title: string;
  items: MenuItemData[];
}

export const MENU_CATEGORIES: MenuCategory[] = [
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
];
