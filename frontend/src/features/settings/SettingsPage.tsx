import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../components/ui/NotificationProvider';
import { KeyRound, Server, Cpu, RefreshCw, Lock, ShieldCheck } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { showToast } = useNotification();

  // AI Settings State
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingModels, setFetchingModels] = useState(false);
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
      setBaseUrl(data.baseUrl || 'https://api.deepseek.com');
      setMaskedKey(data.maskedApiKey || '');
      setHasSavedKey(data.hasApiKey);
      setModel(data.model || 'deepseek-chat');

      if (data.baseUrl && data.hasApiKey) {
        fetchModelList(data.baseUrl, '', data.model || 'deepseek-chat', true);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModelList = async (
    urlToUse?: string,
    keyToUse?: string,
    currentModel?: string,
    silent = false
  ) => {
    const targetUrl = urlToUse || baseUrl;
    const targetKey = keyToUse !== undefined ? keyToUse : apiKey;

    if (!targetUrl || (!targetKey && !hasSavedKey)) {
      if (!silent) {
        showToast('error', 'Data Belum Lengkap', 'Masukkan Base URL dan API Key terlebih dahulu.');
      }
      return;
    }

    try {
      setFetchingModels(true);
      const models = await api.fetchModels(targetUrl, targetKey || undefined);
      setAvailableModels(models);

      if (!model && models.length > 0) {
        setModel(models[0]);
      } else if (currentModel && models.includes(currentModel)) {
        setModel(currentModel);
      }

      if (!silent) {
        showToast('success', 'Koneksi Berhasil', `Ditemukan ${models.length} model dari DeepSeek API.`);
      }
    } catch (err: any) {
      if (!silent) {
        showToast('error', 'Gagal Memuat Model', err.message || 'Periksa kembali Base URL & API Key DeepSeek.');
      }
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl || (!apiKey && !hasSavedKey) || !model) {
      showToast('error', 'Validasi Gagal', 'Base URL, API Key, dan Model harus terisi.');
      return;
    }

    try {
      setSaving(true);
      await api.saveAISettings({ baseUrl, apiKey, model });
      setApiKey('');
      await loadSettings();
      showToast('success', 'Pengaturan Tersimpan', 'Konfigurasi DeepSeek API berhasil diperbarui.');
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

        {/* Base URL */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            Base URL (DeepSeek Official)
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.deepseek.com"
            className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-orange-500 font-mono"
            required
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
                : 'Masukkan API Key (sk-...)'
            }
            className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-orange-500 font-mono"
          />
        </div>

        {/* Tombol Tarik Model */}
        <div>
          <button
            type="button"
            onClick={() => fetchModelList()}
            disabled={fetchingModels || !baseUrl || (!apiKey && !hasSavedKey)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingModels ? 'animate-spin text-orange-600' : ''}`} />
            {fetchingModels ? 'Mengambil Model...' : 'Tarik Daftar Model dari DeepSeek'}
          </button>
        </div>

        {/* Pilih Model */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            Pilih Model LLM
          </label>
          {availableModels.length > 0 ? (
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-orange-500 bg-white font-mono"
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Contoh: deepseek-chat"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-orange-500 font-mono"
            />
          )}
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
    </div>
  );
};
