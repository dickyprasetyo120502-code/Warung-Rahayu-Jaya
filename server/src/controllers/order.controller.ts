import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Helper generator no order berurutan dari DB: WRJ-001, WRJ-002, dst
async function generateOrderNumber(): Promise<string> {
  const count = await prisma.order.count();
  const nextSeq = count + 1;
  return `WRJ-${String(nextSeq).padStart(3, '0')}`;
}

// Buat pesanan baru & potong stok di PostgreSQL secara atomik
export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      orderType,
      tableNumber,
      guestCount,
      nama,
      telepon,
      catatan,
      cartItems,
      paymentMethod,
    } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pesanan harus memuat minimal 1 item.',
      });
    }

    // Jalankan transaksi database (ACID)
    const orderResult = await prisma.$transaction(async (tx) => {
      // 1. Verifikasi stok & hitung subtotal
      let subtotal = 0;
      for (const item of cartItems) {
        const menuItem = await tx.menuItem.findUnique({
          where: { id: item.id },
        });

        if (!menuItem) {
          throw new Error(`Item ${item.nama} (${item.id}) tidak ditemukan.`);
        }

        if (menuItem.stock < item.qty) {
          throw new Error(
            `Stok untuk ${menuItem.nama} tidak mencukupi (sisa ${menuItem.stock}, dipesan ${item.qty}).`
          );
        }

        // Potong stok di database PostgreSQL
        await tx.menuItem.update({
          where: { id: item.id },
          data: { stock: menuItem.stock - item.qty },
        });

        subtotal += menuItem.harga * item.qty;
      }

      const tax = Math.round(subtotal * 0.1); // PB1 10%
      const total = subtotal + tax;
      const orderNumber = await generateOrderNumber();

      // 2. Buat data Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          orderType,
          tableNumber: orderType === 'dine-in' ? tableNumber : null,
          guestCount: orderType === 'dine-in' ? guestCount : null,
          nama,
          telepon: telepon || null,
          catatan: catatan || null,
          subtotal,
          tax,
          total,
          paymentMethod,
          paymentStatus: 'PAID',
          kasirName: 'Kasir',
          items: {
            create: cartItems.map((it: any) => ({
              menuItemId: it.id,
              nama: it.nama,
              harga: it.harga,
              qty: it.qty,
              total: it.harga * it.qty,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return newOrder;
    });

    return res.status(201).json({
      success: true,
      message: 'Pesanan berhasil dibuat dan stok otomatis terpotong.',
      order: orderResult,
    });
  } catch (error: any) {
    console.error('Error createOrder:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Gagal memproses pesanan.',
    });
  }
};

// Ambil riwayat seluruh transaksi pesanan
export const getOrders = async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      orders,
    });
  } catch (error: any) {
    console.error('Error getOrders:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat transaksi dari database.',
    });
  }
};

