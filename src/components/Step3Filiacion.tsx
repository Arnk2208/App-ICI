import React, { useState } from 'react';
import { PatientData } from '../types';
import { lookupDni } from '../services/dniLookup';

interface Step3FiliacionProps {
  onNext: () => void;
  onBack: () => void;
  patient: PatientData;
  setPatient: React.Dispatch<React.SetStateAction<PatientData>>;
  showToast: (msg: string, icon?: string) => void;
  onSelectCenterChange: () => void;
}

export const Step3Filiacion: React.FC<Step3FiliacionProps> = ({
  onNext,
  onBack,
  patient,
  setPatient,
  showToast,
  onSelectCenterChange,
}) => {
  const [docType, setDocType] = useState<string>('DNI');
  const [isValidatingReniec, setIsValidatingReniec] = useState<boolean>(false);
  const [lookupMessage, setLookupMessage] = useState<string>('');

  const handleBeneficiaryChange = (type: 'self' | 'other') => {
    if (type === 'self') {
      setPatient((prev) => ({
        ...prev,
        beneficiaryType: 'self',
      }));
      showToast('Completa tus datos o consulta tu DNI', 'fa-user');
    } else {
      setPatient((prev) => ({
        ...prev,
        beneficiaryType: 'other',
        fullName: '',
        dni: '',
        age: '',
        sex: '',
      }));
      setLookupMessage('');
      showToast('Filiación para Tercero o Familiar', 'fa-users');
    }
  };

  const handleDniLookup = async () => {
    if (!/^\d{8}$/.test(patient.dni)) {
      setLookupMessage('Ingresa los 8 dígitos del DNI para consultar.');
      return;
    }
    setIsValidatingReniec(true);
    setLookupMessage('Consultando datos...');
    try {
      const result = await lookupDni(patient.dni);
      setPatient((prev) => ({
        ...prev,
        fullName: result.fullName || prev.fullName,
        age: result.age ?? prev.age,
        sex: result.sex || prev.sex,
      }));
      setLookupMessage(result.fullName
        ? 'Nombre encontrado. Puedes editar todos los datos.'
        : 'La consulta no devolvió datos; completa el formulario manualmente.');
    } catch (error) {
      setLookupMessage(error instanceof Error ? error.message : 'No se pudo consultar. Completa los datos manualmente.');
    } finally {
      setIsValidatingReniec(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto space-y-5 pb-24">
      {/* Top Spatial Sub-bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          aria-label="Volver al paso anterior"
          onClick={onBack}
          className="h-10 w-10 rounded-full bg-slate-800/80 backdrop-blur-2xl text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 backdrop-blur-2xl shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#aac7ff] shadow-[0_0_8px_#aac7ff]"></span>
          <span className="font-mono text-[11px] text-white uppercase tracking-wider font-semibold">
            PASO 3 DE 6
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold">
            FILIACIÓN
          </span>
        </div>

        <div className="w-10" aria-hidden="true" />
      </div>

      {/* Header Title Cluster */}
      <div className="flex flex-col gap-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-blue-500 dark:text-[#aac7ff] font-mono text-[10px] tracking-widest uppercase font-bold">
            DATOS PERSONALES
          </span>
        </div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">
          ¿Quién recibirá la atención?
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Ingresa los datos para registrar la cita en el centro de salud.
        </p>
      </div>

      {/* Beneficiary Segmented Spatial Glass Control */}
      <div className="p-1 rounded-squircle bg-slate-200 dark:bg-[#0c0e13]/70 backdrop-blur-3xl shadow-xl flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleBeneficiaryChange('self')}
          className={`flex-1 py-2.5 px-4 rounded-full font-body text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            patient.beneficiaryType === 'self'
              ? 'bg-blue-600 text-white shadow-[0_0_24px_rgba(0,102,255,0.35)]'
              : 'text-slate-500 dark:text-zinc-400 hover:text-white'
          }`}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            person
          </span>
          <span>Para mí</span>
        </button>

        <button
          type="button"
          onClick={() => handleBeneficiaryChange('other')}
          className={`flex-1 py-2.5 px-4 rounded-full font-body text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            patient.beneficiaryType === 'other'
              ? 'bg-blue-600 text-white shadow-[0_0_24px_rgba(0,102,255,0.35)]'
              : 'text-slate-500 dark:text-zinc-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">group</span>
          <span>Familiar / Tercero</span>
        </button>
      </div>

      {/* Selected Healthcare Center Mini Hologram Pill */}
      <div className="p-3 rounded-squircle bg-white/70 dark:bg-[#282a30]/50 backdrop-blur-2xl shadow-md flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-500 dark:text-[#aac7ff] flex items-center justify-center shrink-0 shadow-inner">
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_hospital
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-[10px] text-blue-600 dark:text-[#aac7ff] tracking-wider uppercase truncate font-bold">
              Centro seleccionado
            </span>
            <span className="text-xs sm:text-sm text-slate-900 dark:text-white font-semibold truncate">
              {patient.selectedCenter?.name || 'C.S. San Isidro (I-3)'} • Presencial hoy
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onSelectCenterChange}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 text-blue-600 dark:text-[#aac7ff] font-mono text-[11px] font-bold transition-colors cursor-pointer"
        >
          Cambiar
        </button>
      </div>

      {/* Primary Form: Multi-field Glass Card */}
      <div className="p-5 rounded-squircle bg-white/80 dark:bg-[#1d2025]/60 backdrop-blur-3xl shadow-2xl flex flex-col gap-4 relative overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none"></div>

        {/* Field 1: Document Type & Number */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between font-bold">
            <span>Documento de Identidad</span>
            <span className="text-blue-500 dark:text-[#aac7ff] font-mono text-[10px]">
              Consulta DNI
            </span>
          </label>
          <div className="flex items-center gap-2">
            <div className="relative w-28 shrink-0">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full h-12 appearance-none rounded-xl bg-slate-100 dark:bg-[#0c0e13]/80 text-slate-900 dark:text-white font-body text-sm pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-800"
              >
                <option value="DNI">DNI</option>
                <option value="CE">C.E.</option>
                <option value="PAS">Pasaporte</option>
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-3 text-slate-400 text-[18px]">
                expand_more
              </span>
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={patient.dni}
                onChange={(e) => {
                  setLookupMessage('');
                  setPatient((prev) => ({ ...prev, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }));
                }}
                placeholder="8 dígitos"
                aria-label="DNI, solo números"
                className="w-full h-12 rounded-xl bg-slate-100 dark:bg-[#0c0e13]/80 text-slate-900 dark:text-white font-mono text-sm px-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-800"
              />
              <button
                type="button"
                onClick={handleDniLookup}
                title="Consultar datos del DNI"
                disabled={isValidatingReniec}
                className="absolute right-2 top-2 h-8 px-2.5 rounded-lg bg-blue-500/20 text-blue-500 dark:text-[#aac7ff] hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer font-bold disabled:opacity-60"
              >
                <span
                  className={`material-symbols-outlined text-[15px] ${
                    isValidatingReniec ? 'animate-spin' : ''
                  }`}
                >
                  {isValidatingReniec ? 'progress_activity' : 'search'}
                </span>
                <span className="font-mono text-[10px]">
                  {isValidatingReniec ? '...' : 'BUSCAR'}
                </span>
              </button>
            </div>
          </div>
          {lookupMessage && <p role="status" className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{lookupMessage}</p>}
        </div>

        {/* Field 2: Full Name */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
              Nombres y Apellidos
            </label>
            <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400 font-bold">
              Editable
            </span>
          </div>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-blue-500 dark:text-[#aac7ff] text-[20px]">
              person
            </span>
            <input
              type="text"
              value={patient.fullName}
              onChange={(e) => setPatient((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="Nombres y apellidos completos"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-slate-100 dark:bg-[#0c0e13]/80 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>

        {/* Field 3: Age & Biological Sex Selector */}
        <div className="grid grid-cols-2 gap-3">
          {/* Age entry */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
              Edad Cumplida
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              value={patient.age}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                setPatient((prev) => ({ ...prev, age: value ? Number(value) : '' }));
              }}
              placeholder="Edad"
              aria-label="Edad en años"
              className="w-full h-12 rounded-xl bg-slate-100 dark:bg-[#0c0e13]/80 px-3 text-slate-900 dark:text-white font-mono text-sm border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Biological Sex */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
              Sexo Biológico
            </label>
            <div className="h-12 p-1 rounded-xl bg-slate-100 dark:bg-[#0c0e13]/80 flex items-center gap-1 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPatient((prev) => ({ ...prev, sex: 'F' }))}
                className={`flex-1 h-full rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  patient.sex === 'F'
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(0,102,255,0.3)]'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-white'
                }`}
              >
                <span>F</span>
                <span className="text-[10px] opacity-80">(Fem)</span>
              </button>
              <button
                type="button"
                onClick={() => setPatient((prev) => ({ ...prev, sex: 'M' }))}
                className={`flex-1 h-full rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  patient.sex === 'M'
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(0,102,255,0.3)]'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-white'
                }`}
              >
                <span>M</span>
                <span className="text-[10px] opacity-80">(Masc)</span>
              </button>
            </div>
          </div>
        </div>

        {/* WhatsApp / SMS Confirmation */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
              Teléfono / WhatsApp
            </label>
            <span className="font-mono text-[10px] text-slate-400 font-normal">
              Confirmación de turno
            </span>
          </div>
          <div className="relative flex items-center">
            <div className="absolute left-3 flex items-center gap-1.5 text-slate-400 pointer-events-none">
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span className="font-mono text-sm text-slate-400">+51</span>
            </div>
            <input
              type="tel"
              maxLength={9}
              value={patient.phone}
              onChange={(e) => setPatient((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="987 654 321"
              className="w-full h-12 pl-20 pr-4 rounded-xl bg-slate-100 dark:bg-[#0c0e13]/80 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Safety Indicator Banner */}
      <div className="px-4 py-3 rounded-squircle bg-slate-200/60 dark:bg-[#0c0e13]/50 backdrop-blur-xl shadow-inner flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 dark:text-[#aac7ff] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[18px]">speed</span>
        </div>
        <p className="text-xs leading-tight text-slate-600 dark:text-zinc-400">
          La filiación biológica agiliza el cálculo automático de signos de alarma en los siguientes pasos clínicos.
        </p>
      </div>

      {/* CTA Button */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onNext}
          className="w-full h-14 rounded-full bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white font-semibold shadow-[0_0_36px_rgba(0,102,255,0.45)] hover:shadow-[0_0_46px_rgba(0,102,255,0.65)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer text-sm sm:text-base"
        >
          <span>Continuar a Nivel de Dolor (Paso 4)</span>
          <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
            arrow_forward
          </span>
        </button>

        {/* Progress micro-bar */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="w-1/2 h-full rounded-full bg-blue-500 shadow-[0_0_8px_#aac7ff]"></div>
          </div>
          <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            Paso 3 completado de 6
          </span>
        </div>
      </div>
    </div>
  );
};
