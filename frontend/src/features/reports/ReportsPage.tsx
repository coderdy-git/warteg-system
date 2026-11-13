import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { FinancialReport } from '../../lib/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarDay, 
  faArrowTrendUp, 
  faArrowTrendDown, 
  faScaleBalanced, 
  faStore, 
  faVault, 
  faMobileScreenButton,
  faQrcode,
  faTableList,
  faFilter,
  faDownload
} from '@fortawesome/free-solid-svg-icons';

interface ReportsPageProps {
  formatRupiah: (val: number) => string;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ formatRupiah }) => {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await api.getReport(startDate || undefined, endDate || undefined);
      setReport(data);
    } catch (err) {
      console.error('Gagal mengambil laporan keuangan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleExportCSV = () => {
    if (!report || !report.dailyBreakdown.length) return;
    const headers = ['Tanggal', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Surplus/Defisit (Rp)'];
    const rows = report.dailyBreakdown.map((r) => [r.date, r.income, r.expense, r.net]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Keuangan_WSystem_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Laporan Keuangan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-jakarta">
            Laporan Keuangan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis laba rugi bersih serta rekap aliran kas per pos akun.
          </p>
        </div>

        {/* Date Filter Bar Elegan */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
          <FontAwesomeIcon icon={faCalendarDay} className="text-slate-400 text-xs" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-transparent outline-hidden cursor-pointer"
          />
          <span className="text-xs text-slate-400">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-transparent outline-hidden cursor-pointer"
          />
          <button
            onClick={fetchReport}
            className="ml-1 px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors flex items-center gap-1.5"
          >
            <FontAwesomeIcon icon={faFilter} className="text-[10px]" />
            <span>Terapkan</span>
          </button>
        </div>
      </div>

      {/* CARD 1: RINGKASAN LABA BERSIH (3 PILAR MINIMALIS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pemasukan */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Pemasukan
            </span>
            <div className="text-xl font-extrabold text-emerald-600 font-jakarta mt-1">
              {formatRupiah(report?.totalIncome || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{report?.transactionsCount || 0} transaksi tercatat</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
            <FontAwesomeIcon icon={faArrowTrendUp} />
          </div>
        </div>

        {/* Pengeluaran */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Pengeluaran
            </span>
            <div className="text-xl font-extrabold text-rose-600 font-jakarta mt-1">
              {formatRupiah(report?.totalExpense || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Belanja bahan & operasional</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-sm">
            <FontAwesomeIcon icon={faArrowTrendDown} />
          </div>
        </div>

        {/* Laba Bersih */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Laba Bersih (Net Profit)
            </span>
            <div
              className={`text-xl font-extrabold font-jakarta mt-1 ${
                (report?.netProfit || 0) >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {formatRupiah(report?.netProfit || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Surplus kas bersih periode ini</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
            <FontAwesomeIcon icon={faScaleBalanced} />
          </div>
        </div>
      </div>

      {/* CARD 2: PANEL DISTRIBUSI ALIRAN KAS (TERPADU SEPERTI DASHBOARD) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-jakarta">
              Arus Kas Bersih Berdasarkan Pos Akun
            </h3>
            <p className="text-[11px] text-slate-400">Total akumulasi mutasi yang masuk & keluar di masing-masing kantong</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
          <div className="p-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-2 text-slate-500">
              <FontAwesomeIcon icon={faStore} className="text-blue-600 text-xs" />
              <span className="text-[11px] font-semibold">Kas di Toko (Laci)</span>
            </div>
            <div className="text-base font-bold text-slate-800 font-jakarta mt-1.5">
              {formatRupiah(report?.cashTokoNet || 0)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Arus kas tunai harian</span>
          </div>

          <div className="p-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-2 text-slate-500">
              <FontAwesomeIcon icon={faVault} className="text-indigo-600 text-xs" />
              <span className="text-[11px] font-semibold">Kas Besar (Brankas)</span>
            </div>
            <div className="text-base font-bold text-slate-800 font-jakarta mt-1.5">
              {formatRupiah(report?.cashBesarNet || 0)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Arus cadangan modal</span>
          </div>

          <div className="p-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-2 text-slate-500">
              <FontAwesomeIcon icon={faQrcode} className="text-sky-600 text-xs" />
              <span className="text-[11px] font-semibold">QRIS DANA</span>
            </div>
            <div className="text-base font-bold text-slate-800 font-jakarta mt-1.5">
              {formatRupiah(report?.qrisDanaNet || 0)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Arus digital akun DANA</span>
          </div>

          <div className="p-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-2 text-slate-500">
              <FontAwesomeIcon icon={faMobileScreenButton} className="text-emerald-600 text-xs" />
              <span className="text-[11px] font-semibold">QRIS GoPay</span>
            </div>
            <div className="text-base font-bold text-slate-800 font-jakarta mt-1.5">
              {formatRupiah(report?.qrisGopayNet || 0)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Arus GoPay Merchant</span>
          </div>
        </div>
      </div>

      {/* CARD 3: TABEL REKAP ARUS KAS PER HARI */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTableList} className="text-slate-400 text-xs" />
            <h3 className="font-bold text-slate-900 text-sm font-jakarta">Rincian Per Tanggal</h3>
          </div>
          {report?.dailyBreakdown && report.dailyBreakdown.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <FontAwesomeIcon icon={faDownload} className="text-[10px]" />
              <span>Unduh CSV</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-3 px-5">Tanggal</th>
                <th className="py-3 px-5 text-right">Pemasukan</th>
                <th className="py-3 px-5 text-right">Pengeluaran</th>
                <th className="py-3 px-5 text-right">Surplus / Defisit Harian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">
                    Memuat data laporan...
                  </td>
                </tr>
              ) : !report?.dailyBreakdown || report.dailyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">
                    Tidak ada transaksi pada periode yang dipilih.
                  </td>
                </tr>
              ) : (
                report.dailyBreakdown.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 text-slate-700 font-medium whitespace-nowrap">
                      {new Date(row.date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right font-semibold text-emerald-600 font-jakarta">
                      {formatRupiah(row.income)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-semibold text-rose-600 font-jakarta">
                      {formatRupiah(row.expense)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold whitespace-nowrap font-jakarta">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.net >= 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {formatRupiah(row.net)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
