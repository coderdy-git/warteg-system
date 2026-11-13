import { z } from 'zod';

export const PaymentMethodEnum = z.enum([
  'tunai_toko',
  'tunai_kas_besar',
  'qris_dana',
  'qris_gopay',
]);

export const CreateTransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer_in', 'transfer_out']),
  amount: z.number().int().positive('Jumlah uang harus positif'),
  method: PaymentMethodEnum,
  description: z.string().min(3, 'Keterangan minimal 3 karakter'),
  date: z.string().optional(),
});

export const UpdateTransactionSchema = CreateTransactionSchema.partial();

export const TransferFundsSchema = z.object({
  fromMethod: PaymentMethodEnum,
  toMethod: PaymentMethodEnum,
  amount: z.number().int().positive('Jumlah transfer harus positif'),
  description: z.string().min(3, 'Keterangan transfer minimal 3 karakter').optional(),
  date: z.string().optional(),
});

export type CreateTransactionDto = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionDto = z.infer<typeof UpdateTransactionSchema>;
export type TransferFundsDto = z.infer<typeof TransferFundsSchema>;
export type PaymentMethodType = z.infer<typeof PaymentMethodEnum>;
