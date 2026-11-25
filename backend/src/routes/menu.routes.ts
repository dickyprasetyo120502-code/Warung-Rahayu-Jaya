import { Router } from 'express';
import {
  getMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateStock,
} from '../controllers/menu.controller';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const updateStockSchema = z.object({
  stock: z.number().int().min(0, { message: 'Stok tidak boleh negatif' }),
});

router.get('/', getMenu);
router.post('/', verifyToken, requireAdmin, createMenuItem);
router.put('/:id', verifyToken, requireAdmin, updateMenuItem);
router.delete('/:id', verifyToken, requireAdmin, deleteMenuItem);
router.put('/:id/stock', verifyToken, requireAdmin, validateBody(updateStockSchema), updateStock);

export default router;

