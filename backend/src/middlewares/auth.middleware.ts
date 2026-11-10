import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  id: number;
  username: string;
  role: 'ADMIN' | 'KASIR';
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'warung_rahayu_jaya_jwt_secret_super_secure_key_2026';

// Middleware verifikasi JWT
export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Token otentikasi tidak ditemukan.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token otentikasi tidak valid atau telah kedaluwarsa.',
    });
  }
};

// Middleware proteksi khusus Admin
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Fitur ini hanya dapat diakses oleh Administrator.',
    });
  }
  next();
};

// Middleware proteksi Kasir / Admin
export const requireKasirOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'KASIR' && req.user.role !== 'ADMIN')) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Memerlukan hak akses Kasir atau Admin.',
    });
  }
  next();
};

