import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse,
  faReceipt,
  faFileInvoiceDollar,
  faGear,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';

interface MobileBottomNavProps {
  activeTab: 'dashboard' | 'transactions' | 'reports' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'reports' | 'settings') => void;
  onOpenAI: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenAI,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] safe-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Beranda / Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'dashboard'
              ? 'text-orange-600 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <FontAwesomeIcon icon={faHouse} className="text-base" />
            {activeTab === 'dashboard' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Beranda</span>
        </button>

        {/* Transaksi */}
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'transactions'
              ? 'text-orange-600 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <FontAwesomeIcon icon={faReceipt} className="text-base" />
            {activeTab === 'transactions' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Transaksi</span>
        </button>

        {/* Floating AI Button (Center Quick Action) */}
        <div className="flex flex-col items-center justify-center flex-1 -mt-5">
          <button
            type="button"
            onClick={onOpenAI}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 border-2 border-white active:scale-95 transition-transform"
            aria-label="Tanya AI Asisten"
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-base" />
          </button>
          <span className="text-[10px] font-bold text-orange-600 mt-1 tracking-tight">AI Kas</span>
        </div>

        {/* Laporan */}
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'reports'
              ? 'text-orange-600 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <FontAwesomeIcon icon={faFileInvoiceDollar} className="text-base" />
            {activeTab === 'reports' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Laporan</span>
        </button>

        {/* Pengaturan / Profil */}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'settings'
              ? 'text-orange-600 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <FontAwesomeIcon icon={faGear} className="text-base" />
            {activeTab === 'settings' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Setelan</span>
        </button>
      </div>
    </nav>
  );
};
