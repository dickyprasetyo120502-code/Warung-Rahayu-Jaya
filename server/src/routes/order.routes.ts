import { Router } from 'express';
import { createOrder, getOrders } from '../controllers/order.controller';
import { verifyToken, requireKasirOrAdmin } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const createOrderSchema = z.object({
  orderType: z.enum(['dine-in', 'take-away']),
  tableNumber: z.string().optional().nullable(),
  guestCount: z.string().optional().nullable(),
  nama: z.string().min(2),
  telepon: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
  cartItems: z.array(
    z.object({
      id: z.string(),
      nama: z.string(),
      harga: z.number().nonnegative(),
      qty: z.number().int().positive(),
    })
  ).min(1),
  paymentMethod: z.enum(['qris', 'cash', 'edc']),
});

// Kasir dan publik dapat membuat order
router.post('/', validateBody(createOrderSchema), createOrder);

// Melihat riwayat pesanan (Admin & Kasir)
router.get('/', verifyToken, requireKasirOrAdmin, getOrders);

export default router;

