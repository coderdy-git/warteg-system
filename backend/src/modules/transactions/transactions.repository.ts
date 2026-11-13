import { prisma } from '../../core/database.js';
import { CreateTransactionDto, UpdateTransactionDto, TransferFundsDto } from './transactions.dto.js';

const METHOD_NAMES: Record<string, string> = {
  tunai_toko: 'Kas di Toko',
  tunai_kas_besar: 'Kas Besar',
  qris_dana: 'QRIS DANA',
  qris_gopay: 'QRIS GoPay',
};

export class TransactionsRepository {
  async findAll(type?: string, method?: string) {
    const where: any = {};
    if (type && ['income', 'expense', 'transfer_in', 'transfer_out'].includes(type)) {
      where.type = type;
    }
    if (method && ['tunai_toko', 'tunai_kas_besar', 'qris_dana', 'qris_gopay'].includes(method)) {
      where.method = method;
    }

    return prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async create(data: CreateTransactionDto) {
    return prisma.transaction.create({
      data: {
        type: data.type,
        amount: data.amount,
        method: data.method,
        description: data.description,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
  }

  async update(id: string, data: UpdateTransactionDto) {
    return prisma.transaction.update({
      where: { id },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.method && { method: data.method }),
        ...(data.description && { description: data.description }),
        ...(data.date && { date: new Date(data.date) }),
      },
    });
  }

  async transfer(dto: TransferFundsDto) {
    if (dto.fromMethod === dto.toMethod) {
      throw new Error('Pos kas asal dan tujuan tidak boleh sama');
    }

    const trxDate = dto.date ? new Date(dto.date) : new Date();
    const fromLabel = METHOD_NAMES[dto.fromMethod] || dto.fromMethod;
    const toLabel = METHOD_NAMES[dto.toMethod] || dto.toMethod;
    const note = dto.description ? ` - ${dto.description}` : '';

    return prisma.$transaction([
      prisma.transaction.create({
        data: {
          type: 'transfer_out',
          amount: dto.amount,
          method: dto.fromMethod,
          description: `[Pindah Kas ke ${toLabel}]${note}`,
          date: trxDate,
        },
      }),
      prisma.transaction.create({
        data: {
          type: 'transfer_in',
          amount: dto.amount,
          method: dto.toMethod,
          description: `[Terima Pindah Kas dari ${fromLabel}]${note}`,
          date: trxDate,
        },
      }),
    ]);
  }

  async delete(id: string) {
    return prisma.transaction.delete({
      where: { id },
    });
  }
}
