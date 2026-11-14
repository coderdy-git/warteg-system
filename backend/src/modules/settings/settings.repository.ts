import { prisma } from '../../core/database.js';

export interface AISettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  visionBaseUrl?: string;
  visionApiKey?: string;
  visionModel?: string;
}

export class SettingsRepository {
  async getSettings(): Promise<AISettings> {
    const records = await prisma.appSetting.findMany({
      where: {
        key: {
          in: [
            'ai_base_url',
            'ai_api_key',
            'ai_model',
            'ai_vision_base_url',
            'ai_vision_api_key',
            'ai_vision_model',
          ],
        },
      },
    });

    const map = new Map(records.map((r) => [r.key, r.value]));

    return {
      baseUrl: map.get('ai_base_url') || 'https://api.deepseek.com',
      apiKey: map.get('ai_api_key') || '',
      model: map.get('ai_model') || 'deepseek-chat',
      visionBaseUrl: map.get('ai_vision_base_url') || '',
      visionApiKey: map.get('ai_vision_api_key') || '',
      visionModel: map.get('ai_vision_model') || '',
    };
  }

  async saveSettings(settings: Partial<AISettings>) {
    const updates: Promise<any>[] = [];

    const fieldMap: Record<string, string | undefined> = {
      ai_base_url: settings.baseUrl,
      ai_api_key: settings.apiKey,
      ai_model: settings.model,
      ai_vision_base_url: settings.visionBaseUrl,
      ai_vision_api_key: settings.visionApiKey,
      ai_vision_model: settings.visionModel,
    };

    for (const [key, val] of Object.entries(fieldMap)) {
      if (val !== undefined) {
        updates.push(
          prisma.appSetting.upsert({
            where: { key },
            update: { value: val },
            create: { key, value: val },
          })
        );
      }
    }

    await Promise.all(updates);
    return this.getSettings();
  }
}
