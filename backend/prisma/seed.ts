import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const hashedKasirPassword = await bcrypt.hash('kasir123', 10);

  const users = [
    {
      username: 'admin',
      password: hashedAdminPassword,
      role: 'ADMIN',
      name: 'Admin',
    },
    {
      username: 'kasir',
      password: hashedKasirPassword,
      role: 'KASIR',
      name: 'Kasir',
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        password: u.password,
        role: u.role,
        name: u.name,
      },
      create: u,
    });
  }

  const categories = [
    { id: 'ayam', title: '🍗 Menu Ayam' },
    { id: 'ikan', title: '🐟 Menu Ikan' },
    { id: 'tambahan', title: '🍽️ Menu Tambahan' },
    { id: 'minuman', title: '🥤 Menu Minuman' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { title: cat.title },
      create: cat,
    });
  }

  const menuItems = [
    {
      id: 'ayam-goreng',
      nama: 'Ayam Goreng',
      harga: 15000,
      deskripsi: 'Ayam goreng gurih dengan bumbu khas Warung Rahayu Jaya.',
      gambar: '/images/ayam-goreng.jpg',
      stock: 0,
      categoryId: 'ayam',
    },
    {
      id: 'ayam-bakar',
      nama: 'Ayam Bakar',
      harga: 15000,
      deskripsi: 'Ayam bakar berbumbu meresap dengan cita rasa khas Warung Rahayu Jaya.',
      gambar: '/images/ayam-bakar.jpg',
      stock: 0,
      categoryId: 'ayam',
    },
    {
      id: 'ayam-bumbu-bali',
      nama: 'Ayam Bumbu Bali',
      harga: 30000,
      deskripsi: 'Ayam Bumbu Bali pedas gurih dengan bumbu khas Warung Rahayu Jaya.',
      gambar: '/images/ayam-bumbu-bali.jpg',
      stock: 0,
      categoryId: 'ayam',
    },
    {
      id: 'ayam-bekakak',
      nama: 'Ayam Bekakak',
      harga: 60000,
      deskripsi: 'Ayam Bekakak 1 ekor empuk dengan bumbu rempah yang meresap sempurna.',
      gambar: '/images/ayam-bekakak.jpg',
      stock: 0,
      categoryId: 'ayam',
    },
    {
      id: 'nila-goreng',
      nama: 'Ikan Nila Goreng',
      harga: 18000,
      deskripsi: 'Ikan nila goreng renyah dengan bumbu khas Warung Rahayu Jaya.',
      gambar: '/images/nila-goreng.jpg',
      stock: 0,
      categoryId: 'ikan',
    },
    {
      id: 'nila-bakar',
      nama: 'Ikan Nila Bakar',
      harga: 18000,
      deskripsi: 'Ikan nila bakar dengan bumbu manis gurih dan aroma bakaran.',
      gambar: '/images/nila-bakar.jpg',
      stock: 0,
      categoryId: 'ikan',
    },
    {
      id: 'ikan-pesmol',
      nama: 'Ikan Pesmol',
      harga: 18000,
      deskripsi: 'Ikan pesmol dengan kuah kuning khas yang kaya rempah.',
      gambar: '/images/ikan-pesmol.jpg',
      stock: 0,
      categoryId: 'ikan',
    },
    {
      id: 'pecel-lele',
      nama: 'Pecel Lele',
      harga: 10000,
      deskripsi: 'Lele goreng renyah disajikan dengan sambal khas yang pedas nikmat.',
      gambar: '/images/pecel-lele.jpg',
      stock: 0,
      categoryId: 'ikan',
    },
    {
      id: 'soto',
      nama: 'Soto',
      harga: 10000,
      deskripsi: 'Soto hangat dengan kuah gurih yang cocok dinikmati kapan saja.',
      gambar: '/images/soto.jpg',
      stock: 0,
      categoryId: 'tambahan',
    },
    {
      id: 'ati-ampela',
      nama: 'Ati Ampela',
      harga: 4000,
      deskripsi: 'Ati ampela berbumbu gurih sebagai pelengkap menu favorit.',
      gambar: '/images/ati-ampela.jpg',
      stock: 0,
      categoryId: 'tambahan',
    },
    {
      id: 'tahu',
      nama: 'Tahu',
      harga: 1000,
      deskripsi: 'Tahu goreng hangat dengan tekstur lembut di dalam dan renyah di luar.',
      gambar: '/images/tahu.jpg',
      stock: 0,
      categoryId: 'tambahan',
    },
    {
      id: 'tempe',
      nama: 'Tempe',
      harga: 1000,
      deskripsi: 'Tempe goreng gurih yang pas sebagai lauk tambahan.',
      gambar: '/images/tempe.jpg',
      stock: 0,
      categoryId: 'tambahan',
    },
    {
      id: 'nasi-putih',
      nama: 'Nasi Putih',
      harga: 5000,
      deskripsi: 'Nasi putih hangat, pulen, dan cocok dipadukan dengan semua menu.',
      gambar: '/images/nasi-putih.jpg',
      stock: 0,
      categoryId: 'tambahan',
    },
    {
      id: 'es-teh-manis',
      nama: 'Es Teh Manis',
      harga: 5000,
      deskripsi: 'Es teh manis segar dengan racikan daun teh pilihan dan es batu kristal.',
      gambar: '/images/es-teh-manis.jpg',
      stock: 0,
      categoryId: 'minuman',
    },
    {
      id: 'es-jeruk',
      nama: 'Es Jeruk',
      harga: 7000,
      deskripsi: 'Es jeruk peras segar alami kaya vitamin C yang menyegarkan.',
      gambar: '/images/es-jeruk.jpg',
      stock: 0,
      categoryId: 'minuman',
    },
    {
      id: 'air-mineral',
      nama: 'Air Mineral',
      harga: 4000,
      deskripsi: 'Air mineral kemasan botol higienis dingin maupun suhu ruang.',
      gambar: '/images/air-mineral.jpg',
      stock: 0,
      categoryId: 'minuman',
    },
    {
      id: 'es-batu',
      nama: 'Es Batu',
      harga: 2000,
      deskripsi: 'Es batu kristal higienis dalam gelas / cup tambahan.',
      gambar: '/images/es-batu.jpg',
      stock: 0,
      categoryId: 'minuman',
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {
        nama: item.nama,
        harga: item.harga,
        deskripsi: item.deskripsi,
        gambar: item.gambar,
        stock: item.stock,
      },
      create: item,
    });
  }

  console.log('Seeding selesai.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
