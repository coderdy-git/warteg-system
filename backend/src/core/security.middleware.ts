import { Request, Response, NextFunction } from 'express';

/**
 * Security Headers ringan (pengganti Helmet tanpa tambahan dependency eksternal)
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

/**
 * In-Memory Rate Limiter untuk melindungi endpoint sensitif (seperti /api/auth/login)
 * dari serangan brute-force password.
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

export function loginRateLimiter(maxAttempts = 10, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (!record || now > record.resetAt) {
      loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxAttempts) {
      const remainingMinutes = Math.ceil((record.resetAt - now) / 60000);
      return res.status(429).json({
        success: false,
        message: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${remainingMinutes} menit.`,
      });
    }

    record.count += 1;
    next();
  };
}
