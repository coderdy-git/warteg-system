import React, { useState, useRef } from 'react';
import { api } from '../../lib/api';
import type { TransactionItem, CreateTransactionPayload, PaymentMethod, ReceiptScanResult } from '../../lib/api';
import { useNotification } from '../../components/ui/NotificationProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrashCan,
  faPenToSquare,
  faArrowRightArrowLeft,
  faFilter,
  faArrowTrendUp,
  faArrowTrendDown,
  faMagnifyingGlass,
  faChevronLeft,
  faChevronRight,
  faCamera,
  faImage,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';

interface TransactionsPageProps {
  transactions: TransactionItem[];
  onRefresh: () => void;
  formatRupiah: (val: number) => string;
}

export const METHOD_LABELS: Record<PaymentMethod, { name: string; tag: string; badge: string }> = {
  tunai_toko: { name: 'Kas di Toko (Laci)', tag: 'Toko', badge: 'bg-blue-50 text-blue-700' },
  tunai_kas_besar: { name: 'Kas Besar (Brankas)', tag: 'Kas Besar', badge: 'bg-indigo-50 text-indigo-700' },
  qris_dana: { name: 'QRIS DANA', tag: 'DANA', badge: 'bg-sky-50 text-sky-700' },
  qris_gopay: { name: 'QRIS GoPay', tag: 'GoPay', badge: 'bg-emerald-50 text-emerald-700' },
};

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  onRefresh,
  formatRupiah,
}) => {
  const { showToast, confirm } = useNotification();

  // Modal Transaksi Baru / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TransactionItem | null>(null);

  // Modal Pindah Kas (Transfer)
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromMethod, setFromMethod] = useState<PaymentMethod>('tunai_toko');
  const [toMethod, setToMethod] = useState<PaymentMethod>('tunai_kas_besar');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Filter & Pagination State
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 15;

  // Form State (Create / Edit)
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('tunai_toko');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vision AI OCR Scan State
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showPickerSheet, setShowPickerSheet] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'File Tidak Valid', 'Silakan unggah file foto/gambar bon belanja.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setPreviewImage(base64Data);
      setShowScanModal(true);
      setIsScanning(true);
      setScanResult(null);

      try {
        const result = await api.scanReceipt(base64Data);
        setScanResult(result);
        showToast('success', 'Struk Terbaca', `Berhasil mendeteksi nominal: ${formatRupiah(result.totalAmount)}`);
      } catch (err: any) {
        showToast('error', 'Gagal Membaca Struk', err.message || 'Coba ambil foto dengan pencahayaan lebih jelas.');
      } finally {
        setIsScanning(false);
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const applyScanResult = () => {
    if (!scanResult) return;
    setType('expense');
    setAmount(String(scanResult.totalAmount));
    setDescription(scanResult.description);
    setDate(scanResult.date);
    setShowScanModal(false);
    setShowModal(true);
    showToast('info', 'Data Diterapkan', 'Silakan pilih pos kas lalu klik Simpan.');
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setType('income');
    setAmount('');
    setMethod('tunai_toko');
    setDescription('');
    setDate(new Date().toISOString().slice(0, 10));
    setShowModal(true);
  };

  const openEditModal = (trx: TransactionItem) => {
    setEditingItem(trx);
    setType(trx.type === 'expense' || trx.type === 'transfer_out' ? 'expense' : 'income');
    setAmount(String(trx.amount));
    setMethod(trx.method);
    setDescription(trx.description);
    setDate(new Date(trx.date).toISOString().slice(0, 10));
    setShowModal(true);
  };

  const filteredList = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterMethod !== 'all' && t.method !== filterMethod) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!t.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedList = filteredList.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await api.updateTransaction(editingItem.id, {
          type,
          amount: parseInt(amount, 10),
          method,
          description,
          date,
        });
        showToast('success', 'Transaksi Diperbarui', `Data "${description}" berhasil disimpan.`);
      } else {
        const payload: CreateTransactionPayload = {
          type,
          amount: parseInt(amount, 10),
          method,
          description,
          date,
        };
        await api.createTransaction(payload);
        showToast(
          'success',
          'Transaksi Berhasil Dicatat',
          `${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} senilai ${formatRupiah(parseInt(amount, 10))} telah tersimpan.`
        );
      }
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      showToast('error', 'Gagal Menyimpan Transaksi', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromMethod === toMethod) {
      showToast('error', 'Pos Kas Tidak Valid', 'Pos kas asal dan tujuan tidak boleh sama.');
      return;
    }
    if (!transferAmount) return;

    setIsSubmitting(true);
    try {
      await api.transferFunds({
        fromMethod,
        toMethod,
        amount: parseInt(transferAmount, 10),
        description: transferDesc || undefined,
        date: transferDate,
      });
      setShowTransferModal(false);
      setTransferAmount('');
      setTransferDesc('');
      showToast(
        'success',
        'Pindah Kas Berhasil',
        `Dana ${formatRupiah(parseInt(transferAmount, 10))} berhasil dipindahkan dari ${METHOD_LABELS[fromMethod].tag} ke ${METHOD_LABELS[toMethod].tag}.`
      );
      onRefresh();
    } catch (err: any) {
      showToast('error', 'Gagal Pindah Kas', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, desc: string) => {
    confirm({
      title: 'Hapus Transaksi?',
      message: `Apakah Anda yakin ingin menghapus transaksi "${desc}"? Saldo kas akan otomatis disesuaikan kembali.`,
      confirmLabel: 'Ya, Hapus Transaksi',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api.deleteTransaction(id);
          showToast('success', 'Transaksi Dihapus', `Transaksi "${desc}" telah dihapus.`);
          onRefresh();
        } catch (err: any) {
          showToast('error', 'Gagal Menghapus', err.message || 'Terjadi kesalahan sistem.');
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman Transaksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-jakarta">Transaksi Kas</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Catat pemasukan, pengeluaran, atau pindah saldo antar pos kas warteg.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 1. Input Kamera Native HP */}
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {/* 2. Input Galeri / File Manager (Tanpa capture) */}
          <input
            type="file"
            ref={galleryInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setShowPickerSheet(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-semibold shadow-2xs transition-all active:scale-95"
            title="Foto / Upload Struk Belanja"
          >
            <FontAwesomeIcon icon={faCamera} className="text-xs" />
            <span>Scan Struk</span>
          </button>

          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-orange-600 text-[11px]" />
            <span>Pindah Kas</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-2xs transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} className="text-[11px]" />
            <span>Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
            <FontAwesomeIcon icon={faFilter} className="text-slate-400 text-[11px]" />
            <span>Filter Mutasi:</span>
          </div>

          <div className="relative flex-1 max-w-xs">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari keterangan transaksi..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-slate-50/50 focus:bg-white focus:border-orange-500 outline-hidden transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white outline-hidden"
          >
            <option value="all">Semua Tipe</option>
            <option value="income">Pemasukan (Masuk)</option>
            <option value="expense">Pengeluaran (Keluar)</option>
            <option value="transfer_in">Pindah Kas Masuk</option>
            <option value="transfer_out">Pindah Kas Keluar</option>
          </select>

          <select
            value={filterMethod}
            onChange={(e) => {
              setFilterMethod(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white outline-hidden"
          >
            <option value="all">Semua Pos Kas</option>
            <option value="tunai_toko">Kas di Toko (Laci)</option>
            <option value="tunai_kas_besar">Kas Besar (Brankas)</option>
            <option value="qris_dana">QRIS DANA</option>
            <option value="qris_gopay">QRIS GoPay</option>
          </select>
        </div>
      </div>

      {/* Tabel Transaksi */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-3 px-5">Tanggal</th>
                <th className="py-3 px-5">Keterangan</th>
                <th className="py-3 px-5">Pos Kas</th>
                <th className="py-3 px-5 text-right">Jumlah</th>
                <th className="py-3 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 hidden md:table-row-group">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Tidak ada transaksi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((trx) => {
                  const isPositive = trx.type === 'income' || trx.type === 'transfer_in';
                  const isTransfer = trx.type === 'transfer_in' || trx.type === 'transfer_out';
                  const methodMeta = METHOD_LABELS[trx.method] || {
                    name: trx.method,
                    tag: trx.method,
                    badge: 'bg-slate-100 text-slate-700',
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
                            isTransfer
                              ? 'text-blue-600'
                              : isPositive
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={isPositive ? faArrowTrendUp : faArrowTrendDown}
                            className="text-[10px]"
                          />
                          {formatRupiah(trx.amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-1">
                        {!isTransfer && (
                          <button
                            onClick={() => openEditModal(trx)}
                            className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                            title="Edit Transaksi"
                          >
                            <FontAwesomeIcon icon={faPenToSquare} className="text-xs" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(trx.id, trx.description)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors"
                          title="Hapus Transaksi"
                        >
                          <FontAwesomeIcon icon={faTrashCan} className="text-xs" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Mobile Feed View (Tampilan Khusus Smartphone Ala Mobile Banking) */}
          <div className="md:hidden divide-y divide-slate-100">
            {paginatedList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Tidak ada transaksi yang sesuai filter.
              </div>
            ) : (
              paginatedList.map((trx) => {
                const isPositive = trx.type === 'income' || trx.type === 'transfer_in';
                const isTransfer = trx.type === 'transfer_in' || trx.type === 'transfer_out';
                const methodMeta = METHOD_LABELS[trx.method] || {
                  name: trx.method,
                  tag: trx.method,
                  badge: 'bg-slate-100 text-slate-700',
                };

                return (
                  <div key={trx.id} className="p-3.5 flex items-center justify-between gap-3 active:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isTransfer
                            ? 'bg-blue-50 text-blue-600'
                            : isPositive
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        <FontAwesomeIcon
                          icon={
                            isTransfer
                              ? faArrowRightArrowLeft
                              : isPositive
                              ? faArrowTrendUp
                              : faArrowTrendDown
                          }
                          className="text-sm"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {trx.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${methodMeta.badge}`}
                          >
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

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-extrabold font-jakarta ${
                          isTransfer
                            ? 'text-blue-600'
                            : isPositive
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {isTransfer ? '' : isPositive ? '+' : '-'}{formatRupiah(trx.amount)}
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        {!isTransfer && (
                          <button
                            type="button"
                            onClick={() => openEditModal(trx)}
                            className="text-[11px] text-slate-400 hover:text-blue-600 p-1"
                            title="Edit"
                          >
                            <FontAwesomeIcon icon={faPenToSquare} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(trx.id, trx.description)}
                          className="text-[11px] text-slate-400 hover:text-rose-600 p-1"
                          title="Hapus"
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Pagination */}
        {filteredList.length > 0 && (
          <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Menampilkan{' '}
              <span className="font-semibold text-slate-700">
                {(safePage - 1) * ITEMS_PER_PAGE + 1}
              </span>{' '}
              –{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(safePage * ITEMS_PER_PAGE, filteredList.length)}
              </span>{' '}
              dari <span className="font-semibold text-slate-700">{filteredList.length}</span> transaksi
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                </button>
                <span className="px-2 font-semibold text-slate-700">
                  Hal {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: INPUT / EDIT TRANSAKSI */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5">
            <h3 className="text-base font-bold text-slate-900 font-jakarta">
              {editingItem ? 'Edit Transaksi Kas' : 'Catat Transaksi Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipe Transaksi */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Jenis Transaksi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                      type === 'income'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    + Pemasukan (Masuk)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                      type === 'expense'
                        ? 'bg-rose-50 border-rose-500 text-rose-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    - Pengeluaran (Keluar)
                  </button>
                </div>
              </div>

              {/* Nominal & Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="150000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              {/* Pilih Pos Kas */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Pilih Pos Kas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMethod(key)}
                      className={`p-2.5 rounded-lg text-xs text-left border transition-colors ${
                        method === key
                          ? 'bg-orange-50/70 border-orange-500 text-orange-800 font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <p className="font-semibold">{METHOD_LABELS[key].name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Keterangan Transaksi
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Belanja Bumbu Dapur / Omset Shift Siang"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-orange-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PINDAH KAS ANTAR KANTONG (TRANSFER) */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-jakarta">Pindah Kas (Transfer Internal)</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pindahkan dana antar pos (misal: Setor Laci Toko ke Kas Besar) tanpa mengubah laporan omset/pengeluaran mingguan.
              </p>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Dari Pos Kas (Asal)
                  </label>
                  <select
                    value={fromMethod}
                    onChange={(e) => setFromMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                  >
                    <option value="tunai_toko">Kas di Toko (Laci)</option>
                    <option value="tunai_kas_besar">Kas Besar (Brankas)</option>
                    <option value="qris_dana">QRIS DANA</option>
                    <option value="qris_gopay">QRIS GoPay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Ke Pos Kas (Tujuan)
                  </label>
                  <select
                    value={toMethod}
                    onChange={(e) => setToMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                  >
                    <option value="tunai_toko">Kas di Toko (Laci)</option>
                    <option value="tunai_kas_besar">Kas Besar (Brankas)</option>
                    <option value="qris_dana">QRIS DANA</option>
                    <option value="qris_gopay">QRIS GoPay</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nominal Pindah (Rp)
                  </label>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="500000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="Contoh: Setoran rutin malam hari"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Memproses...' : 'Proses Pindah Kas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL PILIHAN INPUT FOTO: KAMERA ATAU GALERI */}
      {showPickerSheet && (
        <div
          onClick={() => setShowPickerSheet(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 transition-opacity"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 animate-in slide-in-from-bottom-5 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900 font-jakarta uppercase tracking-wider">
                Pilih Sumber Foto Struk
              </span>
              <button
                type="button"
                onClick={() => setShowPickerSheet(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Opsi 1: Buka Kamera */}
              <button
                type="button"
                onClick={() => {
                  setShowPickerSheet(false);
                  cameraInputRef.current?.click();
                }}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-orange-50/70 border border-orange-200/60 hover:bg-orange-100 active:scale-95 transition-all text-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-orange-600 text-white flex items-center justify-center text-lg shadow-sm">
                  <FontAwesomeIcon icon={faCamera} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Buka Kamera</p>
                  <p className="text-[10px] text-slate-500">Foto nota langsung</p>
                </div>
              </button>

              {/* Opsi 2: Buka Galeri */}
              <button
                type="button"
                onClick={() => {
                  setShowPickerSheet(false);
                  galleryInputRef.current?.click();
                }}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all text-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center text-lg shadow-sm">
                  <FontAwesomeIcon icon={faImage} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Galeri Foto</p>
                  <p className="text-[10px] text-slate-500">Pilih dari album HP</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: HASIL SCAN STRUK VISION AI */}
      {showScanModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs">
                  <FontAwesomeIcon icon={faCamera} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-jakarta">Scan Struk Belanja AI</h3>
                  <p className="text-[10px] text-slate-400">Ekstraksi otomatis foto bon / nota pasar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Preview Foto */}
            {previewImage && (
              <div className="w-full h-40 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 relative">
                <img
                  src={previewImage}
                  alt="Struk Belanja"
                  className="w-full h-full object-contain"
                />
                {isScanning && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white gap-2">
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xl animate-spin text-orange-400" />
                    <span className="text-xs font-semibold">Menganalisis Struk Belanja...</span>
                  </div>
                )}
              </div>
            )}

            {/* Hasil Ekstraksi */}
            {scanResult && !isScanning && (
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Belanja Terdeteksi</span>
                  <div className="text-xl font-extrabold text-rose-600 font-jakarta">
                    {formatRupiah(scanResult.totalAmount)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Keterangan Pengeluaran</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{scanResult.description}</p>
                </div>

                {scanResult.items && scanResult.items.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Daftar Item:</span>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {scanResult.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-slate-600 border-b border-slate-200/50 pb-0.5">
                          <span className="truncate pr-2">{item.name}</span>
                          <span className="font-semibold text-slate-800">{formatRupiah(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
              {scanResult && !isScanning && (
                <button
                  type="button"
                  onClick={applyScanResult}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-2xs active:scale-95 transition-all"
                >
                  Gunakan Data Ini
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
