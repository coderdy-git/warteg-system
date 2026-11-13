import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginSchema, RegisterSchema, ChangePasswordSchema } from './auth.dto.js';
import { authMiddleware, AuthRequest } from '../../core/auth.middleware.js';
import { loginRateLimiter } from '../../core/security.middleware.js';

export function createAuthRouter(): Router {
  const router = Router();
  const service = new AuthService();

  // Buat default akun jika belum ada
  service.ensureDefaultUser().catch(console.error);

  // Login (Public, dilindungi Rate Limiter maks 10x / 15 menit per IP)
  router.post('/login', loginRateLimiter(10, 15 * 60 * 1000), async (req: Request, res: Response) => {
    try {
      const parsed = LoginSchema.parse(req.body);
      const result = await service.login(parsed);
      res.json({ success: true, data: result, message: 'Login berhasil' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Login gagal' });
    }
  });

  // Buat akun baru (Protected - Hanya Owner yang sudah login)
  router.post('/users', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user?.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Hanya pemilik warteg yang dapat membuat akun baru' });
      }
      const parsed = RegisterSchema.parse(req.body);
      const result = await service.createUserByOwner(parsed);
      res.status(201).json({ success: true, data: result, message: 'Akun berhasil dibuat' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Gagal membuat akun' });
    }
  });

  // Ganti Password (Protected)
  router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const parsed = ChangePasswordSchema.parse(req.body);
      await service.changePassword(req.user.id, parsed);
      res.json({ success: true, message: 'Password berhasil diperbarui' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Gagal mengganti password' });
    }
  });

  // Get current user profile (Protected)
  router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const user = await service.getProfile(req.user.id);
      res.json({ success: true, data: user });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}
