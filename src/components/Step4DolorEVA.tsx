import React, { useState } from 'react';
import { PatientData } from '../types';

interface Step4DolorEVAProps {
  onNext: () => void;
  onBack: () => void;
  patient: PatientData;
  setPatient: React.Dispatch<React.SetStateAction<PatientData>>;
  showToast: (msg: string, icon?: string) => void;
}

const PAIN_TYPES = ['Punzante', 'Opresivo / Presión', 'Ardor / Quemazón', 'Cólico', 'Sordo / Constante'];
const PAIN_LOCATIONS = ['Cabeza', 'Pecho', 'Abdomen', 'Espalda', 'Extremidades', 'Otra zona'];

export const Step4DolorEVA: React.FC<Step4DolorEVAProps> = ({
  onNext,
  onBack,
  patient,
  setPatient,
  showToast,
}) => {
  const [hasPain, setHasPain] = useState<boolean>(patient.evaScore > 0);
  const [evaScore, setEvaScore] = useState<number>(patient.evaScore || 6);
  const [selectedPainTypes, setSelectedPainTypes] = useState<string[]>(
    patient.painType ? [patient.painType] : ['Opresivo / Presión']
  );
  const [selectedLocation, setSelectedLocation] = useState<string>(
    patient.painLocation || 'Pecho'
  );

  const getStatusInfo = (score: number) => {
    if (score === 0) {
      return { text: 'SIN DOLOR', color: 'bg-emerald-500', badgeClass: 'text-emerald-500 bg-emerald-500/10' };
    }
    if (score <= 3) {
      return { text: 'DOLOR LEVE', color: 'bg-blue-400', badgeClass: 'text-blue-400 bg-blue-500/10' };
    }
    if (score <= 6) {
      return { text: 'DOLOR MODERADO', color: 'bg-[#aac7ff]', badgeClass: 'text-blue-500 dark:text-[#aac7ff] bg-blue-500/15' };
    }
    if (score <= 8) {
      return { text: 'DOLOR SEVERO', color: 'bg-amber-500', badgeClass: 'text-amber-500 bg-amber-500/15' };
    }
    return { text: 'MÁXIMO INTENSO', color: 'bg-red-500', badgeClass: 'text-red-500 bg-red-500/15 animate-pulse' };
  };

  const handleSliderChange = (val: number) => {
    setEvaScore(val);
    setHasPain(val > 0);
    setPatient((prev) => ({ ...prev, evaScore: val }));
  };

  const setNoPain = () => {
    setHasPain(false);
    setEvaScore(0);
    setPatient((prev) => ({ ...prev, evaScore: 0 }));
    showToast('Estado: Sin dolor registrado', 'fa-smile');
  };

  const setPain = () => {
    setHasPain(true);
    const score = evaScore === 0 ? 5 : evaScore;
    setEvaScore(score);
    setPatient((prev) => ({ ...prev, evaScore: score }));
    showToast(`Dolor calibrado en nivel ${score} EVA`, 'fa-triangle-exclamation');
  };

  const togglePainType = (type: string) => {
    let next: string[];
    if (selectedPainTypes.includes(type)) {
      next = selectedPainTypes.filter((t) => t !== type);
    } else {
      next = [...selectedPainTypes, type];
    }
    setSelectedPainTypes(next);
    setPatient((prev) => ({ ...prev, painType: next.join(', ') }));
  };

  const selectLocation = (loc: string) => {
    setSelectedLocation(loc);
    setPatient((prev) => ({ ...prev, painLocation: loc }));
    showToast(`Zona anatómica: ${loc}`, 'fa-crosshairs');
  };

  const handleContinue = () => {
    setPatient((prev) => ({
      ...prev,
      evaScore,
      painType: selectedPainTypes.join(', '),
      painLocation: selectedLocation,
    }));
    onNext();
  };

  const status = getStatusInfo(evaScore);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto space-y-5 pb-24">
      {/* Context Mini-HUD Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-full bg-slate-200 dark:bg-slate-800/80 backdrop-blur-xl shadow-sm border border-slate-300 dark:border-slate-700/60">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:text-white cursor-pointer mr-0.5"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          </button>
          <span className="w-2 h-2 rounded-full bg-[#aac7ff] shrink-0 shadow-[0_0_8px_currentColor]"></span>
          <p className="font-mono text-[11px] text-slate-600 dark:text-zinc-300 truncate">
            Paciente:{' '}
            <span className="text-slate-900 dark:text-white font-semibold">
              {patient.fullName || 'Valeria Mendoza'}
            </span>{' '}
            • {patient.age || 28} años • {patient.selectedCenter?.name || 'C.S. San Isidro'}
          </p>
        </div>
        <span
          className="material-symbols-outlined text-[16px] text-blue-500 dark:text-[#aac7ff] shrink-0"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          verified_user
        </span>
      </div>

      {/* Screen Header & Clinical Question */}
      <div className="flex flex-col gap-1.5 px-1">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-blue-500 dark:text-[#aac7ff] font-mono text-[10px] tracking-wider uppercase font-bold">
            Escala EVA
          </span>
          <span className="font-mono text-xs text-slate-500 dark:text-zinc-400">4 / 6</span>
        </div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">
          ¿Sientes algún dolor físico?
        </h1>
        <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
          Indica la intensidad actual del dolor en la escala médica 0 a 10 para priorizar tu atención clínica.
        </p>
      </div>

      {/* Primary Toggle Segment: Pain vs No Pain */}
      <div className="grid grid-cols-2 p-1.5 rounded-full bg-slate-200 dark:bg-[#0c0e13]/90 backdrop-blur-2xl shadow-inner">
        <button
          type="button"
          onClick={setNoPain}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer ${
            !hasPain
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-zinc-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">sentiment_satisfied</span>
          <span className="truncate">Sin dolor (0)</span>
        </button>

        <button
          type="button"
          onClick={setPain}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer ${
            hasPain
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-zinc-400 hover:text-white'
          }`}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            sentiment_dissatisfied
          </span>
          <span className="truncate">Sí, tengo dolor</span>
        </button>
      </div>

      {/* Interactive Visual Analogue Scale (EVA) Spatial Card */}
      <div className="relative rounded-squircle bg-white/80 dark:bg-[#1d2025]/70 backdrop-blur-3xl p-5 shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-widest block mb-0.5 font-bold">
              Intensidad EVA
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[44px] leading-none text-slate-900 dark:text-white font-bold font-mono">
                {evaScore}
              </span>
              <span className="font-mono text-sm text-slate-500 dark:text-zinc-400">/ 10</span>
            </div>
          </div>

          {/* Color-coded Dynamic Badge */}
          <div
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full shadow-sm transition-colors duration-300 ${status.badgeClass}`}
          >
            <span className={`w-2 h-2 rounded-full ${status.color} shrink-0`}></span>
            <span className="font-mono text-[10px] sm:text-[11px] font-bold tracking-wider">
              {status.text}
            </span>
          </div>
        </div>

        {/* Spatial Slider Area */}
        <div className="relative py-3 mb-2">
          {/* Gradient track */}
          <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-[#0c0e13] relative overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-150 bg-gradient-to-r from-blue-500 via-amber-500 to-rose-600"
              style={{ width: `${evaScore * 10}%` }}
            ></div>
          </div>

          {/* Range Input */}
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={evaScore}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            aria-label="Escala visual analógica de dolor de 0 a 10"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />

          {/* Tick Marks */}
          <div className="flex justify-between items-center px-1 mt-3">
            {[0, 2, 4, 6, 8, 10].map((tick) => (
              <span key={tick} className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                {tick}
              </span>
            ))}
          </div>
        </div>

        {/* Clinical Anchor Points */}
        <div className="grid grid-cols-3 gap-1 pt-3 text-center border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col items-start text-left">
            <span className="font-mono text-[10px] text-slate-400">0 - 2</span>
            <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium">Leve / Molestia</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="font-mono text-[10px] text-slate-400">3 - 6</span>
            <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium">Moderado</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="font-mono text-[10px] text-slate-400">7 - 10</span>
            <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium">Severo / Máximo</span>
          </div>
        </div>
      </div>

      {/* Pain Details Section */}
      <div className={`space-y-4 transition-opacity duration-300 ${!hasPain ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* Nature of Pain */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-900 dark:text-white">
              Tipo de molestia o sensación
            </label>
            <span className="font-mono text-[11px] text-slate-400">Opcional</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PAIN_TYPES.map((type) => {
              const isSelected = selectedPainTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => togglePainType(type)}
                  className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-700'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location Chips */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-900 dark:text-white">
              Zona anatómica principal
            </label>
            <span className="font-mono text-[11px] text-slate-400">1 selección</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PAIN_LOCATIONS.map((loc) => {
              const isSelected = selectedLocation === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => selectLocation(loc)}
                  className={`py-2.5 px-3 rounded-full text-xs font-medium text-center truncate transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-700'
                  }`}
                >
                  {loc}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Clinical Telemetry Note */}
      <div className="flex items-start gap-3 p-3.5 rounded-squircle bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-300/50 dark:border-slate-800">
        <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-800 flex items-center justify-center shrink-0 text-blue-500 dark:text-[#aac7ff]">
          <span className="material-symbols-outlined text-[18px]">verified</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-snug">
          La puntuación EVA calibrada informa al algoritmo clínico de triaje el grado de severidad y reduce los tiempos de espera médica.
        </p>
      </div>

      {/* CTA Button */}
      <div className="flex flex-col gap-3.5">
        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-4 px-6 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(0,102,255,0.35)] active:scale-98 transition-transform cursor-pointer text-sm sm:text-base"
        >
          <span>Continuar a Síntoma Principal</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>

        {/* Step Progress Tracker */}
        <div className="flex flex-col gap-1.5 px-1">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            <span>PASO 4 DE 6 REGISTRADO</span>
            <span className="text-blue-500 dark:text-[#aac7ff] font-bold">66%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-blue-600" style={{ width: '66%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
