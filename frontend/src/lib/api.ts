export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface DashboardSummary {
  weeklyIncome: number;
  weeklyExpense: number;
  cashToko: number;
  cashBesar: number;
  totalCash: number;
  qrisDana: number;
  qrisGopay: number;
  totalQris: number;
  totalBalance: number;
}

export type PaymentMethod = 'tunai_toko' | 'tunai_kas_besar' | 'qris_dana' | 'qris_gopay';
export type TransactionType = 'income' | 'expense' | 'transfer_in' | 'transfer_out';

export interface TransactionItem {
  id: string;
  type: TransactionType;
  amount: number;
  method: PaymentMethod;
  description: string;
  date: string;
}

export interface CreateTransactionPayload {
  type: 'income' | 'expense';
  amount: number;
  method: PaymentMethod;
  description: string;
  date?: string;
}

export interface UpdateTransactionPayload {
  type?: 'income' | 'expense';
  amount?: number;
  method?: PaymentMethod;
  description?: string;
  date?: string;
}

export interface TransferFundsPayload {
  fromMethod: PaymentMethod;
  toMethod: PaymentMethod;
  amount: number;
  description?: string;
  date?: string;
}

export interface FinancialReport {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  cashTokoNet: number;
  cashBesarNet: number;
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

export interface ReceiptScanResult {
  totalAmount: number;
  description: string;
  date: string;
  suggestedType: 'expense' | 'income';
  items?: { name: string; price: number }[];
}

export interface AISettingsData {
  baseUrl: string;
  apiKey: string;
  maskedApiKey: string;
  hasApiKey: boolean;
  model: string;
  isConfigured: boolean;
  visionBaseUrl?: string;
  visionModel?: string;
  maskedVisionApiKey?: string;
  hasVisionApiKey?: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('wsystem_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  async login(payload: { username: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Login gagal');
    return json.data;
  },

  async createUser(payload: { username: string; password: string; name: string; role: 'owner' | 'kasir' }): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal membuat akun');
    return json.data;
  },

  async changePassword(payload: { oldPassword: string; newPassword: string }): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal mengganti password');
  },

  async getProfile(): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Sesi tidak valid');
    return json.data;
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary`, {
      headers: { ...getAuthHeader() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal memuat ringkasan');
    return json.data;
  },

  async getAllTransactions(type?: string, method?: string): Promise<TransactionItem[]> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (method) params.append('method', method);
    const res = await fetch(`${API_BASE}/transactions?${params.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal memuat transaksi');
    return json.data;
  },

  async createTransaction(payload: CreateTransactionPayload): Promise<TransactionItem> {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal menyimpan transaksi');
    return json.data;
  },

  async updateTransaction(id: string, payload: UpdateTransactionPayload): Promise<TransactionItem> {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal memperbarui transaksi');
    return json.data;
  },

  async transferFunds(payload: TransferFundsPayload): Promise<void> {
    const res = await fetch(`${API_BASE}/transactions/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal memproses pindah kas');
  },

  async deleteTransaction(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Gagal menghapus transaksi');
  },

  async getReport(startDate?: string, endDate?: string): Promise<FinancialReport> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const res = await fetch(`${API_BASE}/reports?${params.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal memuat laporan');
    return json.data;
  },

  async getAISettings(): Promise<AISettingsData> {
    const res = await fetch(`${API_BASE}/settings/ai`, {
      headers: { ...getAuthHeader() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal memuat pengaturan');
    return json.data;
  },

  async saveAISettings(data: { baseUrl: string; apiKey: string; model: string }): Promise<void> {
    const res = await fetch(`${API_BASE}/settings/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal menyimpan pengaturan');
  },

  async fetchModels(baseUrl?: string, apiKey?: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/settings/ai/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ baseUrl, apiKey }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal mengambil daftar model');
    return json.data;
  },

  async sendChatMessage(
    messages: { role: 'user' | 'assistant'; content: string; imageBase64?: string; images?: string[] }[]
  ): Promise<string> {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ messages }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.error('Server non-JSON response:', text.slice(0, 300));
      if (res.status === 413) {
        throw new Error('Ukuran foto terlalu besar untuk server. Coba kirim 1 foto terlebih dahulu.');
      }
      if (res.status === 504 || res.status === 408) {
        throw new Error('Waktu pemrosesan AI habis (timeout). Coba gunakan foto dengan resolusi lebih kecil.');
      }
      if (res.status === 401) {
        throw new Error('Sesi login telah berakhir. Silakan logout lalu login kembali.');
      }
      throw new Error(`Server mengembalikan respon (${res.status}): Serverless function error atau rute tidak ditemukan.`);
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal berkomunikasi dengan AI');
    return json.data;
  },

  async scanReceipt(imageBase64: string): Promise<ReceiptScanResult> {
    const res = await fetch(`${API_BASE}/ai/scan-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ imageBase64 }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.error('Server non-JSON response:', text.slice(0, 300));
      if (res.status === 413) {
        throw new Error('Ukuran foto struk terlalu besar. Coba ambil foto lebih dekat atau kirim 1 foto.');
      }
      throw new Error(`Server mengembalikan status (${res.status}): Format tidak valid.`);
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Gagal menganalisis foto struk');
    return json.data;
  },
};
