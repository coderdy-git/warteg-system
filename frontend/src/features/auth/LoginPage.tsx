import React, { useState } from 'react';
import { api } from '../../lib/api';
import type { AuthUser } from '../../lib/api';
import { Lock, User, Sparkles, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const isProd = String(import.meta.env.VITE_APP_ENV || 'development').toLowerCase() === 'production';

  const [username, setUsername] = useState(isProd ? '' : 'admin');
  const [password, setPassword] = useState(isProd ? '' : 'admin123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await api.login({ username, password });
      localStorage.setItem('wsystem_token', res.token);
      localStorage.setItem('wsystem_user', JSON.stringify(res.user));
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans antialiased">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-xl p-8 space-y-6">
        {/* Brand Logo & Title */}
        <div className="text-center space-y-2">
          <div className="w-11 h-11 rounded-xl bg-orange-600 flex items-center justify-center text-white font-extrabold text-xl mx-auto shadow-sm font-jakarta">
            W
          </div>
          <h1 className="font-bold text-slate-900 text-2xl tracking-tight font-jakarta">
            WSystem
          </h1>
          <p className="text-xs text-slate-500">
            Masuk ke Dashboard Keuangan Internal Warteg
          </p>
        </div>

        {/* Demo Credentials Alert (Hanya tampil saat Development/Staging) */}
        {!isProd && (
          <div className="bg-orange-50/70 border border-orange-200/60 rounded-xl p-3.5 text-xs text-orange-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              Mode Pengembangan (Dev):
            </p>
            <p className="text-[11px] font-mono text-orange-700">
              Username: <span className="font-bold">admin</span> | Password: <span className="font-bold">admin123</span>
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-orange-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};
