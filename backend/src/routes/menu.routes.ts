import { Router } from 'express';
import { getMenu, updateStock } from '../controllers/menu.controller';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const updateStockSchema = z.object({
  stock: z.number().int().min(0, { message: 'Stok tidak boleh negatif' }),
});

router.get('/', getMenu);
router.put('/:id/stock', verifyToken, requireAdmin, validateBody(updateStockSchema), updateStock);

export default router;

