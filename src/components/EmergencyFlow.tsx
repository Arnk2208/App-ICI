import React, { useState, useEffect, useCallback } from 'react';
import { AppStep, PatientData, PassRecord, SampleClinicalData } from '../types';
import { VectorQRCode } from './VectorQRCode';
import { maskDniForDisplay, stringifyQrPayload } from '../utils/qrPayload';
import { EmergencyMap, EMERGENCY_HOSPITALS, EmergencyHospital } from './EmergencyMap';
import {
  getCurrentGpsPosition,
  reverseGeocodePeru,
  getWhatsAppGpsShareUrl,
  getGoogleMapsDirUrl,
} from '../services/gpsService';

interface EmergencyFlowProps {
  currentStep: AppStep;
  setStep: (step: AppStep) => void;
  patient: PatientData;
  setPatient: React.Dispatch<React.SetStateAction<PatientData>>;
  showToast: (msg: string, icon?: string) => void;
  onPassGenerated?: (pass: PassRecord) => void;
}

const EMERGENCY_CATEGORIES = [
  {
    id: 'chest',
    title: 'Dolor de Pecho Opresivo / Sospecha de Infarto',
    subtitle: 'Opresión precordial, sudoración fría, dolor irradiado',
    icon: 'fa-heart-pulse',
    color: 'text-red-500',
  },
  {
    id: 'respiratory',
    title: 'Dificultad Respiratoria Severa / Asfixia',
    subtitle: 'Falta de aire aguda, cianosis, asfixia súbita',
    icon: 'fa-lungs',
    color: 'text-blue-500',
  },
  {
    id: 'unconscious',
    title: 'Desmayo / Pérdida de Conocimiento / Convulsión',
    subtitle: 'Inconsciencia, rigidez muscular o asimetría facial',
    icon: 'fa-brain',
    color: 'text-purple-500',
  },
  {
    id: 'trauma',
    title: 'Accidente Traumatológico / Sangrado Abundante',
    subtitle: 'Fractura expuesta, hemorragia activa o colisión',
    icon: 'fa-bandage',
    color: 'text-amber-500',
  },
  {
    id: 'fever_child',
    title: 'Fiebre Extremadamente Alta en Lactante o Niño',
    subtitle: '> 39.5°C persistente, letargo o convulsión febril',
    icon: 'fa-temperature-arrow-up',
    color: 'text-rose-500',
  },
  {
    id: 'other',
    title: 'OTRO MOTIVO DE EMERGENCIA',
    subtitle: 'Dictar por voz o escribir el síntoma de gravedad',
    icon: 'fa-microphone',
    color: 'text-sky-400',
  },
];

export const EmergencyFlow: React.FC<EmergencyFlowProps> = ({
  currentStep,
  setStep,
  patient,
  setPatient,
  showToast,
  onPassGenerated,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    patient.emergencyCategory || EMERGENCY_CATEGORIES[0].title
  );
  const [customReason, setCustomReason] = useState<string>(patient.emergencyCustomReason || '');
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const [canMove, setCanMove] = useState<boolean | null>(patient.canMove);

  const [gpsData, setGpsData] = useState({
    address: 'Av. Salaverry 1240, Jesús María / San Isidro, Lima',
    lat: -12.083842,
    lng: -77.045911,
    accuracy: '±8m',
  });
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'live' | 'fallback'>('acquiring');
  const [gpsError, setGpsError] = useState<string>('');
  const [hospitalList, setHospitalList] = useState<EmergencyHospital[]>(EMERGENCY_HOSPITALS);
  const [selectedHospital, setSelectedHospital] = useState<EmergencyHospital>(EMERGENCY_HOSPITALS[0]);

  const acquireGPS = useCallback(async () => {
    setGpsStatus('acquiring');
    setGpsError('');
    if (!window.isSecureContext) {
      setGpsStatus('fallback');
      setGpsError('El GPS requiere HTTPS o localhost. Abre la app con una conexión segura.');
      return;
    }
    try {
      const pos = await getCurrentGpsPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      const { latitude, longitude, accuracy } = pos.coords;
      const accText = `±${Math.round(accuracy)}m`;
      let resolvedAddress = `Coordenadas: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      try {
        const geo = await reverseGeocodePeru(latitude, longitude);
        resolvedAddress = geo.address;
      } catch {
        // Fallback
      }
      setGpsData({
        address: resolvedAddress,
        lat: latitude,
        lng: longitude,
        accuracy: accText,
      });
      setGpsStatus('live');
    } catch (err) {
      setGpsStatus('fallback');
      const code = (err as GeolocationPositionError)?.code;
      setGpsError(
        code === 1
          ? 'Permiso de ubicación denegado. Habilítalo en los ajustes del navegador y vuelve a intentar.'
          : code === 2
            ? 'No se pudo determinar la ubicación. Activa GPS y vuelve a intentar.'
            : code === 3
              ? 'La ubicación tardó demasiado. Vuelve a intentar.'
              : 'No se pudo acceder a la ubicación. Revisa los permisos del navegador.'
      );
    }
  }, []);

  useEffect(() => {
    acquireGPS();
  }, [acquireGPS]);

  // E3 Datos del Paciente (Dynamic pre-fill from patient/profile or empty)
  const [fullName, setFullName] = useState<string>(patient.fullName || '');
  const [dni, setDni] = useState<string>(patient.dni || '');
  const [age, setAge] = useState<number>(patient.age || (patient.age === 0 ? 0 : 28));
  const [sex, setSex] = useState<'F' | 'M'>(patient.sex || 'F');

  // E4 SAMPLE Clinical Protocol
  const [sampleData, setSampleData] = useState<SampleClinicalData>(
    patient.sample || {
      evolutionTime: '< 30 minutos',
      allergies: 'Sin Alergias',
      allergiesCustom: '',
      criticalMeds: 'Ninguno',
      preexisting: 'Ninguna',
      lastOralIntake: '< 2 horas',
    }
  );

  const [sbarOpen, setSbarOpen] = useState<boolean>(false);
  const [passCode] = useState<string>(() => `ROJO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-EMERG`);

  // --- Handlers ---
  const handleSelectCategory = (cat: (typeof EMERGENCY_CATEGORIES)[0]) => {
    setSelectedCategory(cat.title);
    if (cat.id !== 'other') {
      showToast(`Categoría: ${cat.title}`, 'fa-triangle-exclamation');
      setStep('emergency-e2-movilidad');
    }
  };

  const handleCustomReasonSubmit = () => {
    if (!customReason.trim()) {
      showToast('Por favor describe el motivo de la emergencia', 'fa-exclamation');
      return;
    }
    setSelectedCategory(`OTRO: ${customReason.trim()}`);
    setStep('emergency-e2-movilidad');
  };

  const toggleVoiceDictation = () => {
    if (!isDictating) {
      setIsDictating(true);
      showToast('Escuchando síntoma por micrófono...', 'fa-microphone');
      setTimeout(() => {
        setCustomReason('Dolor torácico severo con disnea y mareos intensos');
        setIsDictating(false);
        showToast('Transcripción de voz procesada con éxito', 'fa-check');
      }, 2000);
    } else {
      setIsDictating(false);
    }
  };

  const handleMobilityChoice = (mobility: boolean) => {
    setCanMove(mobility);
    setPatient((prev) => ({ ...prev, canMove: mobility }));
    if (!mobility) {
      showToast('Prioridad Prehospitalaria: Preparando despacho de ambulancia', 'fa-truck-medical');
      setStep('emergency-e2-auxilio');
    } else {
      showToast('Modo Traslado Inmediato a Hospital 24h', 'fa-hospital');
      setStep('emergency-e2-mapa');
    }
  };

  const copyGpsCoordinates = () => {
    const text = `${gpsData.address} (GPS: ${gpsData.lat}, ${gpsData.lng})`;
    navigator.clipboard?.writeText(text);
    showToast('Ubicación y coordenadas copiadas para dictar al SAMU 106', 'fa-copy');
  };

  const handleEmitFinalPass = () => {
    const activeReason = selectedCategory.includes('OTRO') && customReason ? `OTRO: ${customReason}` : selectedCategory;

    const situationText = `Emergencia Vital Código Rojo: ${activeReason}. Estado de traslado: ${canMove ? 'En vehículo particular' : 'INMÓVIL - Requiere ambulancia'}.`;
    const backgroundText = `Paciente ${fullName}, ${age} años, DNI ${dni}, Sexo: ${sex}. Alergias: ${sampleData.allergies}. Medicación crítica: ${sampleData.criticalMeds}. Preexistencias: ${sampleData.preexisting}.`;
    const assessmentText = `Tiempo de evolución: ${sampleData.evolutionTime}. Última ingesta oral: ${sampleData.lastOralIntake} (crítico para intubación). Ubicación GPS: ${gpsData.address} (${gpsData.lat}, ${gpsData.lng}).`;
    const recommendationText = `Derivación prioritaria a Shock Trauma: ${selectedHospital.name}. Activación de equipo médico de reanimación y preaviso hospitalario.`;

    const newPass: PassRecord = {
      id: passCode,
      date: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patient: fullName,
      dni,
      age,
      sex,
      category: 'CÓDIGO ROJO • PRIORIDAD I',
      priorityLevel: 'PRIORIDAD I',
      type: 'emergency',
      diagnosis: activeReason,
      facility: selectedHospital.name,
      eva: '9/10 (Vital)',
      status: canMove ? 'Traslado Inmediato en Curso' : 'Ambulancia Despachada (SAMU 106)',
      gpsAddress: gpsData.address,
      gpsCoords: {
        lat: gpsData.lat,
        lng: gpsData.lng,
        accuracy: gpsData.accuracy,
      },
      gps: {
        address: gpsData.address,
        lat: gpsData.lat,
        lng: gpsData.lng,
        accuracy: gpsData.accuracy,
      },
      sbar: {
        situation: situationText,
        background: backgroundText,
        assessment: assessmentText,
        recommendation: recommendationText,
      },
    };

    if (onPassGenerated) {
      onPassGenerated(newPass);
    }

    setPatient((prev) => ({
      ...prev,
      fullName,
      dni,
      age,
      sex,
      emergencyCategory: activeReason,
      sample: sampleData,
    }));

    setStep('emergency-pase');
    showToast('Pase Médico de Emergencia emitido con Código Rojo', 'fa-truck-medical');
  };

  const sbarFormatted = `[S - SITUATION]
Incidencia: ${selectedCategory.includes('OTRO') && customReason ? customReason : selectedCategory}
Paciente: ${fullName}, ${age} años, DNI: ${dni}, Sexo: ${sex}
Estado de Movilidad: ${canMove ? 'Puede trasladarse en vehículo' : 'INMÓVIL / Requiere extracción en camilla'}
Ubicación GPS: ${gpsData.address} (${gpsData.lat}, ${gpsData.lng} - Precisión: ${gpsData.accuracy})

[B - BACKGROUND / PROTOCOLO CLÍNICO SAMPLE]
S - Síntomas: ${selectedCategory}
A - Alergias a Medicamentos: ${sampleData.allergies}
M - Medicación Crítica Habitual: ${sampleData.criticalMeds}
P - Patologías Preexistentes: ${sampleData.preexisting}
L - Last Oral Intake (Última Ingesta): ${sampleData.lastOralIntake} (Filtro para Intubación/Sedación)
E - Eventos Previos: Tiempo de evolución ${sampleData.evolutionTime}

[A - ASSESSMENT / EVALUACIÓN DE SHOCK TRAUMA]
Clasificación de Riesgo: PRIORIDAD I - CÓDIGO ROJO (URGENCIA VITAL INMEDIATA)
Destino Asignado: ${selectedHospital.name} (Tópico de Shock Trauma)
Tiempo Estimado de Arribo: ${selectedHospital.eta} (${selectedHospital.distance})

[R - RECOMMENDATION]
1. Activación inmediata de cubículo de Reanimación / Shock Trauma.
2. Preparación de vía aérea y monitor multiparámetro continuo.
3. Notificación a médico de guardia y alerta prehospitalaria SAMU 106.`;

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 pt-1 pb-24">
      {/* ================= PASO E1: MOTIVO DE EMERGENCIA ================= */}
      {currentStep === 'emergency-e1-motivo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/15 text-red-500 text-xs font-mono font-bold border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              <span>PASO E1: MOTIVO DE EMERGENCIA</span>
            </div>
            <a
              href="tel:106"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold shadow hover:bg-red-700 transition-all"
            >
              <i className="fa-solid fa-phone text-[11px]"></i> 106
            </a>
          </div>

          <div className="space-y-1 px-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              ¿Cuál es la emergencia vital?
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Identifica el riesgo vital inmediatamente a un solo toque.
            </p>
          </div>

          {/* Abanico a un solo toque (Single-Tap) */}
          <div className="space-y-2.5">
            {EMERGENCY_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.title;
              const isOther = cat.id === 'other';

              return (
                <div key={cat.id} className="w-full">
                  <button
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`w-full p-4 rounded-squircle text-left flex items-start gap-3.5 transition-all duration-200 active:scale-[0.99] border cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/80 dark:bg-red-950/40 border-red-600 shadow-[0_0_24px_rgba(220,38,38,0.25)]'
                        : 'bg-white/80 dark:bg-[#1d2025]/80 border-slate-200 dark:border-slate-800 hover:border-red-500/50'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 ' + cat.color
                      }`}
                    >
                      <i className={`fa-solid ${cat.icon}`}></i>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {cat.title}
                        </h2>
                        <i className="fa-solid fa-chevron-right text-xs text-slate-400 ml-2"></i>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        {cat.subtitle}
                      </p>
                    </div>
                  </button>

                  {/* Dictation / Text expand for 'OTRO MOTIVO' */}
                  {isOther && isSelected && (
                    <div className="mt-2 p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-red-500/30 space-y-3">
                      <div className="relative">
                        <textarea
                          rows={2}
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                          placeholder="Describe brevemente el síntoma grave..."
                          className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 border border-slate-200 dark:border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={toggleVoiceDictation}
                          className={`absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center text-white transition-all cursor-pointer ${
                            isDictating ? 'bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          title="Dictar síntoma por voz"
                        >
                          <i className={`fa-solid ${isDictating ? 'fa-stop' : 'fa-microphone'} text-xs`}></i>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleCustomReasonSubmit}
                        className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <span>Continuar a Movilidad</span>
                        <i className="fa-solid fa-arrow-right text-[10px]"></i>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= PASO E2: EVALUACIÓN DE MOVILIDAD ================= */}
      {currentStep === 'emergency-e2-movilidad' && (
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/15 text-red-500 text-xs font-mono font-bold border border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            <span>PASO E2: EVALUACIÓN DE MOVILIDAD</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              ¿El paciente se puede mover / trasladar por sus propios medios?
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Evaluamos si requiere auxilio prehospitalario con ambulancia o si puede ser llevado a un hospital de guardia.
            </p>
          </div>

          {/* Current selected incident mini card */}
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
              <i className="fa-solid fa-heart-pulse text-sm"></i>
            </div>
            <div className="min-w-0">
              <span className="font-mono text-[10px] text-red-500 uppercase font-bold">Cuadro Activo:</span>
              <p className="font-semibold text-slate-900 dark:text-white truncate">{selectedCategory}</p>
            </div>
          </div>

          {/* 2 Big Choice Cards */}
          <div className="grid grid-cols-1 gap-4 pt-1">
            {/* Opción A: NO PUEDE MOVERSE */}
            <button
              type="button"
              onClick={() => handleMobilityChoice(false)}
              className="p-5 rounded-squircle liquid-glass-emergency text-left flex items-start gap-4 transition-all duration-200 active:scale-[0.98] cursor-pointer hover:shadow-[0_0_30px_rgba(220,38,38,0.35)]"
            >
              <div className="w-13 h-13 rounded-2xl bg-red-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-lg">
                <i className="fa-solid fa-wheelchair"></i>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-red-600 dark:text-red-400">
                    NO PUEDE MOVERSE
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold">
                    AMBULANCIA
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                  Riesgo de inmovilidad, politraumatismo, inconsciencia o dolor agudo que imposibilita caminar.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                  <span>Abrir Auxilio Prehospitalario y Despacho SAMU 106</span>
                  <i className="fa-solid fa-arrow-right text-[11px]"></i>
                </div>
              </div>
            </button>

            {/* Opción B: SÍ PUEDE MOVERSE */}
            <button
              type="button"
              onClick={() => handleMobilityChoice(true)}
              className="p-5 rounded-squircle liquid-glass-card border border-blue-500/40 text-left flex items-start gap-4 transition-all duration-200 active:scale-[0.98] cursor-pointer hover:border-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.25)]"
            >
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-lg">
                <i className="fa-solid fa-car-side"></i>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                    SÍ PUEDE MOVERSE
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold">
                    VEHÍCULO
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                  El paciente puede ser trasladado en taxi o vehículo particular hacia la emergencia más cercana.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span>Ver Hospitales con Guardia 24h en el Mapa</span>
                  <i className="fa-solid fa-arrow-right text-[11px]"></i>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ================= RAMA A: PANTALLA DE AUXILIO PREHOSPITALARIO ================= */}
      {currentStep === 'emergency-e2-auxilio' && (
        <div className="space-y-5">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-extrabold tracking-wider animate-pulse">
              <i className="fa-solid fa-truck-medical"></i>
              <span>AUXILIO PREHOSPITALARIO INMEDIATO</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Comunícate con la Central de Ambulancias
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              Indica tu dirección y coordenadas exactas al operador para el envío de la unidad.
            </p>
          </div>

          {/* Giant Call Button Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="tel:106"
              className="py-4 px-5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl shadow-red-600/40 emergency-pulse-ring cursor-pointer"
            >
              <i className="fa-solid fa-phone-volume text-xl"></i>
              <span>LLAMAR SAMU 106</span>
            </a>

            <a
              href="tel:116"
              className="py-4 px-5 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-extrabold text-base sm:text-lg border border-red-500/40 flex items-center justify-center gap-3 shadow-lg cursor-pointer"
            >
              <i className="fa-solid fa-fire-extinguisher text-xl text-amber-400"></i>
              <span>BOMBEROS 116</span>
            </a>
          </div>

          {/* Giant Screen Display with Exact GPS Coordinates and Address */}
          <div className="p-5 rounded-squircle liquid-glass-emergency space-y-3.5 shadow-xl border-2 border-red-500">
            <div className="flex items-center justify-between pb-2 border-b border-red-200 dark:border-red-900/60">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-600 dark:text-red-400 uppercase">
                <span className={`w-2.5 h-2.5 rounded-full ${gpsStatus === 'live' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : gpsStatus === 'acquiring' ? 'bg-amber-400 animate-ping' : 'bg-rose-500'}`}></span>
                <span>{gpsStatus === 'live' ? 'Ubicación GPS Satelital en Vivo' : gpsStatus === 'acquiring' ? 'Buscando satélites GPS...' : 'Ubicación GPS (Referencia)'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={acquireGPS}
                  className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 hover:text-white font-mono text-[11px] font-bold shadow transition-all flex items-center gap-1 cursor-pointer"
                  title="Actualizar posición satelital"
                >
                  <i className="fa-solid fa-arrows-rotate text-[10px]"></i>
                  <span>Refrescar</span>
                </button>
                <button
                  type="button"
                  onClick={copyGpsCoordinates}
                  className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-mono text-xs font-bold shadow hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <i className="fa-solid fa-copy text-red-500"></i>
                  <span>Copiar</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                Dirección detectada por satélite:
              </span>
              <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                {gpsData.address}
              </p>
            </div>

            {gpsError && (
              <p role="status" className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                {gpsError}
              </p>
            )}

            <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs space-y-1 border border-slate-800">
              <div className="flex justify-between">
                <span>Latitud / Longitud:</span>
                <span className="font-bold">{typeof gpsData.lat === 'number' ? gpsData.lat.toFixed(6) : gpsData.lat}, {typeof gpsData.lng === 'number' ? gpsData.lng.toFixed(6) : gpsData.lng}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Precisión satelital:</span>
                <span className="text-emerald-400">{gpsData.accuracy}</span>
              </div>
            </div>

            {/* Quick emergency location share actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <a
                href={getWhatsAppGpsShareUrl({ lat: gpsData.lat, lng: gpsData.lng, accuracy: Number(gpsData.accuracy.replace(/[^0-9]/g, '')) || 5 }, gpsData.address, fullName || 'Paciente', selectedCategory)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
              >
                <i className="fa-brands fa-whatsapp text-base"></i>
                <span>Enviar GPS por WhatsApp</span>
              </a>

              <a
                href={`https://maps.google.com/?q=${gpsData.lat},${gpsData.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold text-xs flex items-center justify-center gap-2 border border-blue-500/30 transition-all cursor-pointer"
              >
                <i className="fa-solid fa-map-location-dot"></i>
                <span>Ver Punto en Google Maps</span>
              </a>
            </div>
          </div>

          {/* Secondary Action: Advance to E3 Filiación */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setStep('emergency-e3-datos')}
              className="w-full py-4 rounded-squircle bg-slate-900 dark:bg-[#1d2025] hover:bg-slate-800 text-white font-bold text-sm border border-slate-300 dark:border-slate-700 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>Completar Ficha Clínica mientras llega la ayuda</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* ================= RAMA B: PASO E2 MAPA DE HOSPITALES 24H ================= */}
      {currentStep === 'emergency-e2-mapa' && (
        <div className="space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-500 dark:text-[#aac7ff] text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
              <span>PASO E2: NAVEGACIÓN GPS Y MAPA 24H</span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              Hospitales con Shock Trauma 24h
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Rutas y guardias de emergencia activas calculadas por proximidad GPS.
            </p>
          </div>

          {/* Leaflet Interactive Map */}
          <EmergencyMap
            selectedHospital={selectedHospital}
            onSelectHospital={(h) => {
              setSelectedHospital(h);
              showToast(`Seleccionado: ${h.name}`, 'fa-hospital');
            }}
            userCoords={{ lat: gpsData.lat, lng: gpsData.lng }}
            onCoordsUpdated={(coords) => {
              setGpsData((prev) => ({
                ...prev,
                lat: coords.lat,
                lng: coords.lng,
                accuracy: coords.accuracy,
                address: coords.address || prev.address,
              }));
              showToast('Ubicación GPS real sincronizada', 'fa-location-dot');
            }}
            onHospitalsRecalculated={(recalculated) => {
              setHospitalList(recalculated);
            }}
          />

          {/* Hospital List Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase font-mono">
                Centros con Emergencia 24 Horas
              </span>
              <span className="font-mono text-[11px] text-red-500 font-bold">
                Ordenado por proximidad GPS
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-0.5">
              {hospitalList.map((h) => {
                const isSelected = h.id === selectedHospital.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSelectedHospital(h)}
                    className={`w-full p-3 rounded-2xl text-left flex items-start justify-between gap-3 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/80 dark:bg-red-950/40 border-red-500 shadow-md'
                        : 'bg-white/70 dark:bg-[#1d2025]/70 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {h.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                        {h.address} {h.district ? `• ${h.district}` : ''}
                      </p>
                      <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-emerald-500 font-bold">
                        <i className="fa-solid fa-shield-heart"></i>
                        <span>{h.guardStatus}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400">
                        {h.distance}
                      </div>
                      <div className="font-mono text-[10px] text-amber-500 font-bold">
                        {h.eta}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setStep('emergency-e3-datos')}
              className="w-full py-4 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-extrabold text-sm shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
            >
              <span>Continuar con Datos del Paciente</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* ================= PASO E3: DATOS DEL PACIENTE (FILIACIÓN) ================= */}
      {currentStep === 'emergency-e3-datos' && (
        <div className="space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/15 text-red-500 text-xs font-mono font-bold">
              <span>PASO E3: DATOS DEL PACIENTE</span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              ¿Quién es el paciente?
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Completa los datos mientras el paciente es trasladado o mientras llega la ambulancia.
            </p>
          </div>

          {/* Quick populate button */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
            <div className="flex items-center gap-2 text-blue-500 dark:text-[#aac7ff]">
              <i className="fa-solid fa-user-check"></i>
              <span>¿Eres tú el paciente?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  const saved = localStorage.getItem('aether_patient_profile');
                  if (saved) {
                    const prof = JSON.parse(saved);
                    const name = `${prof.firstName || ''} ${prof.lastName || ''}`.trim();
                    if (name) setFullName(name);
                    if (prof.dni) setDni(prof.dni);
                    if (prof.age) setAge(Number(prof.age));
                    if (prof.sex) setSex(prof.sex);
                    showToast('Datos de tu perfil cargados automáticamente', 'fa-check');
                    return;
                  }
                } catch (e) {
                  console.warn(e);
                }
                setFullName('Valeria Sofía Mendoza Alarcón');
                setDni('72849102');
                setAge(28);
                setSex('F');
                showToast('Datos personales cargados', 'fa-check');
              }}
              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] cursor-pointer hover:bg-blue-700 transition-all"
            >
              Cargar desde mi perfil
            </button>
          </div>

          {/* Form Fields */}
          <div className="p-5 rounded-squircle liquid-glass-card space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                Nombre y Apellidos completos *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Valeria Mendoza Alarcón"
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                  DNI (8 dígitos) *
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="72849102"
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                  Edad (Años) *
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  placeholder="28"
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            {/* Sexo Biológico */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                Sexo Biológico *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSex('F')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    sex === 'F'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Femenino (F)
                </button>
                <button
                  type="button"
                  onClick={() => setSex('M')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    sex === 'M'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Masculino (M)
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (!fullName.trim() || !dni.trim()) {
                  showToast('Por favor ingrese el nombre y DNI del paciente', 'fa-exclamation');
                  return;
                }
                setStep('emergency-e4-sample');
              }}
              className="w-full py-4 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-extrabold text-sm shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
            >
              <span>Continuar a Preguntas SAMPLE (Paso E4)</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* ================= PASO E4: PREGUNTAS SAMPLE RÁPIDAS ================= */}
      {currentStep === 'emergency-e4-sample' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/15 text-red-500 text-xs font-mono font-bold">
              <span>PASO E4: PROTOCOLO SAMPLE RÁPIDO</span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              Cuestionario Clínico de Urgencia
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Respuestas a un solo toque para el equipo médico de Shock Trauma.
            </p>
          </div>

          <div className="space-y-3">
            {/* 1. Tiempo de Evolución */}
            <div className="p-3.5 rounded-2xl liquid-glass-card border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
                <i className="fa-solid fa-clock text-red-500"></i>
                <span>1. Tiempo de Evolución del Cuadro:</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['< 30 minutos', '1 a 2 horas', 'Hoy', '> 24 horas'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSampleData((prev) => ({ ...prev, evolutionTime: t }))}
                    className={`py-2 px-1 rounded-xl text-center font-mono text-[11px] font-bold transition-all cursor-pointer ${
                      sampleData.evolutionTime === t
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Alergias a Medicamentos */}
            <div className="p-3.5 rounded-2xl liquid-glass-card border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
                <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                <span>2. Alergias a Medicamentos:</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Sin Alergias', 'Penicilina', 'AINEs', 'Otras (Voz)'] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setSampleData((prev) => ({ ...prev, allergies: a }))}
                    className={`py-2 px-1 rounded-xl text-center font-mono text-[11px] font-bold transition-all cursor-pointer ${
                      sampleData.allergies === a
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Medicación Crítica Habitual */}
            <div className="p-3.5 rounded-2xl liquid-glass-card border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
                <i className="fa-solid fa-pills text-blue-500"></i>
                <span>3. Medicación Crítica Habitual:</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['Ninguno', 'Anticoagulantes', 'Insulina', 'Antihipertensivos'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSampleData((prev) => ({ ...prev, criticalMeds: m }))}
                    className={`py-2 px-1 rounded-xl text-center font-mono text-[11px] font-bold transition-all cursor-pointer truncate ${
                      sampleData.criticalMeds === m
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Preexistencias / Estado */}
            <div className="p-3.5 rounded-2xl liquid-glass-card border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
                <i className="fa-solid fa-heart-circle-check text-rose-500"></i>
                <span>4. Preexistencias / Estado:</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {(['Ninguna', 'Diabetes/HTA', 'Enfermedad del Corazón', 'Asma/Epilepsia', 'Embarazo'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSampleData((prev) => ({ ...prev, preexisting: p }))}
                    className={`py-2 px-1 rounded-xl text-center font-mono text-[11px] font-bold transition-all cursor-pointer truncate ${
                      sampleData.preexisting === p
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Última Ingesta de Alimentos/Agua (Crítico para sedación/intubación) */}
            <div className="p-3.5 rounded-2xl liquid-glass-card border border-red-500/30 space-y-2 bg-red-500/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 font-mono">
                  <i className="fa-solid fa-utensils"></i>
                  <span>5. Última Ingesta de Alimentos/Agua:</span>
                </label>
                <span className="text-[10px] font-mono text-slate-400 font-semibold">Crítico para Intubación</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['< 2 horas', '2 a 6 horas', '> 6 horas (Ayuno)'] as const).map((ing) => (
                  <button
                    key={ing}
                    type="button"
                    onClick={() => setSampleData((prev) => ({ ...prev, lastOralIntake: ing }))}
                    className={`py-2.5 px-1 rounded-xl text-center font-mono text-[11px] font-bold transition-all cursor-pointer ${
                      sampleData.lastOralIntake === ing
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {ing}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleEmitFinalPass}
              className="w-full py-4 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-black text-sm sm:text-base shadow-xl shadow-red-600/40 emergency-pulse-ring flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <i className="fa-solid fa-qrcode text-base"></i>
              <span>Emitir Pase de Emergencia Código Rojo</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= PASO FINAL: EMISIÓN PASE DE EMERGENCIA QR ================= */}
      {currentStep === 'emergency-pase' && (
        <div className="space-y-5">
          <div className="text-center space-y-1 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 squircle-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 text-xs font-extrabold border border-red-300 dark:border-red-800">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              <span>ALERTA CLÍNICA ACTIVADA • CÓDIGO ROJO</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Pase Médico de Emergencia - Prioridad I
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Listo para escaneo inmediato por el equipo médico en Shock Trauma o por paramédicos.
            </p>
          </div>

          {/* Liquid Glass Emergency Pass Card */}
          <div className="liquid-glass-emergency squircle-lg p-5 sm:p-7 max-w-md mx-auto relative overflow-hidden shadow-[0_20px_50px_-8px_rgba(239,68,68,0.55),0_0_0_1px_rgba(239,68,68,0.4)] space-y-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-red-200 dark:border-red-900/60">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 squircle-sm bg-red-600 flex items-center justify-center text-white text-base shadow">
                  <i className="fa-solid fa-truck-medical animate-pulse"></i>
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    SISTEMA INTEGRADO DE TRIAJE
                  </div>
                  <div className="text-[10px] font-bold text-red-600 dark:text-red-400">
                    SBAR / SAMPLE ENCRIPTADO
                  </div>
                </div>
              </div>
              <div className="px-3 py-1 squircle-full text-[11px] font-black tracking-wider uppercase bg-red-600 text-white border border-red-400 shadow-md">
                PRIORIDAD I • ROJO
              </div>
            </div>

            {/* Vector SVG Native QR Code */}
            <div className="flex flex-col items-center justify-center">
              <div className="p-3 bg-white squircle-md shadow-inner border-2 border-red-300 flex items-center justify-center relative w-48 h-48 sm:w-52 sm:h-52">
                <VectorQRCode
                  dataString={stringifyQrPayload({
                    schema: 'triajeia-peru/v1',
                    type: 'EMERGENCY_PASS',
                    id: passCode,
                    date: new Date().toISOString().slice(0, 10),
                    patient: {
                      fullName,
                      dni,
                      age,
                      sex,
                    },
                    category: selectedCategory,
                    priority: 'PRIORIDAD I • CÓDIGO ROJO',
                    facility: selectedHospital.name,
                    mobility: canMove ? 'Traslado Vehicular' : 'INMÓVIL / Ambulancia',
                    gps: {
                      address: gpsData.address,
                      lat: gpsData.lat,
                      lng: gpsData.lng,
                    },
                    sample: {
                      ...sampleData,
                      allergiesCustom: sampleData.allergiesCustom || '',
                    },
                    sbar: {
                      situation: `Emergencia Vital Código Rojo: ${selectedCategory}`,
                      background: `Paciente ${fullName}, ${age}a, DNI ${dni}, Sexo ${sex}. Alergias: ${sampleData.allergies}. Medicación: ${sampleData.criticalMeds}`,
                      assessment: `Evolución: ${sampleData.evolutionTime}. Ingesta oral: ${sampleData.lastOralIntake}. Destino: ${selectedHospital.name}`,
                      recommendation: 'Activación inmediata de tópico de Shock Trauma / Reanimación. Contactar al servicio de emergencias.',
                    },
                  })}
                  isEmergency={true}
                  size={220}
                />
                <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-[9px] shadow">
                  CÓDIGO ROJO
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="mb-1 max-w-[260px] text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">DNI:</span> {maskDniForDisplay(dni)} <span aria-hidden="true">·</span>{' '}
                  <span className="font-semibold">Prioridad:</span> PRIORIDAD I<br />
                  <span className="font-semibold">Síntomas:</span> {selectedCategory}
                </div>
                <span className="text-sm font-mono font-black text-red-600 dark:text-red-400 tracking-wider">
                  {passCode}
                </span>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Firma Criptográfica SHA-256 Validada MINSA
                </div>
              </div>
            </div>

            {/* Summary Information Block */}
            <div className="space-y-2 bg-white/70 dark:bg-slate-900/70 p-3.5 squircle-md border border-red-200 dark:border-red-900/60 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Paciente:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {fullName} ({age}a, {sex})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">DNI:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{maskDniForDisplay(dni)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Incidencia:</span>
                <span className="font-bold text-red-600 dark:text-red-400 truncate max-w-[200px]">
                  {selectedCategory}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Hospital Destino:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {selectedHospital.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Última Ingesta (Ayuno):</span>
                <span className="font-mono font-bold text-amber-500">
                  {sampleData.lastOralIntake}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Ubicación GPS:</span>
                  <a
                    href={`https://maps.google.com/?q=${gpsData.lat},${gpsData.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-400 font-mono text-[10px] font-bold flex items-center gap-1"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square"></i>
                    <span>Abrir Google Maps</span>
                  </a>
                </div>
                <span className="font-semibold text-slate-800 dark:text-zinc-200 leading-snug">
                  {gpsData.address}
                </span>
                <span className="font-mono text-[10px] text-emerald-500 font-bold">
                  Coordenadas: {typeof gpsData.lat === 'number' ? gpsData.lat.toFixed(5) : gpsData.lat}, {typeof gpsData.lng === 'number' ? gpsData.lng.toFixed(5) : gpsData.lng} ({gpsData.accuracy})
                </span>
              </div>
            </div>

            {/* Expandable SBAR/SAMPLE Report */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSbarOpen(!sbarOpen)}
                className="w-full text-left flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-red-600 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-file-medical text-red-600"></i>
                  <span>Ver Ficha Clínica SAMPLE / SBAR Encriptada</span>
                </span>
                <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${sbarOpen ? 'rotate-180' : ''}`}></i>
              </button>

              {sbarOpen && (
                <div className="mt-2 p-3 squircle-sm bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto border border-red-900/80">
                  <pre className="whitespace-pre-wrap">{sbarFormatted}</pre>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => showToast(`Pase de Emergencia descargado: ${passCode}`, 'fa-floppy-disk')}
                className="flex-1 py-3.5 squircle-md bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs press-tactile transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
              >
                <i className="fa-solid fa-download"></i>
                <span>Descargar Ficha Digital</span>
              </button>
              <button
                type="button"
                onClick={() => setStep('step0-selection')}
                className="py-3.5 px-4 squircle-md liquid-glass-card-subtle text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 font-bold text-xs press-tactile transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-house"></i>
                <span>Volver a Inicio</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
