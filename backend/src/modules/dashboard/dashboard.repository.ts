import { prisma } from '../../core/database.js';

export interface DashboardSummary {
  weeklyIncome: number;
  weeklyExpense: number;
  // Kas Tunai
  cashToko: number;
  cashBesar: number;
  totalCash: number;
  // Kas QRIS
  qrisDana: number;
  qrisGopay: number;
  totalQris: number;
  // Total Semua
  totalBalance: number;
}

export class DashboardRepository {
  async getSummary(): Promise<DashboardSummary> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    // Transaksi 7 hari terakhir untuk arus masuk & keluar mingguan
    const weeklyTransactions = await prisma.transaction.findMany({
      where: {
        date: { gte: oneWeekAgo },
      },
    });

    let weeklyIncome = 0;
    let weeklyExpense = 0;

    for (const trx of weeklyTransactions) {
      if (trx.type === 'income') {
        weeklyIncome += trx.amount;
      } else if (trx.type === 'expense') {
        weeklyExpense += trx.amount;
      }
    }

    // Hitung posisi saldo terkini untuk tiap sub-kantong
    const allTransactions = await prisma.transaction.findMany();

    let cashToko = 0;
    let cashBesar = 0;
    let qrisDana = 0;
    let qrisGopay = 0;

    for (const trx of allTransactions) {
      const isPositive = trx.type === 'income' || trx.type === 'transfer_in';
      const multiplier = isPositive ? 1 : -1;
      const net = trx.amount * multiplier;

      switch (trx.method) {
        case 'tunai_toko':
        case 'tunai': // backward compatibility data lama
          cashToko += net;
          break;
        case 'tunai_kas_besar':
          cashBesar += net;
          break;
        case 'qris_dana':
        case 'qris': // backward compatibility data lama
          qrisDana += net;
          break;
        case 'qris_gopay':
          qrisGopay += net;
          break;
        default:
          cashToko += net;
      }
    }

    const totalCash = cashToko + cashBesar;
    const totalQris = qrisDana + qrisGopay;

    return {
      weeklyIncome,
      weeklyExpense,
      cashToko,
      cashBesar,
      totalCash,
      qrisDana,
      qrisGopay,
      totalQris,
      totalBalance: totalCash + totalQris,
    };
  }

  async getRecentTransactions(limit = 10) {
    return prisma.transaction.findMany({
      orderBy: { date: 'desc' },
      take: limit,
    });
  }
}
