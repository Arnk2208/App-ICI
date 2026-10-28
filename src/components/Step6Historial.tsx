import React, { useState } from 'react';
import { PatientData, PassRecord } from '../types';
import { VectorQRCode } from './VectorQRCode';
import { maskDniForDisplay, stringifyQrPayload } from '../utils/qrPayload';

interface Step6HistorialProps {
  onBack: () => void;
  onReset: () => void;
  patient: PatientData;
  setPatient: React.Dispatch<React.SetStateAction<PatientData>>;
  showToast: (msg: string, icon?: string) => void;
  onPassGenerated?: (pass: PassRecord) => void;
}

const CONDITIONS_LIST = [
  { id: 'hta', title: 'Hipertensión arterial', icon: 'vital_signs' },
  { id: 'dm', title: 'Diabetes mellitus', icon: 'bloodtype' },
  { id: 'asthma', title: 'Asma o respiratorio', icon: 'pulmonology' },
  { id: 'cardio', title: 'Cardiopatía previa', subtitle: 'Asociado a dolor', icon: 'cardiology' },
  { id: 'pregnancy', title: 'Embarazo / Gestación', icon: 'pregnant_woman' },
  { id: 'none', title: 'Ninguna condición', icon: 'health_and_safety' },
];

export const Step6Historial: React.FC<Step6HistorialProps> = ({
  onBack,
  onReset,
  patient,
  setPatient,
  showToast,
  onPassGenerated,
}) => {
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    patient.chronicConditions?.length ? patient.chronicConditions : ['Cardiopatía previa']
  );
  const [tobacco, setTobacco] = useState<string>(patient.tobacco || 'No fuma');
  const [alcohol, setAlcohol] = useState<string>(patient.alcohol || 'Ocasional');
  const [surgeries, setSurgeries] = useState<string>(patient.surgeries || 'Ninguna reciente');
  const [medications, setMedications] = useState<string[]>(
    patient.medications?.length ? patient.medications : ['Losartán 50mg / 24h', 'Aspirina 100mg']
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showFinalPass, setShowFinalPass] = useState<boolean>(false);
  const [passNumber] = useState<string>(
    () => `TRIAJE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-MINSA`
  );

  const toggleCondition = (conditionTitle: string) => {
    if (conditionTitle === 'Ninguna condición') {
      setSelectedConditions(['Ninguna condición']);
      setPatient((prev) => ({ ...prev, chronicConditions: ['Ninguna condición'] }));
      showToast('Sin antecedentes crónicos registrados', 'fa-shield-halved');
      return;
    }

    let next: string[];
    const cleaned = selectedConditions.filter((c) => c !== 'Ninguna condición');
    if (cleaned.includes(conditionTitle)) {
      next = cleaned.filter((c) => c !== conditionTitle);
    } else {
      next = [...cleaned, conditionTitle];
    }
    setSelectedConditions(next);
    setPatient((prev) => ({ ...prev, chronicConditions: next }));
  };

  const cycleTobacco = () => {
    const states = ['No fuma', 'Fumador activo', 'Ex-fumador'];
    const idx = (states.indexOf(tobacco) + 1) % states.length;
    setTobacco(states[idx]);
    setPatient((prev) => ({ ...prev, tobacco: states[idx] }));
    showToast(`Hábito tabaco: ${states[idx]}`, 'fa-smoking');
  };

  const cycleAlcohol = () => {
    const states = ['Ocasional', 'Frecuente', 'Ninguno'];
    const idx = (states.indexOf(alcohol) + 1) % states.length;
    setAlcohol(states[idx]);
    setPatient((prev) => ({ ...prev, alcohol: states[idx] }));
    showToast(`Consumo alcohol: ${states[idx]}`, 'fa-wine-glass');
  };

  const cycleSurgeries = () => {
    const states = ['Ninguna reciente', 'Cirugía < 6m', 'Cirugía mayor previa'];
    const idx = (states.indexOf(surgeries) + 1) % states.length;
    setSurgeries(states[idx]);
    setPatient((prev) => ({ ...prev, surgeries: states[idx] }));
    showToast(`Cirugías: ${states[idx]}`, 'fa-syringe');
  };

  const removeMedication = (med: string) => {
    const next = medications.filter((m) => m !== med);
    setMedications(next);
    setPatient((prev) => ({ ...prev, medications: next }));
  };

  const addMedication = () => {
    const medName = prompt('Ingrese el nombre y dosis del medicamento:', 'Omeprazol 20mg');
    if (medName && medName.trim()) {
      const next = [...medications, medName.trim()];
      setMedications(next);
      setPatient((prev) => ({ ...prev, medications: next }));
      showToast(`Medicación agregada: ${medName.trim()}`, 'fa-pills');
    }
  };

  const handleGeneratePass = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowFinalPass(true);

      if (onPassGenerated) {
        onPassGenerated({
          id: passNumber,
          date: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          patient: patient.fullName || 'Valeria Sofía Mendoza Alarcón',
          dni: patient.dni || '72849102',
          category: 'PRIORIDAD II • URGENTE',
          type: 'general',
          diagnosis: `${patient.primarySymptom || 'Dolor Torácico'} (${patient.symptomDuration || '< 24h'})`,
          facility: patient.selectedCenter?.name || 'C.S. San Isidro (I-3)',
          eva: `${patient.evaScore || 6}/10`,
          status: 'Turno Confirmado',
        });
      }

      showToast('Pase Digital QR generado con éxito', 'fa-qrcode');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1800);
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto space-y-5 pb-24">
      {/* Patient Telemetry & Progress Strip */}
      <div className="w-full rounded-squircle bg-white/80 dark:bg-[#191c21]/80 backdrop-blur-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-white cursor-pointer mr-0.5"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            </button>
            <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-blue-500 dark:text-[#aac7ff] text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                person
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                {patient.fullName || 'Valeria Mendoza'} • {patient.age || 28}a
              </span>
              <span className="font-mono text-[11px] text-rose-500 dark:text-[#ffb3b5] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                {patient.primarySymptom || 'Dolor Torácico'} (EVA {patient.evaScore || 6}/10)
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className="font-mono text-[10px] text-blue-500 dark:text-[#aac7ff] font-bold">
              100% COMPLETADO
            </span>
            <span className="text-[11px] text-slate-400">Fase Final</span>
          </div>
        </div>

        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-3 overflow-hidden">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-400 shadow-[0_0_12px_rgba(62,144,255,0.7)]"></div>
        </div>
      </div>

      {!showFinalPass ? (
        <>
          {/* Screen Header Narrative */}
          <div className="space-y-1.5 px-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 font-mono text-[10px] text-blue-500 dark:text-[#aac7ff] tracking-widest uppercase font-bold">
                Paso 6 de 6
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-zinc-400 tracking-wider uppercase font-bold">
                Historial Clínico
              </span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">
              ¿Tienes antecedentes o condiciones previas?
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Indica condiciones clave para calibrar con precisión el algoritmo de triaje médico NTS-MINSA.
            </p>
          </div>

          {/* Medical Conditions Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Condiciones crónicas conocidas
              </span>
              <span className="font-mono text-[11px] text-blue-500 dark:text-[#aac7ff]">
                Toca para seleccionar
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {CONDITIONS_LIST.map((cond) => {
                const isSelected = selectedConditions.includes(cond.title);
                return (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => toggleCondition(cond.title)}
                    className={`w-full text-left p-3.5 rounded-squircle backdrop-blur-xl transition-all duration-200 active:scale-95 flex flex-col justify-between gap-3 shadow-md border cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 shadow-[0_0_24px_rgba(0,102,255,0.25)]'
                        : 'bg-white/80 dark:bg-[#1d2025]/60 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-blue-500 dark:text-[#aac7ff]'
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[19px]"
                          style={{ fontVariationSettings: isSelected ? "'FILL' 1" : undefined }}
                        >
                          {cond.icon}
                        </span>
                      </div>
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          isSelected ? 'text-blue-500 dark:text-[#aac7ff]' : 'text-slate-400'
                        }`}
                        style={{ fontVariationSettings: isSelected ? "'FILL' 1" : undefined }}
                      >
                        check_circle
                      </span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm text-slate-900 dark:text-white font-medium leading-snug block">
                        {cond.title}
                      </span>
                      {cond.subtitle && (
                        <span className="font-mono text-[10px] text-blue-500 dark:text-[#aac7ff]">
                          {cond.subtitle}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Habits & Risk Triggers */}
          <div className="rounded-squircle bg-white/80 dark:bg-[#191c21]/80 backdrop-blur-2xl p-4 space-y-3.5 shadow-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500 dark:text-[#aac7ff] text-[20px]">
                monitor_heart
              </span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Factores de riesgo &amp; hábitos
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Habit: Tabaco */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-zinc-300">
                    <span className="material-symbols-outlined text-[17px]">smoking_rooms</span>
                  </div>
                  <span className="text-xs text-slate-900 dark:text-white font-medium">
                    Consumo de tabaco
                  </span>
                </div>
                <button
                  type="button"
                  onClick={cycleTobacco}
                  className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 font-mono text-xs text-slate-700 dark:text-zinc-300 active:scale-95 transition-all cursor-pointer font-semibold"
                >
                  {tobacco}
                </button>
              </div>

              {/* Habit: Alcohol */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-zinc-300">
                    <span className="material-symbols-outlined text-[17px]">local_bar</span>
                  </div>
                  <span className="text-xs text-slate-900 dark:text-white font-medium">
                    Consumo de alcohol
                  </span>
                </div>
                <button
                  type="button"
                  onClick={cycleAlcohol}
                  className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 font-mono text-xs text-slate-700 dark:text-zinc-300 active:scale-95 transition-all cursor-pointer font-semibold"
                >
                  {alcohol}
                </button>
              </div>

              {/* Habit: Cirugías */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-zinc-300">
                    <span className="material-symbols-outlined text-[17px]">medical_services</span>
                  </div>
                  <span className="text-xs text-slate-900 dark:text-white font-medium">
                    Cirugías previas
                  </span>
                </div>
                <button
                  type="button"
                  onClick={cycleSurgeries}
                  className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 font-mono text-xs text-slate-700 dark:text-zinc-300 active:scale-95 transition-all cursor-pointer font-semibold"
                >
                  {surgeries}
                </button>
              </div>

              {/* Alergias Destacadas */}
              <div className="p-2.5 rounded-xl bg-rose-500/10 flex items-center justify-between border border-rose-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-500">
                    <span
                      className="material-symbols-outlined text-[17px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      warning
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-900 dark:text-white font-medium">
                      Alergia medicamentosa
                    </span>
                    <span className="font-mono text-[11px] text-rose-500 font-bold">
                      Penicilinas reportadas
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-500 font-mono text-[11px] font-bold">
                  Activo
                </span>
              </div>
            </div>
          </div>

          {/* Regular Medication Pocket */}
          <div className="rounded-squircle bg-white/80 dark:bg-[#191c21]/80 backdrop-blur-2xl p-4 space-y-3 shadow-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500 dark:text-[#aac7ff] text-[20px]">
                  pill
                </span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Medicación habitual
                </span>
              </div>
              <button
                type="button"
                onClick={addMedication}
                className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 dark:text-[#aac7ff] active:scale-90 transition-all cursor-pointer hover:bg-blue-600 hover:text-white"
              >
                <span className="material-symbols-outlined text-[17px]">add</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {medications.map((med) => (
                <div
                  key={med}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium border border-slate-200 dark:border-slate-700"
                >
                  <span className="font-mono text-blue-500 text-[12px]">●</span>
                  <span>{med}</span>
                  <button
                    type="button"
                    onClick={() => removeMedication(med)}
                    className="text-slate-400 hover:text-rose-500 ml-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* AI Readiness Pulse Banner */}
          <div className="w-full rounded-squircle bg-gradient-to-r from-blue-500/15 to-sky-500/10 p-3.5 backdrop-blur-2xl flex items-center gap-3 shadow-xl border border-blue-500/30">
            <div className="w-9 h-9 rounded-full bg-blue-500/25 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-blue-500 dark:text-[#aac7ff] text-[20px] animate-pulse"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                Calibración clínica lista
              </span>
              <span className="font-mono text-[11px] text-blue-500 dark:text-[#aac7ff] truncate">
                Prioridad NTS-MINSA en tiempo real
              </span>
            </div>
            <div className="shrink-0 ml-auto">
              <span className="material-symbols-outlined text-blue-500 dark:text-[#aac7ff] text-[18px]">
                verified
              </span>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleGeneratePass}
              className="w-full h-14 rounded-full bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(0,102,255,0.65)] hover:shadow-[0_0_36px_rgba(0,102,255,0.85)] active:scale-[0.98] transition-all cursor-pointer text-sm sm:text-base"
            >
              <span>Finalizar y Generar Pase Digital QR</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
            <p className="font-mono text-[11px] text-center text-slate-400">
              Protocolo seguro encriptado • EsSalud / MINSA Triaje Digital
            </p>
          </div>
        </>
      ) : (
        /* ================= GENERAL TRIAGE DIGITAL MEDICAL PASS ================= */
        <div className="space-y-6 pt-2">
          <div className="text-center space-y-1.5 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 squircle-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 text-xs font-extrabold border border-blue-300 dark:border-blue-800">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span>ORDEN DE ATENCIÓN PRIORIZADA EMITIDA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Pase Digital de Consulta y Triaje
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Presente este código en ventanilla de admisión o triaje para atención expedita.
            </p>
          </div>

          {/* Pass Card */}
          <div className="liquid-glass-card squircle-lg p-6 sm:p-7 max-w-md mx-auto relative overflow-hidden shadow-[0_20px_50px_rgba(0,102,255,0.2)] border-2 border-blue-500/40">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 squircle-sm bg-blue-600 flex items-center justify-center text-white text-base shadow">
                  <i className="fa-solid fa-notes-medical"></i>
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    SISTEMA DE TRIAJE DIGITAL
                  </div>
                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    MINSA / ESSALUD • NTS-124
                  </div>
                </div>
              </div>
              <div className="px-3 py-1 squircle-full text-[11px] font-black tracking-wider uppercase bg-blue-600 text-white shadow">
                PRIORIDAD II • URGENTE
              </div>
            </div>

            {/* QR Code Container */}
            <div className="my-4 flex flex-col items-center justify-center">
              <div className="p-3 bg-white squircle-md shadow-inner border-2 border-blue-300 flex items-center justify-center relative w-52 h-52">
                <VectorQRCode
                  dataString={stringifyQrPayload({
                    schema: 'triajeia-peru/v1',
                    type: 'CONSULTA_AMBULATORIA',
                    id: passNumber,
                    date: new Date().toISOString().slice(0, 10),
                    patient: {
                      fullName: patient.fullName || 'Valeria Sofía Mendoza Alarcón',
                      dni: patient.dni || '72849102',
                      age: patient.age || 28,
                      sex: patient.sex || 'F',
                    },
                    consultationType: patient.consultaTipo || 'sintoma',
                    priority: 'PRIORIDAD II',
                    eva: patient.evaScore ?? 6,
                    symptoms: {
                      bodyZone: patient.bodyZone || patient.primarySymptom || 'Dolor Torácico',
                      description: patient.symptomDescription || patient.primarySymptom || 'Dolor Torácico',
                      duration: patient.symptomDuration || '< 24 horas',
                    },
                    location: {
                      address: patient.selectedCenter?.address || patient.selectedCenter?.name || 'Centro de salud asignado',
                      lat: patient.selectedCenter?.lat ?? null,
                      lng: patient.selectedCenter?.lng ?? null,
                    },
                    facility: patient.selectedCenter?.name || 'C.S. San Isidro (I-3)',
                    medicalHistory: {
                      conditions: patient.chronicConditions || [],
                      allergies: patient.allergiesDrug || patient.allergies || 'No registradas',
                      medications: patient.dailyMedications || patient.medications || [],
                    },
                  })}
                  isEmergency={false}
                />
                <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-blue-600 text-white font-extrabold text-[9px] shadow">
                  ATENCIÓN HOY
                </div>
              </div>
              <div className="mt-2.5 text-center">
                <div className="mb-1 max-w-[260px] text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">DNI:</span> {maskDniForDisplay(patient.dni || '72849102')} <span aria-hidden="true">·</span>{' '}
                  <span className="font-semibold">Prioridad:</span> PRIORIDAD II<br />
                  <span className="font-semibold">Síntomas:</span>{' '}
                  {patient.symptomDescription || patient.primarySymptom || patient.bodyZone || 'Dolor Torácico'}
                </div>
                <span className="text-sm font-mono font-black text-blue-600 dark:text-blue-400 tracking-wider">
                  {passNumber}
                </span>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Turno Asignado • C.S. San Isidro (I-3)
                </div>
              </div>
            </div>

            {/* Patient & Admission Info */}
            <div className="space-y-2 bg-white/70 dark:bg-slate-900/70 p-3.5 squircle-md border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Paciente:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {patient.fullName || 'Valeria Sofía Mendoza Alarcón'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">DNI:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {maskDniForDisplay(patient.dni || '72849102')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Síntoma:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {patient.primarySymptom || 'Dolor Torácico'} ({patient.symptomDuration || '< 24 horas'})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Escala EVA:</span>
                <span className="font-black text-amber-500">
                  {patient.evaScore || 6} / 10 ({patient.painType || 'Opresivo'})
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-0.5">
                <span className="text-slate-500 dark:text-slate-400">Centro Médico:</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 leading-snug">
                  {patient.selectedCenter?.name || 'C.S. San Isidro (I-3)'} - Consultorio Medicina General
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => showToast(`Pase de Atención guardado: ${passNumber}`, 'fa-floppy-disk')}
                className="flex-1 py-3.5 squircle-md bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs press-tactile transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                <i className="fa-solid fa-download"></i>
                <span>Descargar Pase Digital</span>
              </button>
              <button
                type="button"
                onClick={onReset}
                className="py-3.5 px-4 squircle-md liquid-glass-card-subtle text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 font-bold text-xs press-tactile transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-rotate-left"></i>
                <span>Nuevo Triaje</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal / Loading Screen */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-[#0b0f17]/85 backdrop-blur-3xl flex items-center justify-center p-6 transition-all duration-300">
          <div className="w-full max-w-sm rounded-squircle bg-white dark:bg-[#1d2025] p-6 text-center space-y-4 shadow-2xl border border-blue-500/30">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 shadow-[0_0_32px_rgba(0,102,255,0.5)]">
              <span
                className="material-symbols-outlined text-[36px] animate-spin"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                qr_code_2
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Generando Pase de Atención...
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {patient.fullName || 'Valeria Mendoza'} clasificada para Prioridad II en Urgencias.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 font-mono text-xs text-blue-500 dark:text-[#aac7ff] flex items-center justify-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-[16px] animate-spin">
                progress_activity
              </span>
              <span>Asignando turno en hospital de red...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
