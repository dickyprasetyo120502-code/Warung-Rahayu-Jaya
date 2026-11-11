import { Request, Response } from 'express';
import crypto from 'crypto';
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
         paymentStatus: paymentMethod === 'qris' ? 'PENDING' : 'PAID',
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

        // Sertakan rincian item beserta PB1 10% agar jumlah item_details tepat sama dengan gross_amount
        const itemsWithTax: any[] = orderResult.items.map((it: any) => ({
          id: it.menuItemId,
          price: it.harga,
          quantity: it.qty,
          name: it.nama.substring(0, 50),
        }));

        if (orderResult.tax > 0) {
          itemsWithTax.push({
            id: 'tax-pb1',
            price: orderResult.tax,
            quantity: 1,
            name: 'PB1 / Pajak Restoran (10%)',
          });
        }

        const snapPayload = {
          transaction_details: {
            order_id: `${orderResult.orderNumber}-${Date.now().toString().slice(-4)}`,
            gross_amount: orderResult.total,
          },
          customer_details: {
            first_name: orderResult.nama,
            phone: orderResult.telepon || undefined,
          },
          item_details: itemsWithTax,
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
    const rawKey = process.env.MIDTRANS_SERVER_KEY;
    if (!rawKey) {
      return res.status(500).json({
        success: false,
        message: 'Midtrans Server Key belum terpasang di backend .env',
      });
    }

    const baseKey = rawKey.replace(/["']/g, '').trim();
    const isProdConfig = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    // Hitung total item dan sertakan PB1 10% agar jumlah total item_details sama persis dengan gross_amount
    const totalItemSubtotal = Array.isArray(items)
      ? items.reduce((acc: number, it: any) => acc + Number(it.price || it.harga) * Number(it.quantity || it.qty || 1), 0)
      : 0;

    let itemDetailsList: any[] = Array.isArray(items) && items.length > 0
      ? items.map((it: any) => ({
          id: String(it.id || 'item'),
          price: Number(it.price || it.harga),
          quantity: Number(it.quantity || it.qty || 1),
          name: String(it.name || it.nama || 'Menu').substring(0, 50),
        }))
      : [];

    const taxDiff = Number(grossAmount) - totalItemSubtotal;
    if (taxDiff > 0 && itemDetailsList.length > 0) {
      itemDetailsList.push({
        id: 'tax-pb1',
        price: taxDiff,
        quantity: 1,
        name: 'PB1 / Pajak Restoran (10%)',
      });
    }

    const snapPayload = {
      transaction_details: {
        order_id: `${orderNumber || 'WRJ'}-${Date.now().toString().slice(-4)}`,
        gross_amount: Number(grossAmount),
      },
      customer_details: {
        first_name: customerName || 'Pelanggan',
        phone: phone || undefined,
      },
      item_details: itemDetailsList.length > 0 ? itemDetailsList : undefined,
    };

    const prodEndpoint = 'https://app.midtrans.com/snap/v1/transactions';
    const sandEndpoint = 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    // Kumpulan kandidat konfigurasi untuk mencoba mencocokkan kredensial Sandbox / Production secara cerdas
    const candidates: { endpoint: string; key: string; isProduction: boolean; desc: string }[] = [];

    // 1. Coba konfigurasi sesuai .env terlebih dahulu
    candidates.push({
      endpoint: isProdConfig ? prodEndpoint : sandEndpoint,
      key: baseKey,
      isProduction: isProdConfig,
      desc: isProdConfig ? 'Production (sesuai config)' : 'Sandbox (sesuai config)',
    });

    // 2. Coba lingkungan sebaliknya (Sandbox jika config Production, atau sebaliknya)
    candidates.push({
      endpoint: isProdConfig ? sandEndpoint : prodEndpoint,
      key: baseKey,
      isProduction: !isProdConfig,
      desc: !isProdConfig ? 'Production (auto-detect)' : 'Sandbox (auto-detect)',
    });

    // 3. Jika Server Key memiliki double-dash 'Mid-server--...', coba single-dash 'Mid-server-...'
    if (baseKey.includes('--')) {
      const singleDash = baseKey.replace('--', '-');
      candidates.push({
        endpoint: sandEndpoint,
        key: singleDash,
        isProduction: false,
        desc: 'Sandbox (single-dash fix)',
      });
      candidates.push({
        endpoint: prodEndpoint,
        key: singleDash,
        isProduction: true,
        desc: 'Production (single-dash fix)',
      });
      candidates.push({
        endpoint: sandEndpoint,
        key: 'SB-' + singleDash,
        isProduction: false,
        desc: 'Sandbox (SB- + single-dash fix)',
      });
    }

    // 4. Jika Server Key diawali 'Mid-server-', coba pasangkan prefix 'SB-' untuk Sandbox
    if (baseKey.startsWith('Mid-server-')) {
      candidates.push({
        endpoint: sandEndpoint,
        key: 'SB-' + baseKey,
        isProduction: false,
        desc: 'Sandbox (dengan prefix SB-)',
      });
    }

    // 5. Jika diawali 'SB-', coba tanpa 'SB-' untuk Production
    if (baseKey.startsWith('SB-')) {
      const withoutSB = baseKey.replace(/^SB-/, '');
      candidates.push({
        endpoint: prodEndpoint,
        key: withoutSB,
        isProduction: true,
        desc: 'Production (tanpa prefix SB-)',
      });
      candidates.push({
        endpoint: sandEndpoint,
        key: withoutSB,
        isProduction: false,
        desc: 'Sandbox (tanpa prefix SB-)',
      });
    }

    let lastError = 'Unauthorized';

    for (const cand of candidates) {
      try {
        const authHeader = 'Basic ' + Buffer.from(cand.key + ':').toString('base64');
        const snapRes = await fetch(cand.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify(snapPayload),
        });

        if (snapRes.ok) {
          const data: any = await snapRes.json();
          console.log(`✅ [Midtrans Snap Berhasil] Terhubung melalui ${cand.desc}`);
          return res.json({
            success: true,
            token: data.token,
            redirect_url: data.redirect_url,
            isProduction: cand.isProduction,
            clientKey: process.env.MIDTRANS_CLIENT_KEY,
          });
        } else {
          lastError = await snapRes.text();
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    console.warn('Koneksi Midtrans gagal pada semua mode dengan respons:', lastError);
    return res.status(401).json({
      success: false,
      message:
        'Server Key Midtrans tidak diotorisasi (Unauthorized). Pastikan Anda menyalin Server Key dari dashboard Midtrans (menu Settings > Access Keys).',
      errorDetails: lastError,
    });
  } catch (err: any) {
    console.error('Error createSnapToken:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal menghubungi server Midtrans.',
    });
  }
};

// Handler Webhook Notifikasi Otomatis dari Midtrans (Webhook Notification URL)
export const handleMidtransNotification = async (req: Request, res: Response) => {
  try {
    const notification = req.body;
    console.log('🔔 [Midtrans Webhook Received]:', JSON.stringify(notification));

    const {
      order_id,
      transaction_status,
      fraud_status,
      signature_key,
      status_code,
      gross_amount,
    } = notification;

    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id wajib disertakan' });
    }

    // Verifikasi Signature Key untuk keamanan webhook jika tersedia
    const serverKey = process.env.MIDTRANS_SERVER_KEY?.replace(/["']/g, '').trim();
    if (serverKey && signature_key && gross_amount && status_code) {
      const expectedSignature = crypto
        .createHash('sha512')
        .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
        .digest('hex');

      if (signature_key !== expectedSignature) {
        console.warn('⚠️ [Midtrans Webhook] Signature key tidak cocok, request ditolak.');
        return res.status(403).json({ success: false, message: 'Invalid signature key' });
      }
    }

    // Ekstrak orderNumber (misal "WRJ-001-7053" -> "WRJ-001")
    const rawOrderId = String(order_id);
    const orderNumber = rawOrderId.includes('-')
      ? rawOrderId.split('-').slice(0, 2).join('-')
      : rawOrderId;

    let newStatus = 'PENDING';

    if (
      transaction_status === 'capture' ||
      transaction_status === 'settlement' ||
      transaction_status === 'success'
    ) {
      if (fraud_status !== 'challenge') {
        newStatus = 'PAID';
      }
    } else if (transaction_status === 'pending') {
      newStatus = 'PENDING';
    } else if (
      transaction_status === 'deny' ||
      transaction_status === 'cancel' ||
      transaction_status === 'expire' ||
      transaction_status === 'failure'
    ) {
      newStatus = 'CANCELLED';
    }

    // Update status di database PostgreSQL
    const updated = await prisma.order.updateMany({
      where: {
        OR: [
          { orderNumber: orderNumber },
          { orderNumber: rawOrderId },
        ],
      },
      data: {
        paymentStatus: newStatus,
      },
    });

    console.log(
      `✅ [Midtrans Webhook] Pesanan ${orderNumber} (status: ${transaction_status}) diperbarui menjadi '${newStatus}' (${updated.count} baris terupdate).`
    );

    // Midtrans selalu membutuhkan HTTP 200 OK
    return res.status(200).json({ status: 'OK' });
  } catch (err: any) {
    console.error('Error handleMidtransNotification:', err);
    return res.status(200).json({ status: 'OK' });
  }
};



