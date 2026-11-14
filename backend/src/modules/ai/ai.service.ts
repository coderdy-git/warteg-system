import { SettingsRepository } from '../settings/settings.repository.js';
import { DashboardRepository } from '../dashboard/dashboard.repository.js';
import { TransactionsRepository } from '../transactions/transactions.repository.js';
import OpenAI from 'openai';

export class AIService {
  private settingsRepo = new SettingsRepository();
  private dashboardRepo = new DashboardRepository();
  private transactionsRepo = new TransactionsRepository();

  async chat(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]) {
    const config = await this.settingsRepo.getSettings();
    if (!config.baseUrl || !config.apiKey || !config.model) {
      throw new Error(
        'Asisten AI belum dikonfigurasi. Silakan atur Base URL, API Key, dan Model di menu Pengaturan.'
      );
    }

    const openai = new OpenAI({
      baseURL: config.baseUrl.trim(),
      apiKey: config.apiKey.trim(),
    });

    const summary = await this.dashboardRepo.getSummary();
    const recentTrx = await this.transactionsRepo.findAll();

    const methodLabels: Record<string, string> = {
      tunai_toko: 'Tunai di Toko',
      tunai_kas_besar: 'Kas Besar',
      qris_dana: 'QRIS Dana',
      qris_gopay: 'QRIS GoPay',
      tunai: 'Tunai di Toko',
      qris: 'QRIS Dana',
    };

    const recentTrxText = recentTrx
      .slice(0, 10)
      .map(
        (t) =>
          `- [${t.date.toISOString().slice(0, 10)}] ${t.type.toUpperCase()} Rp ${t.amount.toLocaleString(
            'id-ID'
          )} (${methodLabels[t.method] || t.method}): "${t.description}"`
      )
      .join('\n');

    const systemPrompt = `[IDENTITAS & PERAN]
Kamu adalah "Asisten AI WSystem", asisten keuangan internal khusus untuk dashboard warteg "WSystem".
Tugas utamamu adalah mendampingi pemilik dan kasir warteg membaca kondisi kas, menganalisis laba/rugi, dan mengevaluasi transaksi warteg.

[STRUKTUR POSISI KAS WARTEG]
Kas Warteg dibagi menjadi 2 pilar utama dengan masing-masing 2 sub-kantong:
1. Posisi Kas Tunai:
   - Kas di Toko (uang fisik di laci kasir harian)
   - Kas Besar (brankas / simpanan cadangan kas besar)
2. Posisi Kas QRIS (Digital):
   - QRIS Dana (saldo akun Dana)
   - QRIS GoPay (saldo akun GoPay)

[DATA REALTIME FINANSIAL WARTEG SAAT INI]
- TOTAL KAS KESELURUHAN: Rp ${summary.totalBalance.toLocaleString('id-ID')}
- Total Kas Tunai: Rp ${summary.totalCash.toLocaleString('id-ID')}
  * Kas di Toko: Rp ${summary.cashToko.toLocaleString('id-ID')}
  * Kas Besar: Rp ${summary.cashBesar.toLocaleString('id-ID')}
- Total Kas QRIS: Rp ${summary.totalQris.toLocaleString('id-ID')}
  * QRIS Dana: Rp ${summary.qrisDana.toLocaleString('id-ID')}
  * QRIS GoPay: Rp ${summary.qrisGopay.toLocaleString('id-ID')}

- Arus Masuk Minggu Ini (7 Hari Terakhir): Rp ${summary.weeklyIncome.toLocaleString('id-ID')}
- Arus Keluar Minggu Ini (7 Hari Terakhir): Rp ${summary.weeklyExpense.toLocaleString('id-ID')}
- Selisih Bersih Minggu Ini: Rp ${(summary.weeklyIncome - summary.weeklyExpense).toLocaleString('id-ID')}

10 Transaksi Terakhir yang Tercatat:
${recentTrxText || 'Belum ada transaksi tercatat.'}

[BATASAN LINGKUP & KEAMANAN (SANGAT KETAT)]
1. LINGKUP EKSKLUSIF:
   Kamu HANYA diizinkan menjawab dan berdiskusi seputar sistem WSystem dan keuangan warteg ini (Posisi kas di Toko, Kas Besar, QRIS Dana, QRIS GoPay, performa mingguan, mutasi transaksi).
2. PENOLAKAN DI LUAR LINGKUP:
   Tolak secara sopan pertanyaan di luar konteks warteg (seperti coding umum, politik, cerita fiksi, matematika acak):
   "Maaf, saya adalah asisten khusus WSystem. Saya hanya dapat membantu terkait data keuangan, posisi kas (Toko, Kas Besar, Dana, GoPay), dan transaksi operasional warteg Anda."
3. FORMAT JAWABAN:
   - Jawab secara to-the-point dan ramah.
   - Format nominal uang selalu Rupiah rapi (contoh: Rp 150.000).`;

    const fullMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages,
    ];

    const response = await openai.chat.completions.create({
      model: config.model,
      messages: fullMessages,
      temperature: 0.3,
    });

    return (
      response.choices[0]?.message?.content ||
      'Maaf, saya tidak menerima respons dari model DeepSeek.'
    );
  }

  async scanReceipt(imageBase64: string): Promise<{
    totalAmount: number;
    description: string;
    date: string;
    suggestedType: 'expense' | 'income';
    items?: { name: string; price: number }[];
  }> {
    const config = await this.settingsRepo.getSettings();

    // Prioritaskan konfigurasi Vision khusus jika diatur, atau fallback ke config utama / OpenRouter / Gemini
    let visionBaseUrl = config.visionBaseUrl || config.baseUrl;
    let visionApiKey = config.visionApiKey || config.apiKey;
    let visionModel = config.visionModel || (config.model.includes('deepseek') ? 'google/gemini-2.0-flash-exp:free' : config.model);

    // Jika base URL bawaan DeepSeek (yang tidak punya vision), fallback ke OpenRouter atau Google Gemini kompatibel endpoint jika belum diset
    if (visionBaseUrl.includes('api.deepseek.com') && !config.visionBaseUrl) {
      // Default ke OpenRouter multi-modal free/low-cost atau user vision endpoint
      visionBaseUrl = 'https://openrouter.ai/api/v1';
      visionModel = 'google/gemini-2.0-flash-exp:free';
    }

    if (!visionApiKey) {
      throw new Error(
        'API Key Vision AI belum dikonfigurasi. Silakan masukkan API Key di Pengaturan AI.'
      );
    }

    const openai = new OpenAI({
      baseURL: visionBaseUrl.trim(),
      apiKey: visionApiKey.trim(),
    });

    // Pastikan format data URL base64 valid
    let formattedImageUrl = imageBase64;
    if (!imageBase64.startsWith('data:image/')) {
      formattedImageUrl = `data:image/jpeg;base64,${imageBase64}`;
    }

    const promptText = `Kamu adalah sistem OCR AI cerdas kasir warteg Indonesia.
Tugasmu adalah menganalisis gambar foto struk belanja, bon pasar, nota pembelian bahan baku warteg, atau catatan pengeluaran tangan/ketik.

Ekstrak informasi berikut dan balas HANYA dalam format JSON valid murni (tanpa format markdown, tanpa petik tiga \`\`\`json, hanya raw JSON):
{
  "totalAmount": <angka_nominal_total_belanja_tanpa_titik_atau_koma_integer>,
  "description": "<ringkasan_singkat_contoh_Belanja_Pasar_Bawang_Cabai_Telur>",
  "date": "<tanggal_struk_format_YYYY-MM-DD_jika_tidak_tertera_gunakan_hari_ini>",
  "suggestedType": "expense",
  "items": [
    { "name": "<nama_item>", "price": <harga_angka_integer> }
  ]
}

Aturan:
1. Jika foto berupa bon pasar / struk belanja / kwitansi, targetkan total akhir yang harus dibayarkan.
2. Deskripsi harus ringkas dan jelas khas belanja warteg (contoh: "Belanja Pasar: Bumbu & Sayur", "Belanja Beras 50kg", "Belanja Gas Elpiji 3kg").
3. Jika nominal tidak terlihat jelas, tebak perkiraan wajar berdasarkan item yang terbaca.`;

    const response = await openai.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            {
              type: 'image_url',
              image_url: {
                url: formattedImageUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
    });

    const rawContent = response.choices[0]?.message?.content || '{}';
    // Bersihkan dari backticks jika model menambahkan ```json ... ```
    const cleanedJson = rawContent
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    try {
      const parsed = JSON.parse(cleanedJson);
      return {
        totalAmount: Number(parsed.totalAmount) || 0,
        description: parsed.description || 'Belanja Pasar / Operasional Warteg',
        date: parsed.date || new Date().toISOString().slice(0, 10),
        suggestedType: 'expense',
        items: Array.isArray(parsed.items) ? parsed.items : [],
      };
    } catch {
      throw new Error('Gagal memproses struk: AI mengembalikan format tidak valid. Coba ulangi dengan foto yang lebih terang.');
    }
  }
}
