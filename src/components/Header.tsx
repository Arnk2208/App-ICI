import React from 'react';
import { AppStep } from '../types';

interface HeaderProps {
  currentStep: AppStep;
  setStep: (step: AppStep) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  setStep,
  isDarkMode,
  toggleTheme,
}) => {
  const isEmergency = currentStep.startsWith('emergency-');

  const getStepProgress = () => {
    switch (currentStep) {
      case 'step0-selection':
        return { percent: 0, show: false, label: '', title: '' };

      // VÍA 1: Emergencia Médica Vital (E1 a E4 + Pase)
      case 'emergency-e1-motivo':
        return { percent: 20, show: true, label: 'Paso E1 de 4', title: 'Motivo de Emergencia' };
      case 'emergency-e2-movilidad':
        return { percent: 40, show: true, label: 'Paso E2 de 4', title: 'Movilidad' };
      case 'emergency-e2-auxilio':
        return { percent: 50, show: true, label: 'Auxilio', title: 'SAMU' };
      case 'emergency-e2-mapa':
        return { percent: 50, show: true, label: 'Navegación', title: 'Hospitales 24h' };
      case 'emergency-e3-datos':
        return { percent: 65, show: true, label: 'Paso E3 de 4', title: 'Datos del Paciente' };
      case 'emergency-e4-sample':
        return { percent: 85, show: true, label: 'Paso E4 de 4', title: 'Protocolo SAMPLE' };
      case 'emergency-pase':
        return { percent: 100, show: true, label: 'Pase Emitido', title: 'Código Rojo' };

      // VÍA 2: Consulta y Control Médico (C1 a C5 + Pase)
      case 'consulta-c1-datos':
        return { percent: 20, show: true, label: 'Paso C1 de 5', title: 'Datos del Paciente' };
      case 'consulta-c2-geo':
        return { percent: 40, show: true, label: 'Paso C2 de 5', title: 'Centro y Mapa GPS' };
      case 'consulta-c3-tipo':
        return { percent: 60, show: true, label: 'Paso C3 de 5', title: 'Tipo de Consulta' };
      case 'consulta-c4-sintoma':
        return { percent: 80, show: true, label: 'Paso C4 de 5', title: 'Evaluación de Síntoma' };
      case 'consulta-c4-control':
        return { percent: 80, show: true, label: 'Paso C4 de 5', title: 'Tamizajes y Control' };
      case 'consulta-c5-antecedentes':
        return { percent: 95, show: true, label: 'Paso C5 de 5', title: 'Antecedentes y Hábitos' };
      case 'consulta-pase':
        return { percent: 100, show: true, label: 'Pase Emitido', title: 'Consulta / Control' };

      default:
        return { percent: 0, show: false, label: '', title: '' };
    }
  };

  const { percent, show, label, title } = getStepProgress();

  const handleBack = () => {
    // Vía 1 Back Handlers
    if (currentStep === 'emergency-pase') setStep('emergency-e4-sample');
    else if (currentStep === 'emergency-e4-sample') setStep('emergency-e3-datos');
    else if (currentStep === 'emergency-e3-datos') setStep('emergency-e2-movilidad');
    else if (currentStep === 'emergency-e2-auxilio') setStep('emergency-e2-movilidad');
    else if (currentStep === 'emergency-e2-mapa') setStep('emergency-e2-movilidad');
    else if (currentStep === 'emergency-e2-movilidad') setStep('emergency-e1-motivo');
    else if (currentStep === 'emergency-e1-motivo') setStep('step0-selection');

    // Vía 2 Back Handlers
    else if (currentStep === 'consulta-pase') setStep('consulta-c5-antecedentes');
    else if (currentStep === 'consulta-c5-antecedentes') setStep('consulta-c3-tipo');
    else if (currentStep === 'consulta-c4-sintoma' || currentStep === 'consulta-c4-control') setStep('consulta-c3-tipo');
    else if (currentStep === 'consulta-c3-tipo') setStep('consulta-c2-geo');
    else if (currentStep === 'consulta-c2-geo') setStep('consulta-c1-datos');
    else if (currentStep === 'consulta-c1-datos') setStep('step0-selection');

    else setStep('step0-selection');
  };

  return (
    <header className="w-full max-w-4xl mx-auto px-2 sm:px-6 mb-3 sm:mb-4">
      {/* Minimal Glass App Bar */}
      <div className="liquid-glass-card squircle-full px-4 sm:px-5 py-3 flex items-center justify-between shadow-sm">
        {/* Brand & Back Button */}
        <div className="flex items-center gap-3">
          {currentStep !== 'step0-selection' ? (
            <button
              onClick={handleBack}
              className="w-9 h-9 squircle-full flex items-center justify-center liquid-glass-card-subtle text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 press-tactile transition-all cursor-pointer"
              title="Volver"
              type="button"
            >
              <i className="fa-solid fa-arrow-left text-sm"></i>
            </button>
          ) : null}

          <div
            onClick={() => setStep('step0-selection')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div
              className={`w-9 h-9 squircle-md flex items-center justify-center text-white shadow-md ${
                isEmergency
                  ? 'bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 shadow-red-500/30'
                  : 'bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 shadow-blue-500/30'
              }`}
            >
              <i className="fa-solid fa-heart-pulse text-base animate-pulse"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  TriajeIA
                </span>
                {isEmergency && (
                  <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 squircle-full bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">
                    CÓDIGO ROJO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isEmergency
                  ? 'Atención Inmediata Prioridad I'
                  : 'Pre-Triaje Digital de Salud'}
              </p>
            </div>
          </div>
        </div>

        {/* Center Step Indicator Badge */}
        {show && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 squircle-full liquid-glass-card-subtle border border-slate-200/50 dark:border-slate-800/50">
            <span
              className={`w-2 h-2 rounded-full ${
                isEmergency ? 'bg-red-600 animate-ping' : 'bg-blue-500'
              }`}
            ></span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {label} • {title}
            </span>
          </div>
        )}

        {/* Right Controls: Emergency call & theme switcher */}
        <div className="flex items-center gap-2">
          <a
            href="tel:106"
            className="flex items-center gap-1.5 px-3 py-1.5 squircle-full bg-red-600 text-white shadow-lg shadow-red-600/35 border border-red-400 text-xs font-black hover:bg-red-700 transition-all press-tactile emergency-pulse-ring"
          >
            <i className="fa-solid fa-phone-volume text-xs"></i>
            <span>SAMU</span>
          </a>

          <button
            onClick={toggleTheme}
            className="w-9 h-9 squircle-full flex items-center justify-center liquid-glass-card-subtle text-slate-700 dark:text-amber-300 hover:shadow-lg press-tactile transition-all cursor-pointer"
            title="Cambiar Tema"
            type="button"
          >
            {isDarkMode ? (
              <i className="fa-solid fa-sun text-sm text-amber-300"></i>
            ) : (
              <i className="fa-solid fa-moon text-sm text-slate-700"></i>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {show && (
        <div className="mt-2.5 w-full bg-slate-200/70 dark:bg-slate-800/70 h-1.5 squircle-full overflow-hidden p-0.5 backdrop-blur-sm">
          <div
            className={`h-full squircle-full transition-all duration-500 ease-out shadow-sm ${
              isEmergency
                ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500'
                : 'bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-400'
            }`}
            style={{ width: `${percent}%` }}
          ></div>
        </div>
      )}
    </header>
  );
};
