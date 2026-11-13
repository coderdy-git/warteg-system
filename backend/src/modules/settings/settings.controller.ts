import { Router, Request, Response } from 'express';
import { SettingsRepository } from './settings.repository.js';
import OpenAI from 'openai';

export function createSettingsRouter(): Router {
  const router = Router();
  const repo = new SettingsRepository();

  // Ambil pengaturan saat ini (API Key dimasking agar aman)
  router.get('/ai', async (_req: Request, res: Response) => {
    try {
      const settings = await repo.getSettings();
      const maskedKey = settings.apiKey
        ? settings.apiKey.slice(0, 4) + '••••••••' + settings.apiKey.slice(-4)
        : '';
      res.json({
        success: true,
        data: {
          baseUrl: settings.baseUrl,
          apiKey: '', // Jangan pernah kirim raw API key ke frontend
          maskedApiKey: maskedKey,
          hasApiKey: Boolean(settings.apiKey),
          model: settings.model,
          isConfigured: Boolean(settings.baseUrl && settings.apiKey && settings.model),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Simpan pengaturan AI
  router.post('/ai', async (req: Request, res: Response) => {
    try {
      const { baseUrl, apiKey, model } = req.body;
      const current = await repo.getSettings();
      // Jika apiKey kosong (tidak diubah oleh user), pertahankan apiKey lama di DB
      const finalApiKey = apiKey && apiKey.trim() !== '' ? apiKey.trim() : current.apiKey;
      const updated = await repo.saveSettings({
        baseUrl: baseUrl?.trim(),
        apiKey: finalApiKey,
        model: model?.trim(),
      });
      res.json({
        success: true,
        data: { baseUrl: updated.baseUrl, model: updated.model, hasApiKey: Boolean(updated.apiKey) },
        message: 'Pengaturan AI berhasil disimpan',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Test koneksi & Ambil daftar model dari baseUrl & apiKey
  router.post('/ai/models', async (req: Request, res: Response) => {
    try {
      let { baseUrl, apiKey } = req.body;

      // Jika apiKey kosong di form, gunakan yang sudah tersimpan di database
      const saved = await repo.getSettings();
      baseUrl = (baseUrl && baseUrl.trim()) || saved.baseUrl;
      apiKey = (apiKey && apiKey.trim()) || saved.apiKey;

      if (!baseUrl || !apiKey) {
        return res.status(400).json({
          success: false,
          message: 'Base URL dan API Key harus diisi terlebih dahulu',
        });
      }

      const openai = new OpenAI({
        baseURL: baseUrl.trim(),
        apiKey: apiKey.trim(),
      });

      const response = await openai.models.list();
      const models = response.data
        .map((m) => m.id)
        .sort((a, b) => a.localeCompare(b));

      res.json({ success: true, data: models });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message:
          err.message ||
          'Gagal mengambil daftar model. Pastikan Base URL & API Key DeepSeek valid.',
      });
    }
  });

  return router;
}
