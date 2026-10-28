import React, { useState, useEffect } from 'react';
import { ActiveTab, AppStep, PatientData, PassRecord, UserProfile } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Step1Selection } from './components/Step1Selection';
import { EmergencyFlow } from './components/EmergencyFlow';
import { ConsultaFlow } from './components/ConsultaFlow';
import { HistoryTickets } from './components/HistoryTickets';

export default function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('step0-selection');
  const [activeTab, setActiveTab] = useState<ActiveTab>('triaje');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [toast, setToast] = useState<{ visible: boolean; message: string; icon: string }>({
    visible: false,
    message: '',
    icon: 'fa-check',
  });

  // Persistent User Profile (New users start with empty profile state)
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('aether_patient_profile');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse patient profile from localStorage:', e);
    }
    return {
      firstName: '',
      lastName: '',
      dni: '',
      age: undefined,
      sex: '',
      bloodType: 'O+',
      allergies: '',
      emergencyContact: '',
    };
  });

  // Patient data initialized from profile or empty state
  const [patient, setPatient] = useState<PatientData>(() => {
    let prof: Partial<UserProfile> = {};
    try {
      const saved = localStorage.getItem('aether_patient_profile');
      if (saved) prof = JSON.parse(saved);
    } catch (_) {}

    const fullName = `${prof.firstName || ''} ${prof.lastName || ''}`.trim();
    return {
      fullName: fullName || '',
      dni: prof.dni || '',
      age: prof.age ?? 0,
      sex: prof.sex || '',
      phone: prof.emergencyContact || '',
      beneficiaryType: 'self',
      // Vía 1 Emergency fields
      emergencyCategory: 'Dolor de Pecho Opresivo / Sospecha de Infarto',
      emergencyCustomReason: '',
      canMove: true,
      sample: {
        evolutionTime: '< 30 minutos',
        allergies: prof.allergies || '',
        allergiesCustom: '',
        criticalMeds: '',
        preexisting: '',
        lastOralIntake: '< 2 horas',
      },
      // Vía 2 Consulta fields
      consultaTipo: 'sintoma',
      evaScore: 5,
      bodyZone: 'Pecho / Respiratorio',
      symptomDescription: '',
      symptomDuration: '< 24 horas',
      painType: 'Opresivo / Presión',
      controlReason: 'Rutina general',
      screenings: [],
      chronicConditions: [],
      allergiesDrug: prof.allergies || '',
      dailyMedications: [],
      previousSurgeries: '',
      tobacco: 'No fuma',
      alcohol: 'No consume',
      selectedCenter: {
        id: 7,
        name: 'C.S. San Isidro (I-3)',
        distance: '0.8 km • 12 min a pie',
        time: '12 min a pie',
        type: 'MINSA',
        specialty: 'Medicina General',
        availability: '4 médicos disponibles hoy',
        address: 'Av. Pérez Araníbar (Av. del Ejército) 1756, San Isidro',
        lat: -12.10676,
        lng: -77.05491,
      },
    };
  });

  // User's personal pass records loaded from localStorage (empty array for new users)
  const [userPasses, setUserPasses] = useState<PassRecord[]>(() => {
    try {
      const saved = localStorage.getItem('aether_user_passes');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load user passes from localStorage:', e);
    }
    return [];
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
    showToast(
      isDarkMode ? 'Modo Claro activado' : 'Modo Oscuro activado',
      isDarkMode ? 'fa-sun' : 'fa-moon'
    );
  };

  const showToast = (message: string, icon = 'fa-check') => {
    setToast({ visible: true, message, icon });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3200);
  };

  const handleStepChange = (step: AppStep) => {
    setCurrentStep(step);
    setActiveTab('triaje');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePassGenerated = (newPass: PassRecord) => {
    setUserPasses((prev) => {
      const updated = [newPass, ...prev];
      try {
        localStorage.setItem('aether_user_passes', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save pass to localStorage:', e);
      }
      return updated;
    });
  };

  const handleProfileUpdated = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    try {
      localStorage.setItem('aether_patient_profile', JSON.stringify(updatedProfile));
    } catch (e) {
      console.warn('Failed to persist profile:', e);
    }
    // Synchronize current patient filiation in state
    setPatient((prev) => ({
      ...prev,
      fullName: `${updatedProfile.firstName} ${updatedProfile.lastName}`.trim() || prev.fullName,
      dni: updatedProfile.dni || prev.dni,
      age: updatedProfile.age ?? prev.age,
      sex: updatedProfile.sex || prev.sex,
      sample: {
        ...prev.sample,
        allergies: updatedProfile.allergies || prev.sample.allergies,
      },
      allergiesDrug: updatedProfile.allergies || prev.allergiesDrug,
    }));
  };

  const handleEscalateToEmergency = (eva: number, reason: string) => {
    setPatient((prev) => ({
      ...prev,
      evaScore: eva,
      emergencyCategory: `URGENCIA DERIVADA (EVA ${eva}/10): ${reason}`,
    }));
    handleStepChange('emergency-e1-motivo');
  };

  const isEmergency = currentStep.startsWith('emergency-');

  return (
    <div
      className={`min-h-screen relative overflow-x-hidden transition-colors duration-500 font-sans ${
        isDarkMode ? 'bg-[#0b0f17] text-[#e2e2ea]' : 'bg-[#f2f6fc] text-[#0f172a]'
      }`}
    >
      {/* Ambient Glow Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className={`ambient-orb w-[600px] h-[600px] -top-32 -left-32 transition-all duration-700 ${
            isEmergency
              ? 'bg-red-500/35 dark:bg-red-700/25'
              : 'bg-blue-500/20 dark:bg-blue-600/15'
          }`}
        ></div>
        <div
          className={`ambient-orb w-[680px] h-[680px] top-1/4 -right-48 transition-all duration-700 ${
            isEmergency
              ? 'bg-rose-400/30 dark:bg-rose-900/25'
              : 'bg-sky-400/15 dark:bg-indigo-900/15'
          }`}
        ></div>
        <div className="ambient-orb w-[550px] h-[550px] -bottom-40 left-1/3 bg-blue-400/15 dark:bg-blue-900/10"></div>
      </div>

      {/* Main Container Shell */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between max-w-4xl mx-auto px-3 sm:px-6 py-3">
        {/* Top Minimal Header */}
        <Header
          currentStep={currentStep}
          setStep={handleStepChange}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />

        {/* Main Content Area */}
        <main className="w-full flex-1 flex flex-col justify-center my-auto px-1 sm:px-3">
          {activeTab === 'pases' ? (
            <HistoryTickets
              userPasses={userPasses}
              profile={profile}
              onProfileUpdated={handleProfileUpdated}
              onNewTriage={() => handleStepChange('step0-selection')}
              showToast={showToast}
            />
          ) : (
            <>
              {currentStep === 'step0-selection' && (
                <Step1Selection
                  onSelectFlow={handleStepChange}
                  showToast={showToast}
                />
              )}

              {currentStep.startsWith('emergency-') && (
                <EmergencyFlow
                  currentStep={currentStep}
                  setStep={handleStepChange}
                  patient={patient}
                  setPatient={setPatient}
                  showToast={showToast}
                  onPassGenerated={handlePassGenerated}
                />
              )}

              {currentStep.startsWith('consulta-') && (
                <ConsultaFlow
                  currentStep={currentStep}
                  setStep={handleStepChange}
                  patient={patient}
                  setPatient={setPatient}
                  showToast={showToast}
                  onPassGenerated={handlePassGenerated}
                  onEscalateToEmergency={handleEscalateToEmergency}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating Bottom Dock (Triaje & Mis Pases) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        passCount={userPasses.length}
      />

      {/* Floating Toast Notification */}
      <div
        className={`fixed bottom-22 left-1/2 -translate-x-1/2 z-50 px-5 py-3 squircle-full liquid-glass-card border text-xs font-bold shadow-2xl flex items-center gap-2.5 transition-all duration-300 pointer-events-none max-w-sm ${
          toast.visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        } ${
          isEmergency
            ? 'border-red-500/60 text-red-600 dark:text-red-400 bg-red-50/90 dark:bg-red-950/90'
            : 'border-blue-500/60 text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-slate-900/90'
        }`}
      >
        <i className={`fa-solid ${toast.icon} text-sm`}></i>
        <span className="truncate">{toast.message}</span>
      </div>
    </div>
  );
}
