import { Router, Request, Response } from 'express';
import { DashboardService } from './dashboard.service.js';

export function createDashboardRouter(): Router {
  const router = Router();
  const service = new DashboardService();

  router.get('/summary', async (_req: Request, res: Response) => {
    try {
      const summary = await service.getDashboardSummary();
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.get('/transactions', async (_req: Request, res: Response) => {
    try {
      const list = await service.getRecentTransactions();
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}
