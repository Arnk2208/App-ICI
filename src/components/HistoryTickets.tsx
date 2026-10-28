import React, { useState, useEffect } from 'react';
import { PassRecord, UserProfile, DoctorOrder } from '../types';
import { VectorQRCode } from './VectorQRCode';
import { DoctorQRScannerModal } from './DoctorQRScannerModal';
import { maskDniForDisplay, stringifyQrPayload } from '../utils/qrPayload';

interface HistoryTicketsProps {
  userPasses: PassRecord[];
  onNewTriage: () => void;
  showToast: (msg: string, icon?: string) => void;
  profile: UserProfile;
  onProfileUpdated: (updatedProfile: UserProfile) => void;
}

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export const HistoryTickets: React.FC<HistoryTicketsProps> = ({
  userPasses,
  onNewTriage,
  showToast,
  profile,
  onProfileUpdated,
}) => {
  const [activeSection, setActiveSection] = useState<'pases' | 'perfil'>('pases');
  const [selectedTicket, setSelectedTicket] = useState<PassRecord | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Profile Form Local State
  const [firstName, setFirstName] = useState<string>(profile.firstName || '');
  const [lastName, setLastName] = useState<string>(profile.lastName || '');
  const [dni, setDni] = useState<string>(profile.dni || '');
  const [age, setAge] = useState<number | ''>(profile.age ?? '');
  const [sex, setSex] = useState<'F' | 'M' | ''>(profile.sex || '');
  const [bloodType, setBloodType] = useState<string>(profile.bloodType || 'O+');
  const [allergies, setAllergies] = useState<string>(profile.allergies || '');
  const [emergencyContact, setEmergencyContact] = useState<string>(profile.emergencyContact || '');

  // Persistent Doctor Orders History (localStorage)
  const [doctorOrders, setDoctorOrders] = useState<DoctorOrder[]>(() => {
    try {
      const saved = localStorage.getItem('aether_medical_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse doctor orders from localStorage:', e);
    }
    return [];
  });

  // Sync profile when prop changes
  useEffect(() => {
    setFirstName(profile.firstName || '');
    setLastName(profile.lastName || '');
    setDni(profile.dni || '');
    setAge(profile.age ?? '');
    setSex(profile.sex || '');
    setBloodType(profile.bloodType || 'O+');
    setAllergies(profile.allergies || '');
    setEmergencyContact(profile.emergencyContact || '');
  }, [profile]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    if (!dni || dni.length !== 8) {
      showToast('El DNI debe contener exactamente 8 dígitos', 'fa-triangle-exclamation');
      return;
    }

    const updatedProfile: UserProfile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dni: dni.trim(),
      age: typeof age === 'number' ? age : parseInt(age as string) || '',
      sex: sex || 'F',
      bloodType,
      allergies: allergies.trim(),
      emergencyContact: emergencyContact.trim(),
    };

    localStorage.setItem('aether_patient_profile', JSON.stringify(updatedProfile));
    onProfileUpdated(updatedProfile);
    showToast('Perfil clínico guardado y actualizado con éxito', 'fa-check');
  };

  const handleOrderImported = (newOrder: DoctorOrder) => {
    const updated = [newOrder, ...doctorOrders];
    setDoctorOrders(updated);
    try {
      localStorage.setItem('aether_medical_history', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  };

  const hasProfileData = Boolean(profile.firstName || profile.lastName || profile.dni);

  return (
    <div className="w-full max-w-md mx-auto space-y-5 pt-2 pb-24">
      {/* Header & Section Segmenter */}
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 dark:text-[#aac7ff] text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>EXPEDIENTE DIGITAL & HISTORIAL</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
            Perfil &amp; Mis Pases
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Administra tu perfil clínico personal y consulta tus pases y órdenes médicas.
          </p>
        </div>

        {/* VisionOS-style Glass Segmented Switcher */}
        <div className="p-1 rounded-full bg-slate-200 dark:bg-slate-900 flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveSection('pases')}
            className={`flex-1 py-2.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSection === 'pases'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-zinc-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-receipt"></i>
            <span>Pases &amp; Órdenes ({userPasses.length + doctorOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('perfil')}
            className={`flex-1 py-2.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSection === 'perfil'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-zinc-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-user-pen"></i>
            <span>Mi Perfil Clínico</span>
          </button>
        </div>
      </div>

      {/* ================= SECTION 1: PASES & HISTORIAL ================= */}
      {activeSection === 'pases' && (
        <div className="space-y-4">
          {/* Prominent Action Button: Escanear QR del Doctor */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            <i className="fa-solid fa-camera text-lg"></i>
            <span>Escanear QR del Doctor</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/20 uppercase tracking-wider">
              Importar Orden
            </span>
          </button>

          {/* User Profile Mini Banner */}
          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 dark:text-[#aac7ff] flex items-center justify-center font-bold text-sm shrink-0">
                <i className="fa-solid fa-user"></i>
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {hasProfileData
                    ? `${profile.firstName} ${profile.lastName}`.trim() || 'Usuario Personal'
                    : 'Sin perfil registrado'}
                </div>
                <div className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                  {profile.dni ? `DNI: ${profile.dni}` : 'Completa tu perfil para auto-llenado'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSection('perfil')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2"
            >
              {hasProfileData ? 'Editar' : 'Completar'}
            </button>
          </div>

          {/* Doctor Orders Section (if any imported) */}
          {doctorOrders.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                  <i className="fa-solid fa-file-prescription"></i>
                  <span>Órdenes Médicas Importadas</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {doctorOrders.length} {doctorOrders.length === 1 ? 'orden' : 'órdenes'}
                </span>
              </div>

              <div className="space-y-2.5">
                {doctorOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 shadow-md space-y-2.5"
                  >
                    <div className="flex items-start justify-between pb-2 border-b border-emerald-200 dark:border-emerald-900/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-extrabold">
                            ORDEN MÉDICA
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {ord.id}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                          {ord.date} • {ord.facility}
                        </div>
                      </div>

                      <span className="text-emerald-500 font-bold text-xs flex items-center gap-1">
                        <i className="fa-solid fa-circle-check"></i>
                        <span>En HCE</span>
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-zinc-400">Médico: </span>
                        <strong className="text-slate-900 dark:text-white font-bold">
                          {ord.doctor} ({ord.specialty})
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-zinc-400">Diagnóstico: </span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {ord.diagnosis}
                        </span>
                      </div>

                      {/* Prescriptions */}
                      {ord.prescriptions && ord.prescriptions.length > 0 && (
                        <div className="pt-1 space-y-1">
                          <span className="font-mono text-[10px] text-slate-500 uppercase font-bold">
                            Receta / Medicación:
                          </span>
                          <div className="space-y-1 pl-1">
                            {ord.prescriptions.map((p, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-[11px] text-slate-800 dark:text-zinc-200"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                <span>{p}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lab Orders */}
                      {ord.labOrders && ord.labOrders.length > 0 && (
                        <div className="pt-1">
                          <span className="font-mono text-[10px] text-slate-500 uppercase font-bold">
                            Exámenes y Laboratorio:
                          </span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {ord.labOrders.map((lab, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-mono text-[10px]"
                              >
                                {lab}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated Passes Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-extrabold">
                Pases de Triaje y Consulta
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {userPasses.length} {userPasses.length === 1 ? 'pase' : 'pases'}
              </span>
            </div>

            {userPasses.length === 0 ? (
              <div className="p-8 text-center rounded-squircle bg-white/60 dark:bg-[#1d2025]/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <i className="fa-solid fa-receipt text-xl"></i>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    No tienes pases emitidos
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Inicia un triaje médico para agendar una consulta o generar tu pase con código QR.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNewTriage}
                  className="px-4 py-2 rounded-full bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all cursor-pointer"
                >
                  Iniciar Triaje
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {userPasses.map((t) => {
                  const isEmergency = t.type === 'emergency';
                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl transition-all shadow-md border ${
                        isEmergency
                          ? 'bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-900/60 shadow-[0_10px_30px_-5px_rgba(220,38,38,0.2)]'
                          : 'bg-white/80 dark:bg-[#1d2025]/80 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                        <div>
                          <span
                            className={`font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              isEmergency ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                            }`}
                          >
                            {t.category}
                          </span>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 font-mono">
                            {t.date}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedTicket(t)}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-blue-500 dark:text-[#aac7ff] hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <i className="fa-solid fa-qrcode text-[12px]"></i>
                          <span>Ver QR Real</span>
                        </button>
                      </div>

                      <div className="mt-2.5 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-zinc-400">Paciente:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {t.patient} ({t.dni})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-zinc-400">Motivo:</span>
                          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                            {t.diagnosis}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-zinc-400">Centro:</span>
                          <span className="font-medium text-slate-700 dark:text-zinc-300 truncate max-w-[200px]">
                            {t.facility}
                          </span>
                        </div>
                        {t.eva && (
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-zinc-400">Severidad:</span>
                            <span className={`font-bold ${isEmergency ? 'text-red-500' : 'text-blue-500'}`}>
                              {t.eva}
                            </span>
                          </div>
                        )}
                        {(t.gpsAddress || t.gpsCoords) && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                              <i className="fa-solid fa-location-dot text-blue-500 text-[10px]"></i>
                              <span>Ubicación:</span>
                            </span>
                            <span className="font-medium text-slate-700 dark:text-zinc-300 truncate max-w-[190px]">
                              {t.gpsAddress || `${t.gpsCoords?.lat}, ${t.gpsCoords?.lng}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Triage CTA */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onNewTriage}
              className="w-full py-4 rounded-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-700"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>Iniciar Nueva Consulta o Triaje</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= SECTION 2: EDITABLE PATIENT PROFILE ================= */}
      {activeSection === 'perfil' && (
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="p-5 rounded-squircle liquid-glass-card space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-address-card text-blue-500"></i>
                <span>Filiación del Titular</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-500 font-bold">
                Auto-llenado dinámico
              </span>
            </div>

            {/* Nombres y Apellidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1 font-mono">
                  Nombres *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej. Valeria Sofía"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1 font-mono">
                  Apellidos *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej. Mendoza Alarcón"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            {/* DNI & Edad */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1 font-mono">
                  DNI (8 dígitos) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  pattern="[0-9]{8}"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="72849102"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1 font-mono">
                  Edad (Años) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="28"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            {/* Sexo Biológico & Grupo Sanguíneo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1 font-mono">
                  Sexo Biológico *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSex('F')}
                    className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      sex === 'F'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    Femenino
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('M')}
                    className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      sex === 'M'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    Masculino
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1 font-mono">
                  Grupo Sanguíneo
                </label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs focus:outline-none border border-slate-200 dark:border-slate-700"
                >
                  {BLOOD_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Alergias Conocidas */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1 font-mono">
                Alergias Conocidas (Medicamentos o Alimentos)
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Ej. Penicilina, AINEs, Mariscos o Sin Alergias"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Contacto de Emergencia */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1 font-mono">
                Contacto de Emergencia (Nombre y Teléfono)
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Ej. Carlos Mendoza (Hermano) - 984 210 594"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-floppy-disk"></i>
            <span>Guardar Perfil en este Dispositivo</span>
          </button>
        </form>
      )}

      {/* QR Inspection Modal with Real Scannable Vector QR */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-[#0b0f17]/85 backdrop-blur-3xl flex items-center justify-center p-4 transition-all">
          <div className="w-full max-w-sm rounded-squircle bg-white dark:bg-[#1d2025] p-5 sm:p-6 text-center space-y-4 shadow-2xl border border-slate-300 dark:border-slate-700">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {selectedTicket.id}
              </span>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Real Scannable Vector SVG QR */}
            <div className="w-52 h-52 mx-auto p-3 bg-white rounded-2xl shadow-inner border-2 border-slate-200 flex items-center justify-center">
              <VectorQRCode
                dataString={stringifyQrPayload({
                  schema: 'triajeia-peru/v1',
                  passId: selectedTicket.id,
                  patient: selectedTicket.patient,
                  dni: selectedTicket.dni,
                  category: selectedTicket.category,
                  priority: selectedTicket.priorityLevel ?? selectedTicket.category,
                  diagnosis: selectedTicket.diagnosis,
                  facility: selectedTicket.facility,
                  eva: selectedTicket.eva ?? '',
                  location: {
                    address: selectedTicket.gps?.address ?? selectedTicket.gpsAddress ?? '',
                    lat: selectedTicket.gps?.lat ?? selectedTicket.gpsCoords?.lat ?? null,
                    lng: selectedTicket.gps?.lng ?? selectedTicket.gpsCoords?.lng ?? null,
                  },
                  sbar: selectedTicket.sbar ?? null,
                })}
                isEmergency={selectedTicket.type === 'emergency'}
              />
            </div>

            <div className="space-y-1 text-left text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400">Paciente: </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedTicket.patient} (DNI: {maskDniForDisplay(selectedTicket.dni)})
                </span>
              </div>
              <div>
                <span className="text-slate-400">Centro: </span>
                <span className="font-medium text-slate-700 dark:text-zinc-300">
                  {selectedTicket.facility}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Prioridad: </span>
                <span className="font-bold text-blue-500 dark:text-[#aac7ff]">
                  {selectedTicket.category}
                </span>
              </div>
              {(selectedTicket.gpsAddress || selectedTicket.gpsCoords) && (
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Origen GPS: </span>
                  <a
                    href={
                      selectedTicket.gpsCoords
                        ? `https://maps.google.com/?q=${selectedTicket.gpsCoords.lat},${selectedTicket.gpsCoords.lng}`
                        : `https://maps.google.com/?q=${encodeURIComponent(selectedTicket.gpsAddress || '')}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline font-bold text-[11px] truncate max-w-[190px] flex items-center gap-1"
                  >
                    <span>{selectedTicket.gpsAddress || `${selectedTicket.gpsCoords?.lat}, ${selectedTicket.gpsCoords?.lng}`}</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                  </a>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                showToast(`Pase verificado: ${selectedTicket.id}`, 'fa-check');
                setSelectedTicket(null);
              }}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all cursor-pointer"
            >
              Cerrar Visor QR
            </button>
          </div>
        </div>
      )}

      {/* Reverse QR Camera Scanner Modal */}
      <DoctorQRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onOrderImported={handleOrderImported}
        showToast={showToast}
      />
    </div>
  );
};
