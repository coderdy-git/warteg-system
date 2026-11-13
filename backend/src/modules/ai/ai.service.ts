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
}
