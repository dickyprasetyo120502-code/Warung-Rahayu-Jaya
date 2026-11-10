import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(2, { message: 'Username minimal 2 karakter' }),
  password: z.string().min(3, { message: 'Password minimal 3 karakter' }),
  role: z.enum(['ADMIN', 'KASIR'], {
    errorMap: () => ({ message: 'Role harus ADMIN atau KASIR' }),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthUser {
  id?: number;
  username: string;
  role: 'ADMIN' | 'KASIR';
  name: string;
  token?: string;
}

