import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(3),
  role: z.enum(['ADMIN', 'KASIR']).optional(),
});

router.post('/login', validateBody(loginSchema), login);
router.get('/me', verifyToken, getMe);

export default router;

