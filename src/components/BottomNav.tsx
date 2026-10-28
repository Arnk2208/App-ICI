import React from 'react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  passCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  passCount = 0,
}) => {
  return (
    <nav className="fixed bottom-4 inset-x-0 z-50 px-5 pb-safe flex justify-center pointer-events-none">
      <div className="pointer-events-auto h-16 w-full max-w-xs px-3 rounded-full bg-slate-900/85 dark:bg-[#111622]/90 backdrop-blur-3xl border border-white/[0.1] shadow-[0_20px_50px_rgba(0,0,0,0.65)] flex items-center justify-around">
        {/* Tab 1: Triaje */}
        <button
          onClick={() => setActiveTab('triaje')}
          className={`flex items-center justify-center gap-2 px-5 h-11 rounded-full transition-all duration-200 cursor-pointer ${
            activeTab === 'triaje'
              ? 'bg-white/15 text-blue-400 shadow-[0_0_16px_rgba(147,197,253,0.3)] font-bold'
              : 'text-zinc-400 hover:text-white active:scale-95 font-medium'
          }`}
          type="button"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            ecg_heart
          </span>
          <span className="text-xs tracking-tight">Triaje</span>
        </button>

        {/* Tab 2: Mis Pases (Personal) */}
        <button
          onClick={() => setActiveTab('pases')}
          className={`flex items-center justify-center gap-2 px-5 h-11 rounded-full transition-all duration-200 cursor-pointer relative ${
            activeTab === 'pases'
              ? 'bg-white/15 text-blue-400 shadow-[0_0_16px_rgba(147,197,253,0.3)] font-bold'
              : 'text-zinc-400 hover:text-white active:scale-95 font-medium'
          }`}
          type="button"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            qr_code_2
          </span>
          <span className="text-xs tracking-tight">Mis Pases</span>
          {passCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_#3b82f6]"></span>
          )}
        </button>
      </div>
    </nav>
  );
};
