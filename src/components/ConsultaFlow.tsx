import React, { useState } from 'react';
import { AppStep, PatientData, PassRecord, ConsultaTipo } from '../types';
import { VectorQRCode } from './VectorQRCode';
import { ConsultaMap, INITIAL_HEALTH_CENTERS, HealthCenterItem } from './ConsultaMap';
import { maskDniForDisplay, stringifyQrPayload } from '../utils/qrPayload';

interface ConsultaFlowProps {
  currentStep: AppStep;
  setStep: (step: AppStep) => void;
  patient: PatientData;
  setPatient: React.Dispatch<React.SetStateAction<PatientData>>;
  showToast: (msg: string, icon?: string) => void;
  onPassGenerated?: (pass: PassRecord) => void;
  onEscalateToEmergency?: (eva: number, reason: string) => void;
}

const HEALTH_CENTERS = INITIAL_HEALTH_CENTERS;

const BODY_ZONES = [
  {
    id: 'head',
    name: 'Cabeza / Ojos / Garganta',
    subtitle: 'Cefalea, migraña, odinofagia, visión borrosa',
    icon: 'neurology',
    examples: 'Dolor de cabeza, rinitis, dolor de garganta',
  },
  {
    id: 'chest',
    name: 'Pecho / Respiratorio',
    subtitle: 'Tos persistente, disnea leve, palpitaciones',
    icon: 'pulmonology',
    examples: 'Bronquitis, tos seca, congestión pectoral',
  },
  {
    id: 'abdomen',
    name: 'Abdomen / Digestivo',
    subtitle: 'Dolor estomacal, diarrea, reflujo, náuseas',
    icon: 'save_as',
    examples: 'Gastritis, cólicos, indigestión aguda',
  },
  {
    id: 'urinary',
    name: 'Urinario / Reproductivo',
    subtitle: 'Ardor al orinar, molestia lumbar, ginecológico',
    icon: 'water_drop',
    examples: 'Infección urinaria, dolor pélvico',
  },
  {
    id: 'muscles',
    name: 'Músculos / Articulaciones / Piel',
    subtitle: 'Lumbalgia, contracturas, erupción o alergia',
    icon: 'accessibility_new',
    examples: 'Dolor de espalda, esguince leve, dermatitis',
  },
  {
    id: 'mental',
    name: 'Salud Mental / Sueño',
    subtitle: 'Ansiedad, insomnio, estrés agudo, fatiga',
    icon: 'psychology',
    examples: 'Insomnio crónico, crisis ansiosa leve',
  },
  {
    id: 'other',
    name: 'Otro motivo (Texto / Voz)',
    subtitle: 'Describe tu molestia con el micrófono',
    icon: 'mic',
    examples: 'Dictar molestia no clasificada',
  },
];

const PREEXISTING_CONDITIONS = [
  { id: 'hta', title: 'Hipertensión arterial (HTA)', icon: 'vital_signs' },
  { id: 'dm', title: 'Diabetes mellitus', icon: 'bloodtype' },
  { id: 'asthma', title: 'Asma / Respiratorio', icon: 'air' },
  { id: 'gastritis', title: 'Gastritis / Reflujo', icon: 'medical_services' },
  { id: 'none', title: 'Ninguna condición previa', icon: 'health_and_safety' },
];

export const ConsultaFlow: React.FC<ConsultaFlowProps> = ({
  currentStep,
  setStep,
  patient,
  setPatient,
  showToast,
  onPassGenerated,
  onEscalateToEmergency,
}) => {
  // C1 State (Dynamic pre-fill from patient or empty for new user)
  const [fullName, setFullName] = useState<string>(patient.fullName || '');
  const [dni, setDni] = useState<string>(patient.dni || '');
  const [age, setAge] = useState<number>(patient.age || (patient.age === 0 ? 0 : 28));
  const [sex, setSex] = useState<'F' | 'M'>(patient.sex || 'F');
  const [phone, setPhone] = useState<string>(patient.phone || '984 210 594');
  const [beneficiaryType, setBeneficiaryType] = useState<'self' | 'other'>(patient.beneficiaryType || 'self');

  // C2 State
  const [mode, setMode] = useState<'presencial' | 'teleconsulta'>('presencial');
  const [healthCentersList, setHealthCentersList] = useState<HealthCenterItem[]>(INITIAL_HEALTH_CENTERS);
  const [selectedCenter, setSelectedCenter] = useState<HealthCenterItem>(() => {
    const existing = patient.selectedCenter;
    const found =
      INITIAL_HEALTH_CENTERS.find((c) => c.name === existing?.name) ||
      INITIAL_HEALTH_CENTERS.find((c) => c.id === existing?.id);
    return found || INITIAL_HEALTH_CENTERS[0];
  });
  const [patientGps, setPatientGps] = useState<{
    lat: number;
    lng: number;
    accuracy: string;
    address: string;
  }>({
    lat: -12.083842,
    lng: -77.045911,
    accuracy: '±6m',
    address: 'Av. Salaverry 1240, Jesús María / San Isidro, Lima',
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('< 2 km');
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);

  // C3 State
  const [consultaTipo, setConsultaTipo] = useState<ConsultaTipo>(patient.consultaTipo || 'sintoma');

  // C4 [A] Sintoma State
  const [evaScore, setEvaScore] = useState<number>(patient.evaScore ?? 4);
  const [bodyZone, setBodyZone] = useState<string>(patient.bodyZone || BODY_ZONES[0].name);
  const [symptomDescription, setSymptomDescription] = useState<string>(patient.symptomDescription || '');
  const [symptomDuration, setSymptomDuration] = useState<string>(patient.symptomDuration || '< 24 horas');
  const [painType, setPainType] = useState<string>(patient.painType || 'Opresivo / Presión');
  const [isDictatingSymptom, setIsDictatingSymptom] = useState<boolean>(false);
  const [showHighEvaModal, setShowHighEvaModal] = useState<boolean>(false);

  // C4 [B] Control State
  const [controlReason, setControlReason] = useState<
    'Rutina general' | 'Certificado médico / Laboral' | 'Control de enfermedad crónica'
  >(patient.controlReason || 'Rutina general');
  const [screenings, setScreenings] = useState<string[]>(
    patient.screenings?.length ? patient.screenings : ['Análisis de sangre y glucosa reciente']
  );

  // C5 Antecedentes State
  const [conditions, setConditions] = useState<string[]>(
    patient.chronicConditions?.length ? patient.chronicConditions : ['Hipertensión arterial (HTA)']
  );
  const [allergiesDrug, setAllergiesDrug] = useState<string>(patient.allergiesDrug || 'Penicilinas');
  const [dailyMedications, setDailyMedications] = useState<string[]>(
    patient.dailyMedications?.length ? patient.dailyMedications : ['Losartán 50mg / 24h']
  );
  const [surgeries, setSurgeries] = useState<string>(patient.previousSurgeries || 'Ninguna reciente');
  const [tobacco, setTobacco] = useState<string>(patient.tobacco || 'No fuma');
  const [alcohol, setAlcohol] = useState<string>(patient.alcohol || 'Ocasional');
  const [isDictatingSurgery, setIsDictatingSurgery] = useState<boolean>(false);

  // Pass emission state
  const [passNumber] = useState<string>(
    () => `CONSULTA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-MINSA`
  );
  const [isSbarOpen, setIsSbarOpen] = useState<boolean>(false);

  // --- Handlers ---
  const handleBeneficiaryChange = (type: 'self' | 'other') => {
    setBeneficiaryType(type);
    if (type === 'self') {
      try {
        const saved = localStorage.getItem('aether_patient_profile');
        if (saved) {
          const prof = JSON.parse(saved);
          const name = `${prof.firstName || ''} ${prof.lastName || ''}`.trim();
          if (name) setFullName(name);
          if (prof.dni) setDni(prof.dni);
          if (prof.age) setAge(Number(prof.age));
          if (prof.sex) setSex(prof.sex);
          showToast('Datos de tu perfil cargados', 'fa-user-check');
          return;
        }
      } catch (e) {
        console.warn(e);
      }
      setFullName('Valeria Sofía Mendoza Alarcón');
      setDni('72849102');
      setAge(28);
      setSex('F');
      setPhone('984 210 594');
      showToast('Datos de usuario titular cargados', 'fa-user-check');
    } else {
      setFullName('');
      setDni('');
      setAge(35);
      setSex('M');
      showToast('Filiación para Familiar o Tercero', 'fa-users');
    }
  };

  const handleC1Next = () => {
    if (!fullName.trim() || !dni.trim()) {
      showToast('Por favor completa los nombres y DNI del paciente', 'fa-exclamation');
      return;
    }
    setPatient((prev) => ({
      ...prev,
      fullName,
      dni,
      age,
      sex,
      phone,
      beneficiaryType,
    }));
    setStep('consulta-c2-geo');
    showToast('Paso C1 guardado: Datos del Paciente', 'fa-check');
  };

  const handleC2Next = () => {
    setPatient((prev) => ({
      ...prev,
      selectedCenter,
    }));
    setStep('consulta-c3-tipo');
    showToast(`Centro asignado: ${selectedCenter.name}`, 'fa-hospital');
  };

  const handleSelectTipoConsulta = (tipo: ConsultaTipo) => {
    setConsultaTipo(tipo);
    setPatient((prev) => ({ ...prev, consultaTipo: tipo }));
    if (tipo === 'sintoma') {
      showToast('Tipo: Consulta por Síntoma o Dolor', 'fa-stethoscope');
      setStep('consulta-c4-sintoma');
    } else {
      showToast('Tipo: Chequeo Preventivo / Control', 'fa-clipboard-check');
      setStep('consulta-c4-control');
    }
  };

  // EVA Slider change with >= 8 escalation check
  const handleEvaChange = (val: number) => {
    setEvaScore(val);
    if (val >= 8) {
      setShowHighEvaModal(true);
    }
  };

  const handleEscalateNow = () => {
    setShowHighEvaModal(false);
    showToast('Escalando de inmediato a Vía 1: Emergencia Vital', 'fa-triangle-exclamation');
    if (onEscalateToEmergency) {
      onEscalateToEmergency(evaScore, `Dolor severo EVA ${evaScore}/10 en ${bodyZone}`);
    } else {
      setStep('emergency-e1-motivo');
    }
  };

  const toggleVoiceDictation = (field: 'symptom' | 'surgery') => {
    if (field === 'symptom') {
      if (!isDictatingSymptom) {
        setIsDictatingSymptom(true);
        showToast('Escuchando síntoma por micrófono...', 'fa-microphone');
        setTimeout(() => {
          setSymptomDescription('Molestia persistente con ardor e inflamación desde ayer');
          setIsDictatingSymptom(false);
          showToast('Voz procesada con éxito', 'fa-check');
        }, 1800);
      } else {
        setIsDictatingSymptom(false);
      }
    } else {
      if (!isDictatingSurgery) {
        setIsDictatingSurgery(true);
        showToast('Escuchando antecedentes quirúrgicos...', 'fa-microphone');
        setTimeout(() => {
          setSurgeries('Apendicectomía laparoscópica en 2021');
          setIsDictatingSurgery(false);
          showToast('Cirugía registrada por voz', 'fa-check');
        }, 1800);
      } else {
        setIsDictatingSurgery(false);
      }
    }
  };

  const toggleScreening = (scr: string) => {
    if (scr.includes('Ningún')) {
      setScreenings([scr]);
      return;
    }
    const filtered = screenings.filter((s) => !s.includes('Ningún'));
    if (filtered.includes(scr)) {
      setScreenings(filtered.filter((s) => s !== scr));
    } else {
      setScreenings([...filtered, scr]);
    }
  };

  const toggleCondition = (cond: string) => {
    if (cond.includes('Ninguna')) {
      setConditions([cond]);
      return;
    }
    const filtered = conditions.filter((c) => !c.includes('Ninguna'));
    if (filtered.includes(cond)) {
      setConditions(filtered.filter((c) => c !== cond));
    } else {
      setConditions([...filtered, cond]);
    }
  };

  const addMedication = () => {
    const med = prompt('Ingrese el nombre y dosis del medicamento:', 'Omeprazol 20mg');
    if (med && med.trim()) {
      setDailyMedications((prev) => [...prev, med.trim()]);
      showToast(`Medicación agregada: ${med.trim()}`, 'fa-pills');
    }
  };

  const removeMedication = (med: string) => {
    setDailyMedications((prev) => prev.filter((m) => m !== med));
  };

  // Determine Priority Level based on symptoms/EVA/control
  const calculatePriority = (): {
    level: 'PRIORIDAD II' | 'PRIORIDAD III' | 'PRIORIDAD IV';
    badge: string;
    badgeBg: string;
    textColor: string;
    desc: string;
  } => {
    if (consultaTipo === 'sintoma') {
      if (evaScore >= 6 || bodyZone.includes('Pecho')) {
        return {
          level: 'PRIORIDAD II',
          badge: 'PRIORIDAD II • URGENCIA MAYOR',
          badgeBg: 'bg-amber-600',
          textColor: 'text-amber-500',
          desc: 'Atención médica prioritaria recomendada dentro de los primeros 30-60 minutos.',
        };
      } else if (evaScore >= 3) {
        return {
          level: 'PRIORIDAD III',
          badge: 'PRIORIDAD III • URGENCIA MENOR',
          badgeBg: 'bg-blue-600',
          textColor: 'text-blue-500',
          desc: 'Consulta ambulatoria preferencial en consultorio externo hoy.',
        };
      } else {
        return {
          level: 'PRIORIDAD IV',
          badge: 'PRIORIDAD IV • NO URGENTE',
          badgeBg: 'bg-emerald-600',
          textColor: 'text-emerald-500',
          desc: 'Atención ambulatoria estándar en centro de salud asignado.',
        };
      }
    } else {
      return {
        level: 'PRIORIDAD IV',
        badge: 'PRIORIDAD IV • CONTROL PREVENTIVO',
        badgeBg: 'bg-emerald-600',
        textColor: 'text-emerald-500',
        desc: 'Tamizaje y control de salud programado sin urgencia médica.',
      };
    }
  };

  const handleEmitConsultaPass = () => {
    const priority = calculatePriority();

    const situationText =
      consultaTipo === 'sintoma'
        ? `Consulta por síntoma: ${bodyZone}. Duración: ${symptomDuration}. Sensación: ${painType}. Nivel EVA: ${evaScore}/10.`
        : `Control de salud preventivo: ${controlReason}. Tamizajes previos: ${screenings.join(', ')}.`;

    const backgroundText = `Paciente ${fullName}, ${age} años, DNI ${dni}, Sexo: ${sex}. Preexistencias: ${conditions.join(', ')}. Alergias medicamentosas: ${allergiesDrug}. Medicación diaria: ${dailyMedications.join(', ') || 'Ninguna'}. Cirugías: ${surgeries}. Hábitos: Tabaco (${tobacco}), Alcohol (${alcohol}).`;

    const assessmentText =
      consultaTipo === 'sintoma'
        ? `Evaluación clínica de triaje ambulatorio NTS N° 124-MINSA. Dolor calibrado EVA ${evaScore}/10 en ${bodyZone}. Clasificación: ${priority.level}.`
        : `Evaluación preventiva y cribado de rutina para paciente de ${age} años. Clasificación: ${priority.level}.`;

    const recommendationText = `Turno asignado en ${selectedCenter.name} (${selectedCenter.specialty}). Modalidad: ${mode === 'presencial' ? 'Presencial' : 'Teleconsulta'}. Presentar QR en módulo de admisión para apertura de historia clínica electrónica SIHCE.`;

    const newPass: PassRecord = {
      id: passNumber,
      date: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patient: fullName,
      dni,
      age,
      sex,
      category: priority.badge,
      priorityLevel: priority.level,
      type: consultaTipo === 'sintoma' ? 'consulta_sintoma' : 'consulta_control',
      diagnosis:
        consultaTipo === 'sintoma'
          ? `${bodyZone} (${painType})`
          : `Chequeo: ${controlReason}`,
      facility: selectedCenter.name,
      eva: consultaTipo === 'sintoma' ? `${evaScore}/10` : 'Sin dolor (0/10)',
      status: 'Turno Confirmado en Red',
      gpsAddress: patientGps.address || selectedCenter.address,
      gpsCoords: {
        lat: patientGps.lat,
        lng: patientGps.lng,
        accuracy: patientGps.accuracy,
      },
      gps: {
        address: patientGps.address || selectedCenter.address || '',
        lat: patientGps.lat,
        lng: patientGps.lng,
        accuracy: patientGps.accuracy,
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
      phone,
      beneficiaryType,
      selectedCenter,
      consultaTipo,
      evaScore,
      bodyZone,
      symptomDuration,
      painType,
      controlReason,
      screenings,
      chronicConditions: conditions,
      allergiesDrug,
      dailyMedications,
      previousSurgeries: surgeries,
      tobacco,
      alcohol,
    }));

    setStep('consulta-pase');
    showToast('Pase Digital de Consulta emitido con éxito', 'fa-qrcode');
  };

  const priority = calculatePriority();

  const sbarFormatted = `[S - SITUATION]
Tipo de Atención: ${consultaTipo === 'sintoma' ? 'Consulta Ambulatoria por Síntoma' : 'Control Preventivo Anual'}
Motivo Reportado: ${consultaTipo === 'sintoma' ? `${bodyZone} (${painType}) - ${symptomDuration}` : controlReason}
Modalidad Elegida: ${mode === 'presencial' ? 'Presencial en Centro de Salud' : 'Teleconsulta Médica'}

[B - BACKGROUND / FILIACIÓN Y ANTECEDENTES]
Paciente: ${fullName}, ${age} años, DNI: ${dni}, Sexo: ${sex}
Alergias a Medicamentos: ${allergiesDrug}
Medicación Habitual: ${dailyMedications.join(', ') || 'Ninguna'}
Preexistencias Crónicas: ${conditions.join(', ')}
Cirugías Previas: ${surgeries}
Hábitos: Tabaco (${tobacco}) | Alcohol (${alcohol})

[A - ASSESSMENT / EVALUACIÓN NTS-MINSA]
Escala del Dolor EVA: ${consultaTipo === 'sintoma' ? `${evaScore}/10` : 'No aplica (0/10)'}
Zona Anatómica Principal: ${consultaTipo === 'sintoma' ? bodyZone : 'Examen General'}
Tamizajes Previos: ${screenings.join(', ')}
Nivel Asignado: ${priority.level} (${priority.badge})

[R - RECOMMENDATION]
1. Asignación inmediata de turno en ${selectedCenter.name}.
2. Atención por consultorio externo de ${selectedCenter.specialty}.
3. Vinculación y registro digital directo en SIHCE MINSA / EsSalud Digital.`;

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 pt-1 pb-24">
      {/* ================= PASO C1: DATOS DEL PACIENTE ================= */}
      {currentStep === 'consulta-c1-datos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-500 dark:text-[#aac7ff] text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>PASO C1: DATOS DEL PACIENTE</span>
            </div>
            <span className="text-xs font-mono text-slate-400">Paso 1 de 5</span>
          </div>

          <div className="space-y-1 px-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              ¿Quién recibirá la atención médica?
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Registra los datos para la ficha clínica en el centro de salud.
            </p>
          </div>

          {/* Beneficiary Pill */}
          <div className="p-1 rounded-full bg-slate-200 dark:bg-slate-900 flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleBeneficiaryChange('self')}
              className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                beneficiaryType === 'self'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-user"></i>
              <span>Para mí (Titular)</span>
            </button>
            <button
              type="button"
              onClick={() => handleBeneficiaryChange('other')}
              className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                beneficiaryType === 'other'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-users"></i>
              <span>Familiar / Tercero</span>
            </button>
          </div>

          {/* Form Card */}
          <div className="p-5 rounded-squircle liquid-glass-card space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
            {/* RENIEC Banner */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 uppercase font-bold">
                Filiación Oficial
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-500">
                <i className="fa-solid fa-shield-halved"></i>
                <span>Validado con RENIEC</span>
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                Nombres y Apellidos Completos *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Valeria Sofía Mendoza Alarcón"
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-700"
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
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                  Edad (Años) *
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAge((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-11 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                    className="flex-1 text-center py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:outline-none border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setAge((prev) => Math.min(115, prev + 1))}
                    className="w-10 h-11 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                  Sexo Biológico *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSex('F')}
                    className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
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
                    className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="984 210 594"
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleC1Next}
              className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
            >
              <span>Continuar a Geolocalización (Paso C2)</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* ================= PASO C2: GEOLOCALIZACIÓN GPS ================= */}
      {currentStep === 'consulta-c2-geo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-500 dark:text-[#aac7ff] text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>PASO C2: GEOLOCALIZACIÓN GPS</span>
            </div>
            <span className="text-xs font-mono text-slate-400">Paso 2 de 5</span>
          </div>

          <div className="space-y-1 px-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              ¿Dónde deseas atenderte?
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Ubica tu centro más cercano o elige teleconsulta virtual.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="p-1 rounded-full bg-slate-200 dark:bg-slate-900 flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('presencial');
                showToast('Modalidad: Presencial en Centro de Salud', 'fa-hospital');
              }}
              className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                mode === 'presencial'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-hospital"></i>
              <span>Presencial (Centro de Salud)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('teleconsulta');
                showToast('Modalidad: Teleconsulta Virtual Inmediata', 'fa-video');
              }}
              className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                mode === 'teleconsulta'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-video"></i>
              <span>Teleconsulta Virtual</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar posta, policlínico u hospital..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {['< 2 km', 'Citas hoy', 'Posta / CS I-3', 'Hospital II / III'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setActiveFilter(chip)}
                className={`shrink-0 px-3 py-1.5 rounded-full font-mono text-[11px] font-bold cursor-pointer transition-all ${
                  activeFilter === chip
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-white/70 dark:bg-slate-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Live Detected Location Card */}
          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] shrink-0"></span>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Tu ubicación GPS
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {patientGps.address}
                </div>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 font-mono text-[11px] text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              <i className="fa-solid fa-satellite text-[10px]"></i>
              <span>{patientGps.accuracy}</span>
            </div>
          </div>

          {/* Spatial Live Leaflet Map Module */}
          <ConsultaMap
            selectedCenter={selectedCenter}
            onSelectCenter={(center) => {
              setSelectedCenter(center);
              showToast(`Seleccionado: ${center.name}`, 'fa-hospital');
            }}
            userCoords={{ lat: patientGps.lat, lng: patientGps.lng }}
            onCoordsUpdated={(coords) => {
              setPatientGps({
                lat: coords.lat,
                lng: coords.lng,
                accuracy: coords.accuracy,
                address: coords.address || patientGps.address,
              });
              showToast('Ubicación GPS sincronizada', 'fa-location-dot');
            }}
            isExpanded={isMapExpanded}
            onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
            onCentersRecalculated={(recalc) => {
              setHealthCentersList(recalc);
            }}
          />

          {/* Centers List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase font-mono">
                Establecimientos Priorizados
              </span>
              <span className="font-mono text-[11px] text-blue-500 font-bold">
                Ordenado por proximidad GPS
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
              {healthCentersList
                .filter((c) => {
                  if (activeFilter === '< 2 km') {
                    return (c.distanceKm ?? 0) <= 2.8;
                  }
                  if (activeFilter === 'Posta / CS I-3') {
                    return c.type.includes('I-3');
                  }
                  if (activeFilter === 'Hospital II / III') {
                    return c.type.includes('Hospital') || c.type.includes('III-1') || c.type.includes('EsSalud');
                  }
                  return true;
                })
                .filter((c) =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (c.district && c.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (c.zone && c.zone.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map((center) => {
                  const isSelected = center.id === selectedCenter.id;
                  return (
                    <button
                      key={center.id}
                      type="button"
                      onClick={() => {
                        setSelectedCenter(center);
                        showToast(`Seleccionado: ${center.name}`, 'fa-hospital');
                      }}
                      className={`w-full p-3.5 rounded-2xl text-left flex items-start justify-between gap-3 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-md'
                          : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {center.name}
                          </h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-zinc-300 font-semibold">
                            {center.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                          {center.specialty} • {center.address}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            📍 {center.distance || center.time}
                          </span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            • {center.availability}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-transparent'
                          }`}
                        >
                          <i className="fa-solid fa-check text-[10px]"></i>
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
              onClick={handleC2Next}
              className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
            >
              <span>Continuar a Tipo de Consulta (Paso C3)</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* ================= PASO C3: TIPO DE CONSULTA ================= */}
      {currentStep === 'consulta-c3-tipo' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-500 dark:text-[#aac7ff] text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>PASO C3: TIPO DE CONSULTA</span>
            </div>
            <span className="text-xs font-mono text-slate-400">Paso 3 de 5</span>
          </div>

          <div className="space-y-1 px-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              ¿Cuál es el motivo de tu atención?
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Selecciona si presentas un síntoma o molestia actual, o si requieres un chequeo o control de salud.
            </p>
          </div>

          {/* 2 Big Spatial Cards */}
          <div className="grid grid-cols-1 gap-4 pt-1">
            {/* Opción [A]: Tengo un síntoma/dolor */}
            <button
              type="button"
              onClick={() => handleSelectTipoConsulta('sintoma')}
              className="p-5 sm:p-6 rounded-squircle liquid-glass-card border-2 border-blue-500/40 text-left flex items-start gap-4 transition-all duration-200 active:scale-[0.98] cursor-pointer hover:border-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.25)]"
            >
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-lg">
                <i className="fa-solid fa-stethoscope"></i>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                    [A] Tengo un síntoma / dolor
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold">
                    EVALUACIÓN
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                  Dolor localizado, malestar corporal, fiebre, problemas digestivos o respiratorios agudos.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span>Abrir Escala EVA y Rejilla Anatómica</span>
                  <i className="fa-solid fa-arrow-right text-[11px]"></i>
                </div>
              </div>
            </button>

            {/* Opción [B]: Chequeo / Control anual */}
            <button
              type="button"
              onClick={() => handleSelectTipoConsulta('control')}
              className="p-5 sm:p-6 rounded-squircle liquid-glass-card border-2 border-emerald-500/40 text-left flex items-start gap-4 transition-all duration-200 active:scale-[0.98] cursor-pointer hover:border-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]"
            >
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-lg">
                <i className="fa-solid fa-clipboard-check"></i>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                    [B] Chequeo / Control anual
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold">
                    PREVENTIVO
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                  Revisión anual rutinaria, certificado médico / laboral o seguimiento de patologías crónicas.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span>Abrir Tamizajes y Cribado Preventivo</span>
                  <i className="fa-solid fa-arrow-right text-[11px]"></i>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ================= PASO C4 [A]: EVALUACIÓN DE SÍNTOMA ================= */}
      {currentStep === 'consulta-c4-sintoma' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-500 dark:text-[#aac7ff] text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>PASO C4: EVALUACIÓN CLÍNICA (SÍNTOMA)</span>
            </div>
            <span className="text-xs font-mono text-slate-400">Paso 4 de 5</span>
          </div>

          <div className="space-y-1 px-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              ¿Qué síntoma o dolor presentas?
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Calibra la intensidad del dolor y selecciona la zona corporal afectada.
            </p>
          </div>

          {/* 1. ESCALA DE DOLOR EVA (1-10) */}
          <div className="p-4 rounded-squircle liquid-glass-card space-y-3 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Escala Visual Analógica
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                    {evaScore}
                  </span>
                  <span className="font-mono text-xs text-slate-400">/ 10</span>
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-full font-mono text-xs font-bold ${
                  evaScore >= 8
                    ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500 animate-pulse'
                    : evaScore >= 6
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                }`}
              >
                {evaScore >= 8
                  ? 'DOLOR SEVERO (CRÍTICO)'
                  : evaScore >= 6
                  ? 'DOLOR INTENSO'
                  : evaScore >= 3
                  ? 'DOLOR MODERADO'
                  : 'DOLOR LEVE'}
              </div>
            </div>

            {/* Slider */}
            <div className="py-2">
              <input
                type="range"
                min="1"
                max="10"
                value={evaScore}
                onChange={(e) => handleEvaChange(parseInt(e.target.value))}
                className="w-full h-2.5 rounded-full accent-blue-600 cursor-pointer bg-slate-200 dark:bg-slate-700"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1 px-1">
                <span>1 (Leve)</span>
                <span>5 (Moderado)</span>
                <span className="text-red-500 font-bold">10 (Incapacitante)</span>
              </div>
            </div>
          </div>

          {/* 2. REJILLA POR ZONA CORPORAL (7 OPCIONES) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase font-mono px-1">
              Rejilla por Zona Corporal
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BODY_ZONES.map((zone) => {
                const isSelected = bodyZone === zone.name;
                const isOther = zone.id === 'other';

                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => {
                      setBodyZone(zone.name);
                      showToast(`Zona seleccionada: ${zone.name}`, 'fa-crosshairs');
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-600 shadow-md'
                        : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px] text-blue-500 dark:text-[#aac7ff]">
                          {zone.icon}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {zone.name}
                        </h3>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-transparent'
                        }`}
                      >
                        <i className="fa-solid fa-check text-[8px]"></i>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                      {zone.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Custom Dictation / Text if "Otro motivo" selected */}
            {bodyZone.includes('Otro') && (
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-blue-500/30 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-white font-mono">
                    Describe tu molestia:
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleVoiceDictation('symptom')}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isDictatingSymptom ? 'bg-red-600 text-white animate-pulse' : 'bg-blue-600 text-white'
                    }`}
                  >
                    <i className="fa-solid fa-microphone text-[10px]"></i>
                    <span>{isDictatingSymptom ? 'Detener' : 'Dictar por voz'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={symptomDescription}
                  onChange={(e) => setSymptomDescription(e.target.value)}
                  placeholder="Detalla tu molestia..."
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-700"
                />
              </div>
            )}
          </div>

          {/* 3. CUESTIONARIO RAMIFICADO BREVE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Duración */}
            <div className="p-3.5 rounded-2xl liquid-glass-card border border-slate-200 dark:border-slate-800 space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                <i className="fa-solid fa-clock text-blue-500"></i>
                <span>Tiempo de evolución:</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {['< 24 horas', '1 a 3 días', '1 a 2 semanas', '> 1 mes'].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSymptomDuration(dur)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold font-mono cursor-pointer transition-all ${
                      symptomDuration === dur
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de Sensación */}
            <div className="p-3.5 rounded-2xl liquid-glass-card border border-slate-200 dark:border-slate-800 space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                <i className="fa-solid fa-wave-square text-blue-500"></i>
                <span>Tipo de dolor / sensación:</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {['Punzante', 'Opresivo / Presión', 'Ardor / Quemazón', 'Cólico'].map((sens) => (
                  <button
                    key={sens}
                    type="button"
                    onClick={() => setPainType(sens)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold font-mono cursor-pointer transition-all truncate ${
                      painType === sens
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {sens}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setPatient((prev) => ({
                  ...prev,
                  evaScore,
                  bodyZone,
                  symptomDescription,
                  symptomDuration,
                  painType,
                }));
                setStep('consulta-c5-antecedentes');
                showToast('Evaluación de síntoma guardada', 'fa-check');
              }}
              className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
            >
              <span>Continuar a Antecedentes y Hábitos (Paso C5)</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* ================= PASO C4 [B]: CHEQUEO / CONTROL ANUAL ================= */}
      {currentStep === 'consulta-c4-control' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>PASO C4: CHEQUEO / CONTROL ANUAL</span>
            </div>
            <span className="text-xs font-mono text-slate-400">Paso 4 de 5</span>
          </div>

          <div className="space-y-1 px-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              ¿Qué tipo de chequeo requieres?
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Selecciona el objetivo de tu consulta preventiva y tus tamizajes previos.
            </p>
          </div>

          {/* Motivo de Control */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase font-mono px-1">
              Objetivo del Control
            </span>

            <div className="space-y-2">
              {[
                {
                  id: 'Rutina general',
                  title: 'Rutina general y preventiva anual',
                  subtitle: 'Chequeo médico integral de despistaje',
                  icon: 'fa-user-doctor',
                },
                {
                  id: 'Certificado médico / Laboral',
                  title: 'Certificado médico / laboral / aptitud',
                  subtitle: 'Evaluación de aptitud física o constancia médica',
                  icon: 'fa-file-signature',
                },
                {
                  id: 'Control de enfermedad crónica',
                  title: 'Control de enfermedad crónica conocida',
                  subtitle: 'Seguimiento de HTA, Diabetes, Tiroides o Renal',
                  icon: 'fa-notes-medical',
                },
              ].map((item) => {
                const isSelected = controlReason === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setControlReason(item.id as typeof controlReason);
                      showToast(`Motivo: ${item.title}`, 'fa-clipboard-check');
                    }}
                    className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-md'
                        : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-base ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-emerald-500'
                        }`}
                      >
                        <i className={`fa-solid ${item.icon}`}></i>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-transparent'
                      }`}
                    >
                      <i className="fa-solid fa-check text-[10px]"></i>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tamizajes Previos */}
          <div className="p-4 rounded-squircle liquid-glass-card space-y-3 border border-slate-200 dark:border-slate-800 shadow-xl">
            <span className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
              <i className="fa-solid fa-vial text-emerald-500"></i>
              <span>Tamizajes o exámenes realizados (últimos 12 meses):</span>
            </span>

            <div className="space-y-2">
              {[
                'Análisis de sangre y glucosa reciente',
                'Papanicolaou (PAP) / Citología',
                'Mamografía bilateral',
                'Antígeno prostático (PSA)',
                'Ningún tamizaje en los últimos 12 meses',
              ].map((scr) => {
                const isChecked = screenings.includes(scr);
                return (
                  <button
                    key={scr}
                    type="button"
                    onClick={() => toggleScreening(scr)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 text-slate-900 dark:text-white shadow-sm'
                        : 'bg-slate-100/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-zinc-300'
                    }`}
                  >
                    <span>{scr}</span>
                    <i
                      className={`fa-solid ${
                        isChecked ? 'fa-square-check text-emerald-500 text-sm' : 'fa-square text-slate-400'
                      }`}
                    ></i>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setPatient((prev) => ({
                  ...prev,
                  controlReason,
                  screenings,
                }));
                setStep('consulta-c5-antecedentes');
                showToast('Tamizajes preventivos registrados', 'fa-check');
              }}
              className="w-full py-4 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
            >
              <span>Continuar a Antecedentes y Hábitos (Paso C5)</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* ================= PASO C5: ANTECEDENTES Y HÁBITOS ================= */}
      {currentStep === 'consulta-c5-antecedentes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-500 dark:text-[#aac7ff] text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>PASO C5: ANTECEDENTES Y HÁBITOS</span>
            </div>
            <span className="text-xs font-mono text-slate-400">Paso 5 de 5</span>
          </div>

          <div className="space-y-1 px-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              Antecedentes Médicos y Hábitos
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Información clínica para calibrar la prioridad y confeccionar tu ficha SBAR/SOAP.
            </p>
          </div>

          {/* Preexistencias */}
          <div className="p-4 rounded-squircle liquid-glass-card space-y-2.5 border border-slate-200 dark:border-slate-800 shadow-xl">
            <span className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
              <i className="fa-solid fa-heart-circle-check text-rose-500"></i>
              <span>Preexistencias médicas:</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              {PREEXISTING_CONDITIONS.map((cond) => {
                const isSelected = conditions.includes(cond.title);
                return (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => toggleCondition(cond.title)}
                    className={`p-2.5 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="truncate">{cond.title}</span>
                    <i className={`fa-solid ${isSelected ? 'fa-check' : 'fa-plus'} text-[10px]`}></i>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alergias y Medicación Diaria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Alergias */}
            <div className="p-3.5 rounded-2xl liquid-glass-card border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                <span>Alergias a fármacos:</span>
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {['Sin Alergias', 'Penicilinas', 'AINEs', 'Sulfas'].map((al) => (
                  <button
                    key={al}
                    type="button"
                    onClick={() => setAllergiesDrug(al)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                      allergiesDrug === al
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {al}
                  </button>
                ))}
              </div>
            </div>

            {/* Medicación Diaria */}
            <div className="p-3.5 rounded-2xl liquid-glass-card border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                  <i className="fa-solid fa-pills text-blue-500"></i>
                  <span>Medicamentos diarios:</span>
                </span>
                <button
                  type="button"
                  onClick={addMedication}
                  className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs cursor-pointer shadow"
                  title="Agregar medicamento"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                {dailyMedications.map((med) => (
                  <span
                    key={med}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-[#aac7ff] font-mono text-[11px] font-bold"
                  >
                    <span>{med}</span>
                    <button
                      type="button"
                      onClick={() => removeMedication(med)}
                      className="text-slate-400 hover:text-red-500 ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Cirugías Previas & Hábitos */}
          <div className="p-4 rounded-squircle liquid-glass-card space-y-3 border border-slate-200 dark:border-slate-800 shadow-xl">
            {/* Cirugías */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                  <i className="fa-solid fa-syringe text-purple-500"></i>
                  <span>Cirugías previas:</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleVoiceDictation('surgery')}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isDictatingSurgery ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <i className="fa-solid fa-microphone text-[9px]"></i>
                  <span>Dictar</span>
                </button>
              </div>
              <input
                type="text"
                value={surgeries}
                onChange={(e) => setSurgeries(e.target.value)}
                placeholder="Ej. Apendicectomía o Ninguna reciente"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Hábitos: Tabaco y Alcohol */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-400 mb-1 font-mono">
                  Consumo de Tabaco
                </label>
                <select
                  value={tobacco}
                  onChange={(e) => setTobacco(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none border border-slate-200 dark:border-slate-700"
                >
                  <option value="No fuma">No fuma</option>
                  <option value="Fumador ocasional">Fumador ocasional</option>
                  <option value="Fumador activo">Fumador activo</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-zinc-400 mb-1 font-mono">
                  Consumo de Alcohol
                </label>
                <select
                  value={alcohol}
                  onChange={(e) => setAlcohol(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none border border-slate-200 dark:border-slate-700"
                >
                  <option value="Ninguno">Ninguno</option>
                  <option value="Ocasional">Ocasional</option>
                  <option value="Frecuente">Frecuente</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleEmitConsultaPass}
              className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-600/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <i className="fa-solid fa-qrcode text-base"></i>
              <span>Emitir Pase Consulta / Control QR</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= EMISIÓN PASE CONSULTA / CONTROL QR ================= */}
      {currentStep === 'consulta-pase' && (
        <div className="space-y-5">
          <div className="text-center space-y-1 max-w-xl mx-auto">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 squircle-full text-xs font-extrabold border ${
                priority.level === 'PRIORIDAD II'
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-400'
                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border-blue-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span>{priority.badge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Pase Digital de Consulta y Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Presenta este código en ventanilla de admisión o triaje para atención preferencial.
            </p>
          </div>

          {/* Pass Card */}
          <div className="liquid-glass-card squircle-lg p-5 sm:p-7 max-w-md mx-auto relative overflow-hidden shadow-[0_20px_50px_rgba(0,102,255,0.2)] border-2 border-blue-500/40 space-y-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 squircle-sm bg-blue-600 flex items-center justify-center text-white text-base shadow">
                  <i className="fa-solid fa-notes-medical"></i>
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    TRIAJE AMBULATORIO MINSA
                  </div>
                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    EsSalud / MINSA NTS-124
                  </div>
                </div>
              </div>

              <div
                className={`px-3 py-1 squircle-full text-[10px] font-black tracking-wider uppercase text-white shadow ${priority.badgeBg}`}
              >
                {priority.level}
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center">
              <div className="p-3 bg-white squircle-md shadow-inner border-2 border-blue-300 flex items-center justify-center relative w-48 h-48 sm:w-52 sm:h-52">
                <VectorQRCode
                  dataString={stringifyQrPayload({
                    schema: 'triajeia-peru/v1',
                    type: 'CONSULTA_AMBULATORIA',
                    id: passNumber,
                    date: new Date().toISOString().slice(0, 10),
                    patient: {
                      fullName,
                      dni,
                      age,
                      sex,
                    },
                    consultationType: consultaTipo,
                    priority: priority.level,
                    category: priority.badge,
                    facility: selectedCenter.name,
                    modality: mode === 'presencial' ? 'Presencial' : 'Teleconsulta',
                    eva: consultaTipo === 'sintoma' ? evaScore : 0,
                    symptoms: {
                      bodyZone: consultaTipo === 'sintoma' ? bodyZone : 'Control preventivo',
                      description: consultaTipo === 'sintoma' ? (symptomDescription || bodyZone) : controlReason,
                      duration: consultaTipo === 'sintoma' ? symptomDuration : 'No aplica',
                      painType: consultaTipo === 'sintoma' ? painType : 'No aplica',
                    },
                    location: {
                      address: patientGps.address || selectedCenter.address || '',
                      lat: patientGps.lat,
                      lng: patientGps.lng,
                      accuracy: patientGps.accuracy,
                    },
                    medicalHistory: {
                      conditions,
                      allergies: allergiesDrug || 'Ninguna registrada',
                      medications: dailyMedications,
                      surgeries,
                    },
                    screenings: consultaTipo === 'control' ? screenings : [],
                    sbar: {
                      situation: `Atención ambulatoria ${priority.level}: ${consultaTipo === 'sintoma' ? symptomDescription || bodyZone : controlReason}`,
                      background: `Paciente ${fullName}, DNI ${dni}, ${age} años. Antecedentes: ${conditions.join(', ') || 'Ninguno'}. Alergias: ${allergiesDrug || 'Ninguna'}`,
                      assessment: `Nivel de prioridad ${priority.level}. EVA: ${consultaTipo === 'sintoma' ? `${evaScore}/10` : 'N/A'}. Duración: ${consultaTipo === 'sintoma' ? symptomDuration : 'Control'}`,
                      recommendation: `Turno confirmado en ${selectedCenter.name}. Presentar QR en módulo de admisión SIHCE.`,
                    },
                  })}
                  isEmergency={false}
                  size={220}
                />
                <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-blue-600 text-white font-extrabold text-[9px] shadow">
                  ATENCIÓN HOY
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="mb-1 max-w-[260px] text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">DNI:</span> {maskDniForDisplay(dni)} <span aria-hidden="true">·</span>{' '}
                  <span className="font-semibold">Prioridad:</span> {priority.level}<br />
                  <span className="font-semibold">Síntomas:</span>{' '}
                  {consultaTipo === 'sintoma' ? symptomDescription || bodyZone : controlReason}
                </div>
                <span className="text-sm font-mono font-black text-blue-600 dark:text-blue-400 tracking-wider">
                  {passNumber}
                </span>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Turno Confirmado en {selectedCenter.name}
                </div>
              </div>
            </div>

            {/* Patient & Admission Info Block */}
            <div className="space-y-2 bg-white/70 dark:bg-slate-900/70 p-3.5 squircle-md border border-slate-200 dark:border-slate-800 text-xs">
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
                <span className="text-slate-500 dark:text-slate-400">Motivo:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 truncate max-w-[200px]">
                  {consultaTipo === 'sintoma' ? `${bodyZone} (${painType})` : controlReason}
                </span>
              </div>
              {consultaTipo === 'sintoma' && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Escala EVA:</span>
                  <span className="font-black text-amber-500 font-mono">
                    {evaScore} / 10 ({symptomDuration})
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Centro Asignado:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {selectedCenter.name}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Modalidad:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    {mode === 'presencial' ? 'Presencial (Tópico de Medicina General)' : 'Teleconsulta Virtual'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Origen GPS Paciente:</span>
                  <span className="font-mono text-[11px] text-blue-500 font-bold truncate max-w-[180px]">
                    {patientGps.address}
                  </span>
                </div>
                {selectedCenter.lat && selectedCenter.lng && (
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Ruta GPS:</span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${patientGps.lat},${patientGps.lng}&destination=${encodeURIComponent(`${selectedCenter.name}, ${selectedCenter.address || ''}, Perú`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-[11px] font-bold flex items-center gap-1"
                    >
                      <i className="fa-solid fa-route"></i>
                      <span>Cómo llegar ({selectedCenter.distance || selectedCenter.time})</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Expandable SBAR/SOAP Clinical Report */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsSbarOpen(!isSbarOpen)}
                className="w-full text-left flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-file-medical text-blue-600"></i>
                  <span>Ver Ficha Clínica SBAR / SOAP Compilada</span>
                </span>
                <i
                  className={`fa-solid fa-chevron-down text-[10px] transition-transform ${
                    isSbarOpen ? 'rotate-180' : ''
                  }`}
                ></i>
              </button>

              {isSbarOpen && (
                <div className="mt-2 p-3 squircle-sm bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto border border-blue-900/80">
                  <pre className="whitespace-pre-wrap">{sbarFormatted}</pre>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => showToast(`Pase de Consulta descargado: ${passNumber}`, 'fa-floppy-disk')}
                className="flex-1 py-3.5 squircle-md bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs press-tactile transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                <i className="fa-solid fa-download"></i>
                <span>Descargar Pase Digital</span>
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

      {/* ================= HIGH EVA (>= 8) ESCALATION ALERT MODAL ================= */}
      {showHighEvaModal && (
        <div className="fixed inset-0 z-50 bg-[#0b0f17]/85 backdrop-blur-3xl flex items-center justify-center p-4 transition-all duration-300">
          <div className="w-full max-w-md rounded-squircle liquid-glass-emergency p-6 text-center space-y-4 shadow-2xl border-2 border-red-500 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-600 text-white flex items-center justify-center text-3xl shadow-[0_0_32px_rgba(220,38,38,0.6)] animate-pulse">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white font-mono text-[10px] font-extrabold tracking-wider uppercase">
                ALERTA DE ALTA SEVERIDAD (EVA {evaScore}/10)
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                ¿Deseas cambiar a Emergencia Vital?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-snug">
                Un dolor de nivel 8 o superior sugiere un cuadro agudo severo. Se recomienda activar de inmediato la{' '}
                <strong className="text-red-600 dark:text-red-400 font-extrabold">
                  Vía 1: Emergencia Médica Vital (Código Rojo)
                </strong>{' '}
                para despacho de ambulancia o preaviso a Shock Trauma.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleEscalateNow}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-sm shadow-xl shadow-red-600/40 emergency-pulse-ring cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-truck-medical text-base"></i>
                <span>Transferir a Emergencia Vital (Código Rojo)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHighEvaModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Continuar en Consulta ambulatoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
