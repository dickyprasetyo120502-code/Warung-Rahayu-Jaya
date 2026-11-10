import { Router } from 'express';
import { getProfitReport } from '../controllers/report.controller';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Hanya Admin yang dapat mengakses laporan laba bersih resmi
router.get('/profit', verifyToken, requireAdmin, getProfitReport);

export default router;

