import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Ambil seluruh menu & kategori beserta stok real-time
export const getMenu = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        items: {
          orderBy: { harga: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    return res.json({
      success: true,
      categories,
    });
  } catch (error: any) {
    console.error('Error getMenu:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data menu dari database.',
    });
  }
};

// Update stok item menu dari Admin
export const updateStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Item menu dengan id '${id}' tidak ditemukan.`,
      });
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: { stock: parseInt(stock, 10) },
    });

    return res.json({
      success: true,
      message: `Stok ${updated.nama} berhasil diubah menjadi ${updated.stock}.`,
      item: updated,
    });
  } catch (error: any) {
    console.error('Error updateStock:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengupdate stok menu.',
    });
  }
};

