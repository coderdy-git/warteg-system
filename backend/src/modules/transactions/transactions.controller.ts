import { Router, Request, Response } from 'express';
import { TransactionsRepository } from './transactions.repository.js';
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
  TransferFundsSchema,
} from './transactions.dto.js';

export function createTransactionsRouter(): Router {
  const router = Router();
  const repo = new TransactionsRepository();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const type = typeof req.query.type === 'string' ? req.query.type : undefined;
      const method = typeof req.query.method === 'string' ? req.query.method : undefined;
      const data = await repo.findAll(type, method);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      const parsed = CreateTransactionSchema.parse(req.body);
      const created = await repo.create(parsed);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.errors || err.message });
    }
  });

  // Transfer / Pindah Kas antar kantong
  router.post('/transfer', async (req: Request, res: Response) => {
    try {
      const parsed = TransferFundsSchema.parse(req.body);
      const result = await repo.transfer(parsed);
      res.status(201).json({ success: true, data: result, message: 'Pindah kas berhasil dicatat' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.errors || err.message });
    }
  });

  // Edit Transaksi
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const parsed = UpdateTransactionSchema.parse(req.body);
      const updated = await repo.update(id, parsed);
      res.json({ success: true, data: updated, message: 'Transaksi berhasil diperbarui' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.errors || err.message });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      await repo.delete(id);
      res.json({ success: true, message: 'Transaksi berhasil dihapus' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  return router;
}
