import { SettingsRepository } from '../settings/settings.repository.js';
import { DashboardRepository } from '../dashboard/dashboard.repository.js';
import { TransactionsRepository } from '../transactions/transactions.repository.js';
import OpenAI from 'openai';

export class AIService {
  private settingsRepo = new SettingsRepository();
  private dashboardRepo = new DashboardRepository();
  private transactionsRepo = new TransactionsRepository();

  async chat(
    messages: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      imageBase64?: string;
      images?: string[];
    }[]
  ) {
    const config = await this.settingsRepo.getSettings();
    if (!config.apiKey) {
      throw new Error(
        'Asisten AI belum dikonfigurasi. Silakan simpan API Key DeepSeek di menu Pengaturan.'
      );
    }

    const baseUrl = (config.baseUrl || 'https://api.deepseek.com').trim();
    const apiKey = config.apiKey.trim();

    const openai = new OpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
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
Kamu adalah "Asisten AI WSystem", asisten keuangan internal khusus untuk warteg "WSystem".
Jawablah secara singkat, padat, ramah, dan to-the-point khas operasional warteg.

[PANDUAN MENJAWAB & DATA - SANGAT PENTING]
1. HANYA JAWAB APA YANG DITANYAKAN:
   - JANGAN PERNAH mengeluarkan laporan mingguan, rincian 7 hari terakhir, atau rekap saldo kas jika pengguna TIDAK MEMINTANYA secara eksplisit!
   - Contoh: Jika pengguna menyapa "Halo", cukup jawab salam singkat dan tawarkan bantuan. JANGAN lampirkan tabel saldo atau ringkasan 7 hari.
   - Contoh: Jika pengguna bertanya saldo kas toko, HANYA sebutkan saldo kas toko. Jangan sebutkan saldo pos lain kecuali diminta.

2. KEMAMPUAN MENCATAT TRANSAKSI OTOMATIS:
   - Jika pengguna bermaksud mencatat transaksi, atau mengirimkan foto nota/struk belanja:
   - Berikan rincian singkat barang & total belanja.
   - Jika pengguna meminta dicatat atau foto adalah struk belanja operasional warteg, sertakan blok JSON khusus di AKHIR jawabanmu dengan format berikut (HANYA JSON murni di dalam tag):
   <<<TRANSACTION_RECORD>>>
   {
     "type": "expense",
     "amount": 50000,
     "method": "tunai_toko",
     "description": "Belanja Pasar: Bumbu & Sayur",
     "date": "YYYY-MM-DD"
   }
   <<<END_TRANSACTION_RECORD>>>
   - Nilai "amount" WAJIB berupa angka integer murni (tanpa titik, tanpa 'Rp').
   - Sistem backend akan membaca blok ini dan otomatis menyimpannya ke database warteg!

[DATA KEUANGAN UNTUK REFERENSI INTERNAL KAMU]
- Total Saldo Kas: Rp ${summary.totalBalance.toLocaleString('id-ID')}
  * Kas di Toko (Laci): Rp ${summary.cashToko.toLocaleString('id-ID')}
  * Kas Besar (Brankas): Rp ${summary.cashBesar.toLocaleString('id-ID')}
  * QRIS Dana: Rp ${summary.qrisDana.toLocaleString('id-ID')}
  * QRIS GoPay: Rp ${summary.qrisGopay.toLocaleString('id-ID')}
- Pemasukan 7 Hari Terakhir: Rp ${summary.weeklyIncome.toLocaleString('id-ID')}
- Pengeluaran 7 Hari Terakhir: Rp ${summary.weeklyExpense.toLocaleString('id-ID')}

10 Transaksi Terakhir:
${recentTrxText || 'Belum ada transaksi tercatat.'}`;

    // Deteksi jika pesan mengandung gambar (single atau multi-image)
    const hasImage = messages.some((m) => Boolean(m.imageBase64 || (m.images && m.images.length > 0)));
    // Jika ada gambar gunakan model multimodal deepseek-flash / model vision aktif
    const targetModel = hasImage ? 'deepseek-flash' : config.model || 'deepseek-chat';

    const formattedMessages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const m of messages) {
      const allImages: string[] = [];
      if (Array.isArray(m.images) && m.images.length > 0) {
        allImages.push(...m.images);
      } else if (m.imageBase64) {
        allImages.push(m.imageBase64);
      }

      if (allImages.length > 0) {
        const contentParts: any[] = [
          {
            type: 'text',
            text:
              m.content ||
              (allImages.length > 1
                ? 'Tolong baca dan gabungkan analisis semua foto struk/catatan belanja ini, hitung total keseluruhan pengeluaran belanja:'
                : 'Tolong baca dan analisis struk/catatan belanja ini, rincikan item dan total rupiahnya:'),
          },
        ];

        for (const rawImg of allImages) {
          let imgUrl = rawImg;
          if (!imgUrl.startsWith('data:image/')) {
            imgUrl = `data:image/jpeg;base64,${imgUrl}`;
          }
          contentParts.push({
            type: 'image_url',
            image_url: { url: imgUrl },
          });
        }

        formattedMessages.push({
          role: m.role,
          content: contentParts,
        });
      } else {
        formattedMessages.push({
          role: m.role,
          content: m.content,
        });
      }
    }

    try {
      const response = await openai.chat.completions.create({
        model: targetModel,
        messages: formattedMessages,
        temperature: 0.2,
      });

      let rawResponse = response.choices[0]?.message?.content || '';

      // Ekstraksi blok transaksi otomatis (<<<TRANSACTION_RECORD>>> ... <<<END_TRANSACTION_RECORD>>>)
      const recordMatch = rawResponse.match(/<<<TRANSACTION_RECORD>>>([\s\S]*?)<<<END_TRANSACTION_RECORD>>>/);
      let executedTransaction = false;

      if (recordMatch && recordMatch[1]) {
        try {
          // Bersihkan karakter aneh atau markdown di dalam blok json
          const rawBlock = recordMatch[1]
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

          const jsonCandidate = rawBlock.match(/\{[\s\S]*\}/);
          if (jsonCandidate) {
            const parsed = JSON.parse(jsonCandidate[0]);
            if (parsed && (parsed.amount || parsed.totalAmount)) {
              const rawAmt = parsed.amount !== undefined ? parsed.amount : parsed.totalAmount;
              const numericAmount = Math.abs(parseInt(String(rawAmt).replace(/[^0-9]/g, ''), 10));

              if (!isNaN(numericAmount) && numericAmount > 0) {
                await this.transactionsRepo.create({
                  type: parsed.type === 'income' ? 'income' : 'expense',
                  amount: numericAmount,
                  method: ['tunai_toko', 'tunai_kas_besar', 'qris_dana', 'qris_gopay'].includes(parsed.method)
                    ? parsed.method
                    : 'tunai_toko',
                  description: String(parsed.description || 'Belanja Bahan Warteg'),
                  date: parsed.date || new Date().toISOString().slice(0, 10),
                });
                executedTransaction = true;
              }
            }
          }
        } catch (e) {
          console.error('Gagal parse blok transaksi AI (diabaikan agar chat tidak crash):', e);
        }

        // Hapus blok teknis dari tampilan chat agar teks rapi
        rawResponse = rawResponse.replace(/<<<TRANSACTION_RECORD>>>[\s\S]*?<<<END_TRANSACTION_RECORD>>>/g, '').trim();
        if (executedTransaction) {
          rawResponse += '\n\n*(✅ Berhasil dicatat langsung ke pembukuan kas warteg!)*';
        }
      }

      return rawResponse || 'Maaf, saya tidak menerima respons dari model DeepSeek.';
    } catch (err: any) {
      // Jika model deepseek-flash belum aktif di akun user, fallback mencoba model reguler
      if (hasImage && err?.status === 404) {
        throw new Error('Model DeepSeek Vision belum aktif pada akun API ini. Pastikan akun DeepSeek Anda memiliki kuota untuk vision.');
      }
      throw err;
    }
  }

  async scanReceipt(imageBase64: string): Promise<{
    totalAmount: number;
    description: string;
    date: string;
    suggestedType: 'expense' | 'income';
    items?: { name: string; price: number }[];
  }> {
    const config = await this.settingsRepo.getSettings();

    // 100% Menggunakan Konfigurasi DeepSeek yang sudah ada di Settings
    const baseUrl = (config.baseUrl || 'https://api.deepseek.com').trim();
    const apiKey = (config.apiKey || '').trim();

    if (!apiKey) {
      throw new Error(
        'API Key DeepSeek belum tersimpan di database. Silakan simpan API Key di menu Pengaturan.'
      );
    }

    const openai = new OpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
    });

    // Pastikan format data URL base64 valid
    let formattedImageUrl = imageBase64;
    if (!imageBase64.startsWith('data:image/')) {
      formattedImageUrl = `data:image/jpeg;base64,${imageBase64}`;
    }

    const promptText = `Kamu adalah sistem OCR AI kasir warteg Indonesia.
Tugasmu adalah menganalisis gambar foto struk belanja, bon pasar, nota pembelian bahan baku warteg, atau catatan pengeluaran kasir.

Ekstrak informasi dan balas HANYA dalam format JSON valid murni (tanpa format markdown, tanpa petik tiga \`\`\`json, hanya raw JSON):
{
  "totalAmount": 100000,
  "description": "Belanja Pasar: Bumbu & Sayur",
  "date": "YYYY-MM-DD",
  "suggestedType": "expense",
  "items": [
    { "name": "Bawang Merah 1kg", "price": 35000 }
  ]
}

Aturan:
1. "totalAmount" WAJIB berupa integer angka murni tanpa titik atau koma.
2. Targetkan total nominal rupiah akhir yang dibayarkan.
3. Deskripsi harus ringkas dan jelas khas belanja warteg (contoh: "Belanja Pasar: Bumbu & Sayur", "Belanja Beras 50kg", "Belanja Gas Elpiji 3kg").
4. Jika nominal tidak terlihat jelas, estimasikan secara wajar berdasarkan item yang terbaca.`;

    // Gunakan model yang mendukung vision (deepseek-flash atau model konfigurasi)
    const targetModel = config.model === 'deepseek-chat' ? 'deepseek-flash' : (config.model || 'deepseek-flash');

    const response = await openai.chat.completions.create({
      model: targetModel,
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
    const cleanedContent = rawContent
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // Ekstraksi blok JSON tahan banting menggunakan regex
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const rawAmt = parsed.totalAmount !== undefined ? parsed.totalAmount : parsed.amount;
        const totalAmount = Math.abs(parseInt(String(rawAmt || 0).replace(/[^0-9]/g, ''), 10)) || 0;

        return {
          totalAmount,
          description: parsed.description || 'Belanja Pasar / Operasional Warteg',
          date: parsed.date || new Date().toISOString().slice(0, 10),
          suggestedType: 'expense',
          items: Array.isArray(parsed.items) ? parsed.items : [],
        };
      } catch (err) {
        console.error('Gagal parse JSON struk:', err);
      }
    }

    // Jika gagal parse JSON, coba ekstrak nominal angka dari teks bebas AI
    const nominalMatch = rawContent.match(/(?:total|rp|sebesar|nominal)[\s:]*([0-9.,]+)/i);
    let fallbackAmount = 0;
    if (nominalMatch && nominalMatch[1]) {
      fallbackAmount = parseInt(nominalMatch[1].replace(/[^0-9]/g, ''), 10) || 0;
    }

    return {
      totalAmount: fallbackAmount,
      description: 'Belanja Pasar / Operasional Warteg',
      date: new Date().toISOString().slice(0, 10),
      suggestedType: 'expense',
      items: [],
    };
  }
}
