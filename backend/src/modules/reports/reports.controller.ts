import { Router, Request, Response } from 'express';
import { ReportsRepository } from './reports.repository.js';

export function createReportsRouter(): Router {
  const router = Router();
  const repo = new ReportsRepository();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const report = await repo.getReport(startDate, endDate);
      res.json({ success: true, data: report });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}
