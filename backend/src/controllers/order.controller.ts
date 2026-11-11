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

    let snapToken: string | null = null;
    let redirectUrl: string | null = null;

    if (paymentMethod === 'qris' && process.env.MIDTRANS_SERVER_KEY) {
      try {
        const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
        const snapEndpoint = isProduction
          ? 'https://app.midtrans.com/snap/v1/transactions'
          : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

        const authHeader =
          'Basic ' + Buffer.from(process.env.MIDTRANS_SERVER_KEY + ':').toString('base64');

        const snapPayload = {
          transaction_details: {
            order_id: `${orderResult.orderNumber}-${Date.now().toString().slice(-4)}`,
            gross_amount: orderResult.total,
          },
          customer_details: {
            first_name: orderResult.nama,
            phone: orderResult.telepon || undefined,
          },
          item_details: orderResult.items.map((it: any) => ({
            id: it.menuItemId,
            price: it.harga,
            quantity: it.qty,
            name: it.nama.substring(0, 50),
          })),
        };

        const snapRes = await fetch(snapEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify(snapPayload),
        });

        if (snapRes.ok) {
          const snapData: any = await snapRes.json();
          snapToken = snapData.token;
          redirectUrl = snapData.redirect_url;
        } else {
          const errData = await snapRes.text();
          console.warn('Midtrans API response not ok:', errData);
        }
      } catch (err: any) {
        console.warn('Gagal membuat Snap token Midtrans:', err.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Pesanan berhasil dibuat dan stok otomatis terpotong.',
      order: orderResult,
      snapToken,
      redirectUrl,
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

// Generate Midtrans Snap Token untuk transaksi pembayaran QRIS dinamis
export const createSnapToken = async (req: Request, res: Response) => {
  try {
    const { orderNumber, grossAmount, customerName, phone, items } = req.body;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return res.status(500).json({
        success: false,
        message: 'Midtrans Server Key belum terpasang di backend .env',
      });
    }

    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    const snapEndpoint = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');

    const snapPayload = {
      transaction_details: {
        order_id: `${orderNumber || 'WRJ'}-${Date.now().toString().slice(-4)}`,
        gross_amount: Number(grossAmount),
      },
      customer_details: {
        first_name: customerName || 'Pelanggan',
        phone: phone || undefined,
      },
      item_details: Array.isArray(items) && items.length > 0
        ? items.map((it: any) => ({
            id: String(it.id || 'item'),
            price: Number(it.price || it.harga),
            quantity: Number(it.quantity || it.qty || 1),
            name: String(it.name || it.nama || 'Menu').substring(0, 50),
          }))
        : undefined,
    };

    const snapRes = await fetch(snapEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(snapPayload),
    });

    if (!snapRes.ok) {
      const errText = await snapRes.text();
      console.warn('Midtrans snap error response:', errText);
      return res.status(400).json({
        success: false,
        message: 'Midtrans API error: ' + errText,
      });
    }

    const data: any = await snapRes.json();
    return res.json({
      success: true,
      token: data.token,
      redirect_url: data.redirect_url,
    });
  } catch (err: any) {
    console.error('Error createSnapToken:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal menghubungi server Midtrans.',
    });
  }
};


