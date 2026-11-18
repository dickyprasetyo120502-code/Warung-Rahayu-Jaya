import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';

async function generateOrderNumber(): Promise<string> {
  const count = await prisma.order.count();
  const nextSeq = count + 1;
  return `WRJ-${String(nextSeq).padStart(3, '0')}`;
}

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

    const orderResult = await prisma.$transaction(async (tx) => {
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

        await tx.menuItem.update({
          where: { id: item.id },
          data: { stock: menuItem.stock - item.qty },
        });

        subtotal += menuItem.harga * item.qty;
      }

      const tax = Math.round(subtotal * 0.1);
      const total = subtotal + tax;
      const orderNumber = await generateOrderNumber();

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
      message: 'Pesanan berhasil dibuat.',
      order: orderResult,
      snapToken,
      redirectUrl,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Gagal memproses pesanan.',
    });
  }
};

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
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat transaksi dari database.',
    });
  }
};

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

    const candidates: { endpoint: string; key: string; isProduction: boolean }[] = [];

    candidates.push({
      endpoint: isProdConfig ? prodEndpoint : sandEndpoint,
      key: baseKey,
      isProduction: isProdConfig,
    });

    candidates.push({
      endpoint: isProdConfig ? sandEndpoint : prodEndpoint,
      key: baseKey,
      isProduction: !isProdConfig,
    });

    if (baseKey.includes('--')) {
      const singleDash = baseKey.replace('--', '-');
      candidates.push({
        endpoint: sandEndpoint,
        key: singleDash,
        isProduction: false,
      });
      candidates.push({
        endpoint: prodEndpoint,
        key: singleDash,
        isProduction: true,
      });
      candidates.push({
        endpoint: sandEndpoint,
        key: 'SB-' + singleDash,
        isProduction: false,
      });
    }

    if (baseKey.startsWith('Mid-server-')) {
      candidates.push({
        endpoint: sandEndpoint,
        key: 'SB-' + baseKey,
        isProduction: false,
      });
    }

    if (baseKey.startsWith('SB-')) {
      const withoutSB = baseKey.replace(/^SB-/, '');
      candidates.push({
        endpoint: prodEndpoint,
        key: withoutSB,
        isProduction: true,
      });
      candidates.push({
        endpoint: sandEndpoint,
        key: withoutSB,
        isProduction: false,
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

    return res.status(401).json({
      success: false,
      message: 'Server Key Midtrans tidak diotorisasi (Unauthorized).',
      errorDetails: lastError,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal menghubungi server Midtrans.',
    });
  }
};

export const handleMidtransNotification = async (req: Request, res: Response) => {
  try {
    const notification = req.body;
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

    const serverKey = process.env.MIDTRANS_SERVER_KEY?.replace(/["']/g, '').trim();
    if (serverKey && signature_key && gross_amount && status_code) {
      const expectedSignature = crypto
        .createHash('sha512')
        .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
        .digest('hex');

      if (signature_key !== expectedSignature) {
        return res.status(403).json({ success: false, message: 'Invalid signature key' });
      }
    }

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

    await prisma.order.updateMany({
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

    return res.status(200).json({ status: 'OK' });
  } catch (err: any) {
    console.error(err);
    return res.status(200).json({ status: 'OK' });
  }
};
