import { Router } from 'express';
import { getProfitReport } from '../controllers/report.controller';
import { verifyToken, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/profit', verifyToken, requireAdmin, getProfitReport);

export default router;

