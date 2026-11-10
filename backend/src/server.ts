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

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Welcome & Health Check Routes
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Selamat datang di REST API Warung Rahayu Jaya!',
    version: '1.0.0',
    documentation: {
      health: 'GET /api/health',
      auth: {
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me (Membutuhkan Bearer Token)',
      },
      menu: {
        getAll: 'GET /api/menu',
        updateStock: 'PUT /api/menu/:id/stock (Admin Only)',
      },
      orders: {
        create: 'POST /api/orders',
        getAll: 'GET /api/orders (Kasir/Admin)',
      },
      reports: {
        profit: 'GET /api/reports/profit (Admin Only)',
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

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);

// 404 Route Not Found
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint API tidak ditemukan.',
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server backend.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 [Server Backend] Warung Rahayu Jaya berjalan di http://localhost:${PORT}`);
  console.log(`📦 [Database] Terhubung ke PostgreSQL Local via Prisma ORM`);
});

export default app;

