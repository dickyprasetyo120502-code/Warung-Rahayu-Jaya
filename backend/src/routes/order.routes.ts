import { Router } from 'express';
import {
  createOrder,
  getOrders,
  updateOrder,
  payOrder,
  cancelOrder,
  createSnapToken,
  handleMidtransNotification,
} from '../controllers/order.controller';
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

router.post('/snap-token', createSnapToken);
router.post('/notification', handleMidtransNotification);
router.post('/', validateBody(createOrderSchema), createOrder);
router.get('/', verifyToken, requireKasirOrAdmin, getOrders);
router.put('/:orderNumber', updateOrder);
router.post('/:orderNumber/pay', payOrder);
router.put('/:orderNumber/pay', payOrder);
router.delete('/:orderNumber', cancelOrder);

export default router;
