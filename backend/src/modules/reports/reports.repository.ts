import { prisma } from '../../core/database.js';

export interface FinancialReport {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  // Detail Kas Tunai
  cashTokoNet: number;
  cashBesarNet: number;
  // Detail QRIS
  qrisDanaNet: number;
  qrisGopayNet: number;
  transactionsCount: number;
  dailyBreakdown: {
    date: string;
    income: number;
    expense: number;
    net: number;
  }[];
}

export class ReportsRepository {
  async getReport(startDate?: string, endDate?: string): Promise<FinancialReport> {
    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const list = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let cashTokoNet = 0;
    let cashBesarNet = 0;
    let qrisDanaNet = 0;
    let qrisGopayNet = 0;

    const dailyMap: { [key: string]: { income: number; expense: number } } = {};

    for (const trx of list) {
      const dateKey = trx.date.toISOString().slice(0, 10);
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { income: 0, expense: 0 };
      }

      const isPositive = trx.type === 'income' || trx.type === 'transfer_in';
      const multiplier = isPositive ? 1 : -1;
      const net = trx.amount * multiplier;

      if (trx.type === 'income') {
        totalIncome += trx.amount;
        dailyMap[dateKey].income += trx.amount;
      } else if (trx.type === 'expense') {
        totalExpense += trx.amount;
        dailyMap[dateKey].expense += trx.amount;
      }

      switch (trx.method) {
        case 'tunai_toko':
        case 'tunai':
          cashTokoNet += net;
          break;
        case 'tunai_kas_besar':
          cashBesarNet += net;
          break;
        case 'qris_dana':
        case 'qris':
          qrisDanaNet += net;
          break;
        case 'qris_gopay':
          qrisGopayNet += net;
          break;
      }
    }

    const dailyBreakdown = Object.keys(dailyMap).map((date) => ({
      date,
      income: dailyMap[date].income,
      expense: dailyMap[date].expense,
      net: dailyMap[date].income - dailyMap[date].expense,
    }));

    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      cashTokoNet,
      cashBesarNet,
      qrisDanaNet,
      qrisGopayNet,
      transactionsCount: list.length,
      dailyBreakdown,
    };
  }
}
