import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Cek apakah sudah running dalam mode PWA Standalone (sudah diinstall)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return; // Tidak perlu tampilkan popup jika sudah diinstall
    }

    // 2. Cek apakah user pernah menutup popup ini dalam 24 jam terakhir
    const dismissedTime = localStorage.getItem('wsystem_pwa_dismissed');
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 24 * 60 * 60 * 1000) {
      return;
    }

    // 3. Deteksi iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Di iOS Safari tidak ada event beforeinstallprompt, tampilkan panduan Add to Home Screen
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // 4. Deteksi Android / Chrome / Edge via beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Simpan timestamp penutupan agar tidak mengganggu setiap klik
    localStorage.setItem('wsystem_pwa_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 md:bottom-6 z-50 px-4 flex justify-center animate-in slide-in-from-bottom-6 duration-300 pointer-events-none">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 max-w-md w-full pointer-events-auto flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-orange-600 flex items-center justify-center text-white font-extrabold text-xl shrink-0 shadow-xs">
              W
            </div>
            <div>
              <h4 className="font-bold text-sm leading-tight text-white">Pasang Aplikasi WSystem</h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Install di HP untuk akses kasir & AI lebih cepat layaknya aplikasi native!
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="bg-slate-800/80 rounded-xl p-2.5 text-[11px] text-slate-300 flex items-center gap-2 border border-slate-700">
            <span>Tekan ikon</span>
            <Share className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>(Bagikan) lalu pilih</span>
            <span className="font-bold text-white flex items-center gap-1">
              <PlusSquare className="w-3.5 h-3.5" /> "Add to Home Screen"
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Nanti Saja
            </button>
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install Aplikasi</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
