import { Request, Response } from 'express';
import prisma from '../config/prisma';

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
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data menu dari database.',
    });
  }
};

export const createMenuItem = async (req: Request, res: Response) => {
  try {
    const { nama, harga, deskripsi, gambar, stock, categoryId, categoryTitle } = req.body;

    if (!nama || !harga || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Nama, harga, dan kategori wajib diisi.',
      });
    }

    const catId = String(categoryId).trim().toLowerCase();
    let category = await prisma.category.findUnique({ where: { id: catId } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          id: catId,
          title: categoryTitle || catId.toUpperCase(),
        },
      });
    }

    const baseSlug = nama
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const itemId = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const newItem = await prisma.menuItem.create({
      data: {
        id: itemId,
        nama: nama.trim(),
        harga: parseInt(String(harga), 10),
        deskripsi: deskripsi ? deskripsi.trim() : null,
        gambar: gambar ? gambar.trim() : '/images/ayam-goreng.jpg',
        stock: stock !== undefined ? parseInt(String(stock), 10) : 20,
        categoryId: catId,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Menu '${newItem.nama}' berhasil ditambahkan.`,
      item: newItem,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan menu baru.',
    });
  }
};

export const updateMenuItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nama, harga, deskripsi, gambar, stock, categoryId, categoryTitle } = req.body;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Item menu dengan id '${id}' tidak ditemukan.`,
      });
    }

    let catId = existing.categoryId;
    if (categoryId) {
      catId = String(categoryId).trim().toLowerCase();
      const catExists = await prisma.category.findUnique({ where: { id: catId } });
      if (!catExists) {
        await prisma.category.create({
          data: {
            id: catId,
            title: categoryTitle || catId.toUpperCase(),
          },
        });
      }
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        nama: nama !== undefined ? String(nama).trim() : existing.nama,
        harga: harga !== undefined ? parseInt(String(harga), 10) : existing.harga,
        deskripsi: deskripsi !== undefined ? (deskripsi ? String(deskripsi).trim() : null) : existing.deskripsi,
        gambar: gambar !== undefined ? (gambar ? String(gambar).trim() : null) : existing.gambar,
        stock: stock !== undefined ? parseInt(String(stock), 10) : existing.stock,
        categoryId: catId,
      },
    });

    return res.json({
      success: true,
      message: `Menu '${updated.nama}' berhasil diperbarui.`,
      item: updated,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui menu.',
    });
  }
};

export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Item menu dengan id '${id}' tidak ditemukan.`,
      });
    }

    await prisma.menuItem.delete({ where: { id } });

    return res.json({
      success: true,
      message: `Menu '${existing.nama}' berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus menu.',
    });
  }
};

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
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengupdate stok menu.',
    });
  }
};
