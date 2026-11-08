import { z } from 'zod';

export const orderItemSchema = z.object({
  id: z.string(),
  nama: z.string(),
  harga: z.number().nonnegative(),
  qty: z.number().int().positive({ message: 'Jumlah minimal 1 porsi' }),
  gambar: z.string().optional(),
});

export const createOrderSchema = z
  .object({
    orderType: z.enum(['dine-in', 'take-away']),
    tableNumber: z.string().optional().nullable(),
    guestCount: z.string().optional().nullable(),
    nama: z.string().min(2, { message: 'Nama pemesan minimal 2 karakter' }),
    telepon: z.string().optional().nullable(),
    catatan: z.string().optional().nullable(),
    cartItems: z.array(orderItemSchema).min(1, { message: 'Pilih minimal 1 menu' }),
    paymentMethod: z.enum(['qris', 'cash', 'edc']),
  })
  .refine(
    (data) => {
      if (data.orderType === 'dine-in' && (!data.tableNumber || data.tableNumber.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'Nomor meja wajib diisi untuk layanan Dine-In',
      path: ['tableNumber'],
    }
  );

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export interface OrderData {
  id?: number;
  orderNumber: string;
  orderType: 'dine-in' | 'take-away';
  tableNumber?: string | null;
  guestCount?: string | null;
  nama: string;
  telepon?: string | null;
  catatan?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'qris' | 'cash' | 'edc';
  paymentStatus?: string;
  cartItems: OrderItemInput[];
  date?: string;
  timestamp?: string;
}

