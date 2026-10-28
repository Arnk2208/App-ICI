import React from 'react';
import { AppStep } from '../types';

interface Step1SelectionProps {
  onSelectFlow: (step: AppStep) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const Step1Selection: React.FC<Step1SelectionProps> = ({
  onSelectFlow,
  showToast,
}) => {
  const handleEmergency = () => {
    showToast('Iniciando Vía 1: Emergencia Médica Vital (Código Rojo)...', 'fa-triangle-exclamation');
    setTimeout(() => {
      onSelectFlow('emergency-e1-motivo');
    }, 200);
  };

  const handleConsulta = () => {
    showToast('Iniciando Vía 2: Consulta y Control Médico...', 'fa-stethoscope');
    setTimeout(() => {
      onSelectFlow('consulta-c1-datos');
    }, 200);
  };

  return (
    <div className="flex flex-col w-full max-w-md sm:max-w-lg mx-auto pt-4 sm:pt-8 pb-24">
      {/* Direct Minimal Header */}
      <div className="pt-2 pb-6 text-left space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 dark:text-[#aac7ff] font-mono text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>TRIAJE DE ENTRADA INMEDIATO</span>
        </div>
        <h1 className="text-[32px] sm:text-[36px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          ¿Qué atención necesitas?
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Selecciona una vía para conectar con la red de salud MINSA y EsSalud de Lima y Callao.
        </p>
      </div>

      {/* Cards Container with only the two main buttons for simple usage */}
      <div className="flex flex-col gap-5 sm:gap-6">
        {/* Vía 1: EMERGENCIA MÉDICA VITAL */}
        <div
          onClick={handleEmergency}
          className="group relative glass-squircle p-5 sm:p-6 bg-white/75 dark:bg-zinc-900/40 border-2 border-red-500/30 hover:border-red-500 shadow-[0_20px_50px_rgba(220,38,38,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] hover:shadow-[0_25px_60px_rgba(220,38,38,0.3)] transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.99]"
        >
          {/* Subtle internal ruby lighting */}
          <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-rose-600/15 blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col gap-4 sm:gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Glowing Ruby Icon Container */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/25 to-rose-600/15 border border-red-500/40 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(225,29,72,0.35)] text-red-500 dark:text-red-400 text-2xl group-hover:scale-105 transition-transform">
                  <span
                    className="material-symbols-outlined text-[32px] text-red-500"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    e911_emergency
                  </span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white shadow-sm">
                      VÍA 1 • PRIORIDAD I
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-red-500 transition-colors mt-0.5">
                    Emergencia Médica Vital
                  </h2>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white font-bold text-[15px] sm:text-base tracking-wide flex items-center justify-center gap-2.5 shadow-[0_8px_28px_rgba(225,29,72,0.4)] active:scale-[0.98] transition-all duration-200 group-hover:brightness-110 cursor-pointer"
            >
              <span>Iniciar Emergencia Médica</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Vía 2: CONSULTA Y CONTROL MÉDICO */}
        <div
          onClick={handleConsulta}
          className="group relative glass-squircle p-5 sm:p-6 bg-white/75 dark:bg-zinc-900/40 border border-blue-500/25 hover:border-blue-500/60 shadow-[0_20px_50px_rgba(0,102,255,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] hover:shadow-[0_25px_60px_rgba(37,99,235,0.25)] transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.99]"
        >
          {/* Subtle internal blue lighting */}
          <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-blue-600/15 blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col gap-4 sm:gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Glowing Blue Icon Container */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/25 to-sky-600/15 border border-blue-500/40 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(59,130,246,0.3)] text-blue-500 dark:text-blue-400 text-2xl group-hover:scale-105 transition-transform">
                  <span
                    className="material-symbols-outlined text-[32px] text-blue-500"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    stethoscope
                  </span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm">
                      VÍA 2 • AMBULATORIO
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-500 transition-colors mt-0.5">
                    Consulta y Control Médico
                  </h2>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold text-[15px] sm:text-base tracking-wide flex items-center justify-center gap-2.5 shadow-[0_8px_28px_rgba(37,99,235,0.35)] active:scale-[0.98] transition-all duration-200 group-hover:brightness-110 cursor-pointer"
            >
              <span>Continuar con Consulta / Control</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
