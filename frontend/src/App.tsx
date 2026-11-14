import { useEffect, useState } from 'react';
import { api } from './lib/api';
import type { DashboardSummary, TransactionItem, AuthUser } from './lib/api';
import { useNotification } from './components/ui/NotificationProvider';
import { LoginPage } from './features/auth/LoginPage';
import { TransactionsPage, METHOD_LABELS } from './features/transactions/TransactionsPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { AIChatDrawer } from './features/ai/AIChatDrawer';
import { MobileBottomNav } from './components/ui/MobileBottomNav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartPie, 
  faReceipt, 
  faFileInvoiceDollar, 
  faGear, 
  faWandMagicSparkles, 
  faArrowTrendUp, 
  faArrowTrendDown, 
  faRotate, 
  faRightFromBracket,
  faUserTie,
  faChevronRight,
  faArrowRight,
  faStore,
  faVault,
  faQrcode,
  faMobileScreenButton,
  faArrowRightArrowLeft,
  faBars,
  faXmark
} from '@fortawesome/free-solid-svg-icons';

export function App() {
  const { showToast, confirm } = useNotification();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('wsystem_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports' | 'settings'>('dashboard');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchData = async (isManualClick = false) => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [sumData, trxData] = await Promise.all([
        api.getDashboardSummary(),
        api.getAllTransactions(),
      ]);
      setSummary(sumData);
      setTransactions(trxData);
      if (isManualClick) {
        showToast('success', 'Data Diperbarui', 'Data kas dan transaksi terkini berhasil dimuat.');
      }
    } catch (err: any) {
      console.error('Gagal mengambil data:', err);
      if (err.message && err.message.toLowerCase().includes('sesi')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData(false);
    }
  }, [currentUser]);

  const handleLogout = () => {
    confirm({
      title: 'Konfirmasi Keluar',
      message: 'Apakah Anda yakin ingin keluar dari sistem dashboard Warteg?',
      confirmLabel: 'Ya, Keluar',
      isDanger: true,
      onConfirm: () => {
        localStorage.removeItem('wsystem_token');
        localStorage.removeItem('wsystem_user');
        setCurrentUser(null);
        showToast('info', 'Sampai Jumpa', 'Anda telah berhasil keluar dari sistem.');
      },
    });
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  const currentEnv = String(import.meta.env.VITE_APP_ENV || 'development').toLowerCase();
  const envBadgeStyles: Record<string, string> = {
    development: 'bg-amber-50/80 text-amber-700 border-amber-200/60',
    staging: 'bg-blue-50/80 text-blue-700 border-blue-200/60',
    production: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60',
  };
  const activeBadgeStyle = envBadgeStyles[currentEnv] || 'bg-slate-50 text-slate-700 border-slate-200';

  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row text-slate-900 font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Mobile Top Header (Hanya tampil di layar kecil / Smartphone) */}
      <div className="md:hidden h-14 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            <FontAwesomeIcon icon={isMobileMenuOpen ? faXmark : faBars} className="text-base" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center text-white font-extrabold text-xs shadow-xs font-jakarta">
            W
          </div>
          <span className="font-bold text-slate-900 text-sm tracking-tight font-jakarta">
            WSystem
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${activeBadgeStyle}`}
          >
            {currentEnv === 'development' ? 'DEV' : currentEnv}
          </span>
          <button
            onClick={() => setIsAIChatOpen(true)}
            className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
            title="Tanya AI"
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" />
          </button>
        </div>
      </div>

      {/* Overlay latar belakang saat sidebar mobile terbuka */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Navigasi Kiri (Desktop Sticky + Mobile Drawer Slide-in) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/70 flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:h-screen md:sticky md:top-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs font-jakarta">
                W
              </div>
              <span className="font-bold text-slate-900 text-base tracking-tight font-jakarta">
                WSystem
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${activeBadgeStyle}`}
              >
                {currentEnv === 'development' ? 'DEV' : currentEnv}
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>
          </div>

          {/* Navigation Links (FontAwesome Icons) */}
          <nav className="p-3.5 space-y-1.5">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-orange-50/80 text-orange-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <FontAwesomeIcon icon={faChartPie} className="w-4 text-orange-600 text-sm" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('transactions');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'transactions'
                  ? 'bg-orange-50/80 text-orange-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <FontAwesomeIcon icon={faReceipt} className="w-4 text-slate-400 text-sm" />
              <span>Transaksi Kas</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('reports');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'reports'
                  ? 'bg-orange-50/80 text-orange-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <FontAwesomeIcon icon={faFileInvoiceDollar} className="w-4 text-slate-400 text-sm" />
              <span>Laporan Keuangan</span>
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar: AI Trigger, Settings & User Profile */}
        <div className="p-3.5 border-t border-slate-100 space-y-2.5">
          <button
            onClick={() => {
              setIsAIChatOpen(true);
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-orange-50/60 text-orange-800 hover:bg-orange-100/70 border border-orange-200/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faWandMagicSparkles} className="text-orange-600 text-sm" />
              <span>Asisten AI</span>
            </div>
            <FontAwesomeIcon icon={faChevronRight} className="text-orange-400 text-xs" />
          </button>

          <button
            onClick={() => {
              setActiveTab('settings');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FontAwesomeIcon icon={faGear} className="w-4 text-slate-400 text-sm" />
            <span>Pengaturan Sistem</span>
          </button>

          {/* User Profile Info */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                <FontAwesomeIcon icon={faUserTie} className="text-xs" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">{currentUser.name}</p>
                <p className="text-[11px] text-slate-400 capitalize">{currentUser.role}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Keluar"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="text-sm" />
            </button>
          </div>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 md:pb-0">
        <main className="max-w-6xl w-full mx-auto px-3 sm:px-6 md:px-8 py-3.5 sm:py-7 space-y-4 sm:space-y-6">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              {/* ============================================================ */}
              {/* MOBILE FIRST UI: Tampilan Khusus Smartphone (md:hidden)       */}
              {/* ============================================================ */}
              <div className="md:hidden space-y-4">
                {/* 1. Header Saldo Hero Card */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between text-slate-300 text-xs mb-1">
                    <span className="font-medium tracking-wide">Total Saldo Kas</span>
                    <button
                      onClick={() => fetchData(true)}
                      disabled={loading}
                      className="p-1 rounded-full text-slate-300 hover:text-white transition-colors"
                      title="Refresh Saldo"
                    >
                      <FontAwesomeIcon icon={faRotate} className={`text-xs ${loading ? 'animate-spin text-orange-400' : ''}`} />
                    </button>
                  </div>

                  <div className="text-2xl font-black tracking-tight font-jakarta text-white">
                    {formatRupiah(summary?.totalBalance || 0)}
                  </div>

                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10 text-[11px] text-slate-300">
                    <div className="flex-1">
                      <span className="text-slate-400 block text-[9px] uppercase font-semibold">Tunai</span>
                      <span className="font-bold text-white">{formatRupiah(summary?.totalCash || 0)}</span>
                    </div>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="flex-1">
                      <span className="text-slate-400 block text-[9px] uppercase font-semibold">QRIS</span>
                      <span className="font-bold text-white">{formatRupiah(summary?.totalQris || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Mobile Quick Action Hub */}
                <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm mb-1.5 shadow-2xs">
                      <FontAwesomeIcon icon={faArrowTrendUp} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 leading-tight">Pemasukan</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-sm mb-1.5 shadow-2xs">
                      <FontAwesomeIcon icon={faArrowTrendDown} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 leading-tight">Pengeluaran</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm mb-1.5 shadow-2xs">
                      <FontAwesomeIcon icon={faArrowRightArrowLeft} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 leading-tight">Pindah Kas</span>
                  </button>

                  <button
                    onClick={() => setIsAIChatOpen(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-sm mb-1.5 shadow-2xs">
                      <FontAwesomeIcon icon={faWandMagicSparkles} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 leading-tight">Tanya AI</span>
                  </button>
                </div>

                {/* 3. Kantong Kas Grid (2 Kolom E-Wallet Card) */}
                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-bold text-slate-900 font-jakarta uppercase tracking-wider">Kantong Kas</span>
                    <span className="text-[10px] text-slate-400 font-medium">4 Pos Likuiditas</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Toko */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                        <FontAwesomeIcon icon={faStore} className="text-xs" />
                        <span className="text-[10px] font-bold text-slate-600 truncate">Kas Toko (Laci)</span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 font-jakarta">
                        {formatRupiah(summary?.cashToko || 0)}
                      </div>
                    </div>

                    {/* Kas Besar */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                        <FontAwesomeIcon icon={faVault} className="text-xs" />
                        <span className="text-[10px] font-bold text-slate-600 truncate">Kas Besar</span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 font-jakarta">
                        {formatRupiah(summary?.cashBesar || 0)}
                      </div>
                    </div>

                    {/* QRIS DANA */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-sky-600 mb-1">
                        <FontAwesomeIcon icon={faQrcode} className="text-xs" />
                        <span className="text-[10px] font-bold text-slate-600 truncate">QRIS DANA</span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 font-jakarta">
                        {formatRupiah(summary?.qrisDana || 0)}
                      </div>
                    </div>

                    {/* QRIS GoPay */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                        <FontAwesomeIcon icon={faMobileScreenButton} className="text-xs" />
                        <span className="text-[10px] font-bold text-slate-600 truncate">QRIS GoPay</span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 font-jakarta">
                        {formatRupiah(summary?.qrisGopay || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Performa Minggu Ini (2 Mini Banner Mobile) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-emerald-50/70 border border-emerald-200/60 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Masuk (7 Hari)</span>
                    <div className="text-sm font-extrabold text-emerald-700 font-jakarta mt-0.5">
                      {formatRupiah(summary?.weeklyIncome || 0)}
                    </div>
                  </div>
                  <div className="bg-rose-50/70 border border-rose-200/60 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block">Keluar (7 Hari)</span>
                    <div className="text-sm font-extrabold text-rose-700 font-jakarta mt-0.5">
                      {formatRupiah(summary?.weeklyExpense || 0)}
                    </div>
                  </div>
                </div>

                {/* 5. Transaksi Terkini (Mobile Feed Card List) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                  <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 font-jakarta">Transaksi Terkini</span>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-[11px] font-bold text-orange-600 flex items-center gap-1"
                    >
                      <span>Lihat Semua</span>
                      <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {transactions.slice(0, 5).map((trx) => {
                      const isIncome = trx.type === 'income' || trx.type === 'transfer_in';
                      const methodMeta = METHOD_LABELS[trx.method] || {
                        name: trx.method,
                        tag: trx.method,
                        badge: 'bg-slate-100 text-slate-600',
                      };

                      return (
                        <div key={trx.id} className="p-3 flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                                isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}
                            >
                              <FontAwesomeIcon icon={isIncome ? faArrowTrendUp : faArrowTrendDown} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{trx.description}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${methodMeta.badge}`}>
                                  {methodMeta.tag}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(trx.date).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div
                            className={`text-xs font-extrabold font-jakarta shrink-0 ${
                              isIncome ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isIncome ? '+' : '-'}{formatRupiah(trx.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* DESKTOP UI: Tampilan Asli PC/Laptop (hidden md:block)         */}
              {/* SAMA SEKALI TIDAK DIUBAH                                     */}
              {/* ============================================================ */}
              <div className="hidden md:block space-y-6">
                {/* Header Halaman */}
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight font-jakarta">
                      Dashboard Keuangan
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monitoring posisi likuiditas kas dan arus perputaran modal warteg.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setIsAIChatOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[11px]" />
                      <span>Tanya AI</span>
                    </button>

                    <button
                      onClick={() => fetchData(true)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/90 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-all disabled:opacity-60"
                    >
                      <FontAwesomeIcon icon={faRotate} className={`text-[11px] ${loading ? 'animate-spin text-orange-600' : 'text-slate-400'}`} />
                      <span>Perbarui</span>
                    </button>
                  </div>
                </div>

                {/* CARD 1: FINANCIAL OVERVIEW PANEL (FONTAWESOME ICONS) */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Total Saldo Kas Warteg
                      </span>
                      <div className="text-2xl font-extrabold text-slate-900 tracking-tight font-jakarta mt-0.5">
                        {formatRupiah(summary?.totalBalance || 0)}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-slate-600 font-medium">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Subtotal Tunai</span>
                        <span className="font-semibold text-slate-800">{formatRupiah(summary?.totalCash || 0)}</span>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Subtotal QRIS</span>
                        <span className="font-semibold text-slate-800">{formatRupiah(summary?.totalQris || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Kolom Rincian Sub-Kantong */}
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
                    {/* Kas Toko */}
                    <div className="p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <FontAwesomeIcon icon={faStore} className="text-blue-600 text-xs" />
                        <span className="text-[11px] font-semibold text-slate-700">Kas di Toko (Laci)</span>
                      </div>
                      <div className="text-base font-bold text-slate-800 font-jakarta mt-1.5">
                        {formatRupiah(summary?.cashToko || 0)}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Uang fisik laci kasir</span>
                    </div>

                    {/* Kas Besar */}
                    <div className="p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <FontAwesomeIcon icon={faVault} className="text-indigo-600 text-xs" />
                        <span className="text-[11px] font-semibold text-slate-700">Kas Besar (Brankas)</span>
                      </div>
                      <div className="text-base font-bold text-slate-800 font-jakarta mt-1.5">
                        {formatRupiah(summary?.cashBesar || 0)}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Cadangan kas / modal</span>
                    </div>

                    {/* QRIS DANA */}
                    <div className="p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <FontAwesomeIcon icon={faQrcode} className="text-sky-600 text-xs" />
                        <span className="text-[11px] font-semibold text-slate-700">QRIS DANA</span>
                      </div>
                      <div className="text-base font-bold text-slate-800 font-jakarta mt-1.5">
                        {formatRupiah(summary?.qrisDana || 0)}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Saldo akun DANA</span>
                    </div>

                    {/* QRIS GoPay */}
                    <div className="p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <FontAwesomeIcon icon={faMobileScreenButton} className="text-emerald-600 text-xs" />
                        <span className="text-[11px] font-semibold text-slate-700">QRIS GoPay</span>
                      </div>
                      <div className="text-base font-bold text-slate-800 font-jakarta mt-1.5">
                        {formatRupiah(summary?.qrisGopay || 0)}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Saldo GoPay Merchant</span>
                    </div>
                  </div>
                </div>

                {/* CARD 2: PERFORMA MINGGU INI (FONTAWESOME TREND ICONS) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pemasukan */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Pemasukan (7 Hari Terakhir)
                      </span>
                      <div className="text-xl font-extrabold text-emerald-600 font-jakarta mt-1">
                        {formatRupiah(summary?.weeklyIncome || 0)}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Akumulasi uang masuk warteg</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                      <FontAwesomeIcon icon={faArrowTrendUp} />
                    </div>
                  </div>

                  {/* Pengeluaran */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Pengeluaran (7 Hari Terakhir)
                      </span>
                      <div className="text-xl font-extrabold text-rose-600 font-jakarta mt-1">
                        {formatRupiah(summary?.weeklyExpense || 0)}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Belanja bahan baku & operasional</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-sm">
                      <FontAwesomeIcon icon={faArrowTrendDown} />
                    </div>
                  </div>
                </div>

                {/* CARD 3: TABEL MUTASI */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-slate-400 text-xs" />
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm font-jakarta">Arus Transaksi Terkini</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Catatan 5 mutasi kas masuk dan keluar terakhir</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 transition-colors"
                    >
                      <span>Lihat Semua</span>
                      <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <th className="py-3 px-5">Tanggal</th>
                          <th className="py-3 px-5">Keterangan</th>
                          <th className="py-3 px-5">Pos Kas</th>
                          <th className="py-3 px-5 text-right">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.slice(0, 5).map((trx) => {
                          const isIncome = trx.type === 'income';
                          const methodMeta = METHOD_LABELS[trx.method] || {
                            name: trx.method,
                            tag: trx.method,
                            badge: 'bg-slate-100 text-slate-600',
                          };

                          return (
                            <tr key={trx.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap">
                                {new Date(trx.date).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="py-3.5 px-5 font-medium text-slate-800">
                                {trx.description}
                              </td>
                              <td className="py-3.5 px-5">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${methodMeta.badge}`}
                                >
                                  {methodMeta.name}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-right font-bold whitespace-nowrap font-jakarta">
                                <span
                                  className={`inline-flex items-center gap-1 ${
                                    isIncome ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {isIncome ? (
                                    <FontAwesomeIcon icon={faArrowTrendUp} className="text-[10px]" />
                                  ) : (
                                    <FontAwesomeIcon icon={faArrowTrendDown} className="text-[10px]" />
                                  )}
                                  {formatRupiah(trx.amount)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: TRANSAKSI KAS */}
          {activeTab === 'transactions' && (
            <TransactionsPage
              transactions={transactions}
              onRefresh={fetchData}
              formatRupiah={formatRupiah}
            />
          )}

          {/* TAB 3: LAPORAN KEUANGAN */}
          {activeTab === 'reports' && (
            <ReportsPage formatRupiah={formatRupiah} />
          )}

          {/* TAB 4: PENGATURAN AI */}
          {activeTab === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Tab Bar Khusus Smartphone) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAI={() => setIsAIChatOpen(true)}
      />

      {/* Panel Asisten AI */}
      <AIChatDrawer
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        onOpenSettings={() => {
          setIsAIChatOpen(false);
          setActiveTab('settings');
        }}
      />
    </div>
  );
}

export default App;
