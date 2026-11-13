import { prisma } from '../../core/database.js';

export interface AISettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class SettingsRepository {
  async getSettings(): Promise<AISettings> {
    const records = await prisma.appSetting.findMany({
      where: {
        key: { in: ['ai_base_url', 'ai_api_key', 'ai_model'] },
      },
    });

    const map = new Map(records.map((r) => [r.key, r.value]));

    return {
      baseUrl: map.get('ai_base_url') || 'https://api.deepseek.com',
      apiKey: map.get('ai_api_key') || '',
      model: map.get('ai_model') || 'deepseek-chat',
    };
  }

  async saveSettings(settings: Partial<AISettings>) {
    const updates: Promise<any>[] = [];

    if (settings.baseUrl !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: 'ai_base_url' },
          update: { value: settings.baseUrl },
          create: { key: 'ai_base_url', value: settings.baseUrl },
        })
      );
    }

    if (settings.apiKey !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: 'ai_api_key' },
          update: { value: settings.apiKey },
          create: { key: 'ai_api_key', value: settings.apiKey },
        })
      );
    }

    if (settings.model !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: 'ai_model' },
          update: { value: settings.model },
          create: { key: 'ai_model', value: settings.model },
        })
      );
    }

    await Promise.all(updates);
    return this.getSettings();
  }
}
