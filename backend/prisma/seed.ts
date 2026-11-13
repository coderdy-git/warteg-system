import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data transaksi keuangan warteg (Toko, Kas Besar, Dana, GoPay)...');

  await prisma.transaction.deleteMany();

  const today = new Date();

  const sampleTransactions = [
    {
      type: 'income',
      amount: 1450000,
      method: 'tunai_toko',
      description: 'Pendapatan Warteg Shift Siang (Laci Toko)',
      date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'income',
      amount: 870000,
      method: 'qris_dana',
      description: 'Penerimaan QRIS via DANA',
      date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'income',
      amount: 630000,
      method: 'qris_gopay',
      description: 'Penerimaan QRIS via GoPay Merchant',
      date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'expense',
      amount: 450000,
      method: 'tunai_toko',
      description: 'Belanja Sayur Mayur & Bumbu di Toko',
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'income',
      amount: 2500000,
      method: 'tunai_kas_besar',
      description: 'Penyimpanan Hasil Omset Mingguan ke Kas Besar',
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'expense',
      amount: 350000,
      method: 'qris_dana',
      description: 'Bayar Gas Elpiji & Galon via Saldo DANA',
      date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'expense',
      amount: 500000,
      method: 'tunai_kas_besar',
      description: 'Ambil Kas Besar untuk Cadangan Stok Beras 2 Karung',
      date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const trx of sampleTransactions) {
    await prisma.transaction.create({ data: trx });
  }

  console.log('Seeding selesai!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
