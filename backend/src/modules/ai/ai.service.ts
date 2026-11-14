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
   - Jika pengguna bermaksud mencatat transaksi (contoh: "catat belanja cabai 30.000 dari kas toko", "masukkan pemasukan 200rb ke qris dana", atau konfirmasi foto nota belanja):
   - Kamu WAJIB menyertakan blok JSON khusus di AKHIR jawabanmu dengan format berikut:
   <<<TRANSACTION_RECORD>>>
   {
     "type": "expense" | "income",
     "amount": <angka_nominal_rupiah_integer>,
     "method": "tunai_toko" | "tunai_kas_besar" | "qris_dana" | "qris_gopay",
     "description": "<keterangan_singkat>",
     "date": "YYYY-MM-DD"
   }
   <<<END_TRANSACTION_RECORD>>>
   - Sistem backend akan membaca blok ini dan langsung menyimpannya ke database warteg!

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

      // Cek apakah ada instruksi pencatatan transaksi otomatis (<<<TRANSACTION_RECORD>>>)
      const recordMatch = rawResponse.match(/<<<TRANSACTION_RECORD>>>([\s\S]*?)<<<END_TRANSACTION_RECORD>>>/);
      let executedTransaction = false;

      if (recordMatch && recordMatch[1]) {
        try {
          const parsed = JSON.parse(recordMatch[1].trim());
          if (parsed.amount && parsed.description) {
            await this.transactionsRepo.create({
              type: parsed.type === 'income' ? 'income' : 'expense',
              amount: Math.abs(parseInt(parsed.amount, 10)),
              method: ['tunai_toko', 'tunai_kas_besar', 'qris_dana', 'qris_gopay'].includes(parsed.method)
                ? parsed.method
                : 'tunai_toko',
              description: parsed.description,
              date: parsed.date || new Date().toISOString().slice(0, 10),
            });
            executedTransaction = true;
          }
        } catch (e) {
          console.error('Gagal parse blok transaksi AI:', e);
        }

        // Bersihkan blok kode JSON teknis dari balasan chat agar tidak terlihat pengguna
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
  "totalAmount": <angka_nominal_total_belanja_tanpa_titik_atau_koma_integer>,
  "description": "<ringkasan_singkat_contoh_Belanja_Pasar_Bawang_Cabai_Telur>",
  "date": "<tanggal_struk_format_YYYY-MM-DD_jika_tidak_tertera_gunakan_hari_ini>",
  "suggestedType": "expense",
  "items": [
    { "name": "<nama_item>", "price": <harga_angka_integer> }
  ]
}

Aturan:
1. Targetkan total nominal rupiah akhir yang dibayarkan.
2. Deskripsi harus ringkas dan jelas khas belanja warteg (contoh: "Belanja Pasar: Bumbu & Sayur", "Belanja Beras 50kg", "Belanja Gas Elpiji 3kg").
3. Jika nominal tidak terlihat jelas, estimasikan secara wajar berdasarkan item yang terbaca.`;

    // Gunakan model yang terdaftar di konfigurasi (default: deepseek-chat atau model deepseek aktif)
    const targetModel = config.model || 'deepseek-chat';

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
      throw new Error('Gagal memproses struk: Format respons tidak valid. Coba ulangi dengan foto yang lebih terang.');
    }
  }
}
