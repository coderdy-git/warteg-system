import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../components/ui/NotificationProvider';
import { KeyRound, Server, Cpu, Lock, ShieldCheck, LogOut, User } from 'lucide-react';

interface SettingsPageProps {
  onLogout?: () => void;
  currentUser?: { name: string; username: string; role: string } | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout, currentUser }) => {
  const { showToast, confirm } = useNotification();

  // AI Settings State (Kunci mati ke DeepSeek)
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Change Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getAISettings();
      setMaskedKey(data.maskedApiKey || '');
      setHasSavedKey(data.hasApiKey);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey && !hasSavedKey) {
      showToast('error', 'Validasi Gagal', 'API Key DeepSeek harus terisi.');
      return;
    }

    try {
      setSaving(true);
      await api.saveAISettings({
        baseUrl: 'https://api.deepseek.com',
        apiKey: apiKey.trim(),
        model: 'deepseek-chat',
      });
      setApiKey('');
      await loadSettings();
      showToast('success', 'Pengaturan Tersimpan', 'API Key DeepSeek berhasil disimpan.');
    } catch (err: any) {
      showToast('error', 'Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;

    try {
      setChangingPass(true);
      await api.changePassword({ oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      showToast('success', 'Password Diperbarui', 'Password akun Anda telah berhasil diganti.');
    } catch (err: any) {
      showToast('error', 'Gagal Ganti Password', err.message || 'Periksa kembali password lama Anda.');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight font-jakarta">Pengaturan Sistem & Keamanan</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Kelola kredensial API Asisten AI (DeepSeek) serta keamanan password akun Anda.
        </p>
      </div>

      {/* SECTION 1: PENGATURAN AI */}
      <form onSubmit={handleSaveAI} className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 font-jakarta">Konfigurasi Asisten AI (DeepSeek)</h3>
          <p className="text-[11px] text-slate-400">API Key dienkripsi & di-masking di sisi server demi keamanan produksi.</p>
        </div>

        {/* Base URL (Locked & Readonly ke DeepSeek) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              Base URL (DeepSeek Official)
            </span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              Terkunci (Default)
            </span>
          </label>
          <input
            type="text"
            value="https://api.deepseek.com"
            disabled
            className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs font-mono cursor-not-allowed select-none"
          />
        </div>

        {/* API Key */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              API Key DeepSeek
            </span>
            {hasSavedKey && (
              <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3" /> Tersimpan ({maskedKey})
              </span>
            )}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              hasSavedKey
                ? 'Kosongkan jika tidak ingin mengubah API Key yang tersimpan'
                : 'Masukkan API Key DeepSeek (sk-...)'
            }
            className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-orange-500 font-mono"
          />
        </div>

        {/* Pilih Model (Locked ke deepseek-chat) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              Model LLM DeepSeek
            </span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              Terkunci (Default)
            </span>
          </label>
          <input
            type="text"
            value="deepseek-chat"
            disabled
            className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs font-mono cursor-not-allowed select-none"
          />
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving || loading}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-50 transition-colors"
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan AI'}
          </button>
        </div>
      </form>

      {/* SECTION 2: GANTI PASSWORD AKUN */}
      <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 font-jakarta flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500" />
            Keamanan Akun (Ganti Password)
          </h3>
          <p className="text-[11px] text-slate-400">Ganti password bawaan secara berkala sebelum digunakan di lingkungan produksi.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password Saat Ini
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password Baru (Min. 6 Karakter)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-orange-500"
              required
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={changingPass}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs disabled:opacity-50 transition-colors"
          >
            {changingPass ? 'Memperbarui...' : 'Perbarui Password'}
          </button>
        </div>
      </form>

      {/* SECTION 3: PROFIL & KELUAR / LOGOUT */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-jakarta flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              Sesi Login & Akun
            </h3>
            <p className="text-[11px] text-slate-400">Informasi akun pengguna yang sedang aktif saat ini.</p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
              <p className="text-[11px] text-slate-500">Username: <span className="font-semibold text-slate-700">{currentUser.username}</span> ({currentUser.role})</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
              Aktif
            </span>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => {
              confirm({
                title: 'Konfirmasi Keluar',
                message: 'Apakah Anda yakin ingin keluar dari sistem kasir warteg?',
                confirmLabel: 'Ya, Keluar',
                cancelLabel: 'Batal',
                isDanger: true,
                onConfirm: () => {
                  onLogout?.();
                },
              });
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
