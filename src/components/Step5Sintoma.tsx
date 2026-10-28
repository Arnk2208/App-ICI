import React, { useState, useEffect } from 'react';
import { PatientData } from '../types';

interface Step5SintomaProps {
  onNext: () => void;
  onBack: () => void;
  patient: PatientData;
  setPatient: React.Dispatch<React.SetStateAction<PatientData>>;
  showToast: (msg: string, icon?: string) => void;
}

const SYMPTOMS_LIST = [
  {
    id: 'chest',
    title: 'Dolor Torácico',
    subtitle: 'Opresión pecho',
    icon: 'cardiology',
  },
  {
    id: 'respiratory',
    title: 'Dificultad Resp.',
    subtitle: 'Falta de aire',
    icon: 'air',
  },
  {
    id: 'fever',
    title: 'Fiebre alta',
    subtitle: '> 38.5°C o chuchos',
    icon: 'device_thermostat',
  },
  {
    id: 'headache',
    title: 'Dolor de Cabeza',
    subtitle: 'Cefalea pulsátil',
    icon: 'neurology',
  },
  {
    id: 'abdominal',
    title: 'Abdominal',
    subtitle: 'Cólico o náuseas',
    icon: 'save_as',
  },
  {
    id: 'dizziness',
    title: 'Mareo / Síncope',
    subtitle: 'Inestabilidad',
    icon: 'sync_problem',
  },
  {
    id: 'cough',
    title: 'Tos Persistente',
    subtitle: 'Seca o productiva',
    icon: 'pulmonology',
  },
  {
    id: 'other',
    title: 'Otro motivo',
    subtitle: 'Escribir detalle',
    icon: 'more_horiz',
  },
];

const DURATIONS = ['< 24 horas', '1 a 3 días', '1 a 2 semanas', '> 1 mes'];

export const Step5Sintoma: React.FC<Step5SintomaProps> = ({
  onNext,
  onBack,
  patient,
  setPatient,
  showToast,
}) => {
  const [selectedSymptom, setSelectedSymptom] = useState<string>(
    patient.primarySymptom || 'Dolor Torácico'
  );
  const [duration, setDuration] = useState<string>(
    patient.symptomDuration || '< 24 horas'
  );
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(4);
  const [transcript, setTranscript] = useState<string>(
    '"Siento opresión intensa en el pecho y leve fatiga..."'
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordingSeconds(0);
      setTranscript('Escuchando en vivo... "Tengo punzadas y falta de aliento"');
      showToast('Micrófono activado: escuchando síntoma...', 'fa-microphone');
    } else {
      setIsRecording(false);
      setTranscript('"Siento opresión en el pecho y fatiga al caminar..."');
      showToast('Voz procesada con éxito por IA MINSA', 'fa-check');
    }
  };

  const handleSelectSymptom = (title: string) => {
    setSelectedSymptom(title);
    setPatient((prev) => ({ ...prev, primarySymptom: title }));
    showToast(`Síntoma: ${title}`, 'fa-heart-pulse');
  };

  const handleSelectDuration = (dur: string) => {
    setDuration(dur);
    setPatient((prev) => ({ ...prev, symptomDuration: dur }));
    showToast(`Evolución: ${dur}`, 'fa-clock');
  };

  const handleContinue = () => {
    setPatient((prev) => ({
      ...prev,
      primarySymptom: selectedSymptom,
      symptomDuration: duration,
    }));
    onNext();
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto space-y-5 pb-24">
      {/* Sub-header Patient Context Ribbon */}
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver al Paso 4"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white hover:text-white transition-all active:scale-95 shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-900 shadow-sm border border-slate-300 dark:border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="font-mono text-xs text-blue-500 dark:text-[#aac7ff] font-semibold">
            {patient.fullName || 'Valeria Mendoza'} • {patient.age || 28}a • EVA {patient.evaScore || 6}/10 {patient.painLocation || 'Pecho'}
          </span>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 shadow-sm">
          <span className="font-mono text-xs text-blue-500 dark:text-[#aac7ff] font-bold">83%</span>
        </div>
      </div>

      {/* Screen Heading */}
      <div className="space-y-1.5 px-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-sm font-mono text-[10px] font-bold">
          <span className="material-symbols-outlined text-[14px]">vital_signs</span>
          <span className="uppercase tracking-wider">SÍNTOMA PRINCIPAL</span>
        </div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">
          ¿Qué molestia presentas?
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Elige tu síntoma clave o descríbelo con tu voz para la IA clínica MINSA.
        </p>
      </div>

      {/* Interactive Voice Assistant Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-[#1d2025]/80 p-4 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
            <span className="font-mono text-xs text-blue-500 dark:text-[#aac7ff] font-semibold">
              Asistente Vocal IA
            </span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-blue-500 dark:text-[#aac7ff]">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            <span className="font-mono text-[10px] font-bold">
              {isRecording ? 'Grabando...' : 'Transcripción Lista'}
            </span>
          </div>
        </div>

        {/* Spatial Voice Wave & Mic Pod */}
        <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-100 dark:bg-[#111319] shadow-inner border border-slate-200 dark:border-slate-800/60">
          <button
            type="button"
            onClick={toggleRecording}
            aria-label="Grabar síntoma por voz"
            className="relative flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white shrink-0 shadow-lg active:scale-95 transition-transform cursor-pointer"
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isRecording ? 'graphic_eq' : 'mic'}
            </span>
            {isRecording && (
              <span className="absolute inset-0 rounded-full bg-blue-500 opacity-40 animate-ping"></span>
            )}
          </button>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1 h-4 mb-1">
              {[8, 16, 12, 16, 6, 14, 10].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full bg-blue-500 ${isRecording ? 'animate-pulse' : ''}`}
                  style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
                ></span>
              ))}
              <span className="font-mono text-xs text-slate-400 ml-1.5">
                00:0{recordingSeconds}s
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-zinc-200 italic truncate font-medium">
              {transcript}
            </p>
          </div>
        </div>
      </div>

      {/* Quick-Select Common Symptoms Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
            O selecciona de la lista
          </span>
          <span className="font-mono text-[11px] text-blue-500 dark:text-[#aac7ff]">
            8 opciones
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {SYMPTOMS_LIST.map((sym) => {
            const isSelected = selectedSymptom === sym.title;
            return (
              <button
                key={sym.id}
                type="button"
                onClick={() => handleSelectSymptom(sym.title)}
                className={`relative flex flex-col items-start p-3 rounded-xl text-left shadow-md transition-all active:scale-[0.98] cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-400 shadow-[0_4px_16px_rgba(0,102,255,0.3)]'
                    : 'bg-white/80 dark:bg-[#1d2025] text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-900 text-blue-500 dark:text-[#aac7ff]'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: isSelected ? "'FILL' 1" : undefined }}
                    >
                      {sym.icon}
                    </span>
                  </div>
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      isSelected ? 'text-white' : 'text-transparent'
                    }`}
                  >
                    check_circle
                  </span>
                </div>
                <span className="text-sm font-semibold leading-tight">{sym.title}</span>
                <span
                  className={`font-mono text-[11px] mt-0.5 ${
                    isSelected ? 'opacity-85 text-white' : 'text-slate-500 dark:text-zinc-400'
                  }`}
                >
                  {sym.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration Selector */}
      <div className="space-y-2 p-3.5 rounded-2xl bg-white/80 dark:bg-[#1d2025] shadow-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-blue-500 dark:text-[#aac7ff]">
              schedule
            </span>
            <span>Tiempo de evolución</span>
          </label>
          <span className="font-mono text-xs text-blue-500 dark:text-[#aac7ff] font-bold">
            {duration}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#111319]">
          {DURATIONS.map((dur) => {
            const isSelected = duration === dur;
            const shortLabel =
              dur === '< 24 horas'
                ? '< 24h'
                : dur === '1 a 3 días'
                ? '1-3 d'
                : dur === '1 a 2 semanas'
                ? '1-2 s'
                : '> 1m';
            return (
              <button
                key={dur}
                type="button"
                onClick={() => handleSelectDuration(dur)}
                className={`py-2 px-1 rounded-lg font-mono text-xs text-center font-medium transition-all active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-white'
                }`}
              >
                {shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* MINSA Clinical Protocol Context Card */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-100 dark:bg-[#111319] shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 dark:text-[#aac7ff] flex items-center justify-center shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-[18px]">verified_user</span>
        </div>
        <div className="space-y-0.5">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white">
            Protocolo NTS N° 124-MINSA
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            El dolor torácico agudo (&lt; 24h) en triaje digital activa de inmediato parámetros prioritarios de alerta cardiovascular antes de emitir tu orden.
          </p>
        </div>
      </div>

      {/* CTA Button & Bottom Step Tracker */}
      <div className="pt-2 space-y-3">
        <button
          type="button"
          onClick={handleContinue}
          className="w-full h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer text-sm sm:text-base"
        >
          <span>Continuar a Antecedentes (Paso 6)</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>

        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-[10px] text-slate-400 uppercase">
            PASO 5 DE 6 REGISTRADO
          </span>
          <span className="font-mono text-[10px] text-blue-500 dark:text-[#aac7ff] font-bold">
            83% COMPLETADO
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full w-[83%] transition-all duration-500"></div>
        </div>
      </div>
    </div>
  );
};
