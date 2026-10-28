import React, { useState } from 'react';
import { PatientData } from '../types';
import { ConsultaMap, INITIAL_HEALTH_CENTERS, HealthCenterItem } from './ConsultaMap';

interface Step2CentroProps {
  onNext: () => void;
  onBack: () => void;
  patient: PatientData;
  setPatient: React.Dispatch<React.SetStateAction<PatientData>>;
  showToast: (msg: string, icon?: string) => void;
}

const HEALTH_CENTERS = INITIAL_HEALTH_CENTERS;

export const Step2Centro: React.FC<Step2CentroProps> = ({
  onNext,
  onBack,
  patient,
  setPatient,
  showToast,
}) => {
  const [mode, setMode] = useState<'presencial' | 'teleconsulta'>('presencial');
  const [centersList, setCentersList] = useState<HealthCenterItem[]>(INITIAL_HEALTH_CENTERS);
  const [selectedCenterId, setSelectedCenterId] = useState<number>(() => {
    const selected =
      INITIAL_HEALTH_CENTERS.find((center) => center.name === patient.selectedCenter.name) ||
      INITIAL_HEALTH_CENTERS.find((center) => center.id === patient.selectedCenter.id);
    return selected?.id || 1;
  });
  const [patientGps, setPatientGps] = useState({
    lat: -12.083842,
    lng: -77.045911,
    accuracy: '±6m',
    address: 'Av. Salaverry 1240, Jesús María / San Isidro, Lima',
  });
  const [activeFilter, setActiveFilter] = useState<string>('< 2 km');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);

  const handleSelectCenter = (center: HealthCenterItem) => {
    setSelectedCenterId(center.id);
    setPatient((prev) => ({
      ...prev,
      selectedCenter: {
        id: center.id,
        name: center.name,
        distance: center.distance || '',
        time: center.walkingTime || center.time || '',
        type: center.type,
        specialty: center.specialty,
        availability: center.availability,
        address: center.address,
        lat: center.lat,
        lng: center.lng,
      },
    }));
    showToast(`Centro seleccionado: ${center.name}`, 'fa-hospital');
  };

  const handleModeChange = (newMode: 'presencial' | 'teleconsulta') => {
    setMode(newMode);
    showToast(
      newMode === 'presencial'
        ? 'Modalidad: Presencial en Centro de Salud'
        : 'Modalidad: Teleconsulta Virtual Inmediata',
      newMode === 'presencial' ? 'fa-hospital' : 'fa-video'
    );
  };

  const filteredCenters = centersList
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
      c.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.district && c.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.zone && c.zone.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  return (
    <div className="flex flex-col w-full max-w-md mx-auto space-y-5 pb-24">
      {/* Sub-header navigation row with back trigger & step info */}
      <div className="flex items-center justify-between w-full">
        <button
          type="button"
          aria-label="Volver al paso anterior"
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-xl text-white shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 backdrop-blur-xl">
          <span className="w-1.5 h-1.5 rounded-full bg-[#aac7ff] shadow-[0_0_6px_#aac7ff]"></span>
          <span className="font-mono text-[11px] text-[#aac7ff] uppercase tracking-wider font-semibold">
            Centro &amp; Modalidad
          </span>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Screen Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">
          ¿Dónde deseas atenderte?
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ubica tu centro más cercano o elige teleconsulta.
        </p>
      </div>

      {/* Service Mode Switcher (Spatial VisionOS Segmented Pill) */}
      <div className="p-1 rounded-full bg-slate-200 dark:bg-[#0c0e13]/90 backdrop-blur-2xl shadow-inner flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleModeChange('presencial')}
          className={`flex-1 py-2.5 px-4 rounded-full font-body text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mode === 'presencial'
              ? 'bg-[#3e90ff]/20 text-blue-600 dark:text-[#f8f7ff] shadow-[0_0_24px_rgba(62,144,255,0.25)] border border-blue-400/40'
              : 'text-slate-500 dark:text-zinc-400 hover:text-white'
          }`}
        >
          <span
            className="material-symbols-outlined text-[17px] text-blue-500 dark:text-[#aac7ff]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            domain
          </span>
          <span>Presencial (Centro de Salud)</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('teleconsulta')}
          className={`flex-1 py-2.5 px-3 rounded-full font-body text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mode === 'teleconsulta'
              ? 'bg-[#3e90ff]/20 text-blue-600 dark:text-[#f8f7ff] shadow-[0_0_24px_rgba(62,144,255,0.25)] border border-blue-400/40'
              : 'text-slate-500 dark:text-zinc-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">video_chat</span>
          <span>Teleconsulta</span>
        </button>
      </div>

      {/* Search Spatial Bar */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <span className="material-symbols-outlined text-[19px]">search</span>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar posta, policlínico u hospital..."
          className="w-full pl-11 pr-10 py-3 rounded-full bg-white/70 dark:bg-[#191c21]/90 backdrop-blur-xl text-slate-900 dark:text-[#e2e2ea] placeholder:text-slate-400 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 dark:border-slate-800 transition-all"
        />
        <button
          type="button"
          aria-label="Filtro rápido de ubicación"
          onClick={() => showToast('Filtro de geolocalización por Red de Salud activo', 'fa-filter')}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">tune</span>
        </button>
      </div>

      {/* Distance / Tag Chips (Horizontal Scrollable) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-5 px-5">
        {['< 2 km', 'Citas hoy', 'Posta / CS I-3', 'Hospital II / III'].map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setActiveFilter(chip)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full font-mono text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeFilter === chip
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                : 'bg-white/60 dark:bg-slate-800/70 text-slate-700 dark:text-zinc-300 hover:bg-slate-700'
            }`}
          >
            {chip === '< 2 km' && (
              <span
                className="material-symbols-outlined text-[13px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                near_me
              </span>
            )}
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Interactive Leaflet Map Module */}
      <ConsultaMap
        selectedCenter={centersList.find((c) => c.id === selectedCenterId) || centersList[0]}
        onSelectCenter={(center) => handleSelectCenter(center)}
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
        onCentersRecalculated={(recalc) => setCentersList(recalc)}
      />

      {/* Recommended Healthcare Centers Stack */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
            Establecimientos recomendados
          </span>
          <span className="font-mono text-[11px] text-blue-500 dark:text-[#aac7ff]">
            Orden: Proximidad
          </span>
        </div>

        {filteredCenters.map((center) => {
          const isSelected = center.id === selectedCenterId;
          return (
            <div
              key={center.id}
              onClick={() => handleSelectCenter(center)}
              className={`relative p-4 rounded-squircle transition-all cursor-pointer active:scale-[0.99] border ${
                isSelected
                  ? 'bg-white/95 dark:bg-[#191c21]/95 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,102,255,0.18)] border-blue-500'
                  : 'bg-white/70 dark:bg-[#191c21]/70 hover:bg-white dark:hover:bg-[#191c21] backdrop-blur-xl shadow-md border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                    isSelected
                      ? 'bg-blue-500/20 text-blue-500 dark:text-[#aac7ff]'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-zinc-400'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: isSelected ? "'FILL' 1" : undefined }}
                  >
                    {center.icon}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                      {center.name}
                    </h2>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-[0_0_10px_#0066ff]'
                          : 'bg-slate-200 dark:bg-slate-800 text-transparent'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </div>
                  </div>

                  <p
                    className={`text-xs font-medium mt-0.5 ${
                      isSelected ? 'text-blue-600 dark:text-[#aac7ff]' : 'text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {center.distance}
                  </p>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-zinc-400 font-medium">
                      {center.type}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-zinc-400">
                      {center.specialty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Bar */}
              <div
                className={`mt-3.5 pt-3 flex items-center justify-between -mx-4 -mb-4 px-4 py-2.5 rounded-b-squircle ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-slate-800/60'
                    : 'bg-slate-50 dark:bg-[#0c0e13]/40'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      center.availColor === 'emerald'
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : 'bg-amber-400'
                    }`}
                  ></span>
                  <span
                    className={`text-xs font-medium ${
                      isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {center.availability}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold ${
                    isSelected
                      ? 'text-blue-600 dark:text-[#aac7ff]'
                      : 'text-slate-400 dark:text-zinc-500'
                  }`}
                >
                  {isSelected ? 'SELECCIONADO' : 'Elegir'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Spatial Forward CTA Button */}
      <div className="pt-3">
        <button
          type="button"
          onClick={onNext}
          className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 shadow-[0_10px_35px_rgba(0,102,255,0.4)] active:scale-[0.98] transition-all cursor-pointer text-sm sm:text-base"
        >
          <span>Continuar con Datos del Paciente</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
        <div className="text-center mt-2.5">
          <span className="text-[11px] text-slate-400 font-mono">Paso 2 completado de 6</span>
        </div>
      </div>
    </div>
  );
};
