import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createAuthRouter } from './modules/auth/auth.controller.js';
import { createDashboardRouter } from './modules/dashboard/dashboard.controller.js';
import { createTransactionsRouter } from './modules/transactions/transactions.controller.js';
import { createReportsRouter } from './modules/reports/reports.controller.js';
import { createSettingsRouter } from './modules/settings/settings.controller.js';
import { createAIRouter } from './modules/ai/ai.controller.js';
import { authMiddleware } from './core/auth.middleware.js';
import { securityHeadersMiddleware } from './core/security.middleware.js';

dotenv.config();

export function createApp() {
  const app = express();
  const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

  app.use(securityHeadersMiddleware);
  app.use(
    cors({
      origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  // Health Check (Public)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'warteg-backend', timestamp: new Date() });
  });

  // Modular Routers (Protected by JWT Auth Middleware)
  app.use('/api/auth', createAuthRouter());
  app.use('/api/dashboard', authMiddleware, createDashboardRouter());
  app.use('/api/transactions', authMiddleware, createTransactionsRouter());
  app.use('/api/reports', authMiddleware, createReportsRouter());
  app.use('/api/settings', authMiddleware, createSettingsRouter());
  app.use('/api/ai', authMiddleware, createAIRouter());

  return app;
}
