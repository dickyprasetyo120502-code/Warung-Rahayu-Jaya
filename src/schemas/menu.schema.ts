import { z } from 'zod';

export const updateStockSchema = z.object({
  stock: z.number().int().min(0, { message: 'Stok tidak boleh negatif' }),
});

export type UpdateStockInput = z.infer<typeof updateStockSchema>;

export interface MenuItemData {
  id: string;
  nama: string;
  harga: number;
  deskripsi?: string | null;
  gambar?: string | null;
  stock?: number;
  categoryId: string;
}

export interface CategoryData {
  id: string;
  title: string;
  items: MenuItemData[];
}

