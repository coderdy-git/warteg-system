import { Router, Request, Response } from 'express';
import { AIService } from './ai.service.js';

export function createAIRouter(): Router {
  const router = Router();
  const service = new AIService();

  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, message: 'Messages array diperlukan' });
      }

      const reply = await service.chat(messages);
      res.json({ success: true, data: reply });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}
