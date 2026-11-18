import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import orderRoutes from './routes/order.routes';
import reportRoutes from './routes/report.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Selamat datang di REST API Warung Rahayu Jaya!',
    version: '1.0.0',
    documentation: {
      health: 'GET /api/health',
      auth: {
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me',
      },
      menu: {
        getAll: 'GET /api/menu',
        updateStock: 'PUT /api/menu/:id/stock',
      },
      orders: {
        create: 'POST /api/orders',
        getAll: 'GET /api/orders',
      },
      reports: {
        profit: 'GET /api/reports/profit',
      },
    },
  });
});

app.get('/api', (_req: Request, res: Response) => {
  res.redirect('/');
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    service: 'Warung Rahayu Jaya REST API',
    database: 'PostgreSQL Local',
    orm: 'Prisma',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint API tidak ditemukan.',
  });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server backend.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

export default app;
