export type AppStep =
  | 'step0-selection'
  // VÍA 1: EMERGENCIA MÉDICA VITAL
  | 'emergency-e1-motivo'
  | 'emergency-e2-movilidad'
  | 'emergency-e2-auxilio'
  | 'emergency-e2-mapa'
  | 'emergency-e3-datos'
  | 'emergency-e4-sample'
  | 'emergency-pase'
  // VÍA 2: CONSULTA Y CONTROL MÉDICO
  | 'consulta-c1-datos'
  | 'consulta-c2-geo'
  | 'consulta-c3-tipo'
  | 'consulta-c4-sintoma'
  | 'consulta-c4-control'
  | 'consulta-c5-antecedentes'
  | 'consulta-pase';

export type ActiveTab = 'triaje' | 'pases';

export type ConsultaTipo = 'sintoma' | 'control';

export interface UserProfile {
  firstName: string;
  lastName: string;
  dni: string;
  age: number | '';
  sex: 'F' | 'M' | '';
  bloodType: string;
  allergies: string;
  emergencyContact: string;
}

export interface DoctorOrder {
  id: string;
  date: string;
  doctor: string;
  specialty: string;
  facility: string;
  patientDni: string;
  diagnosis: string;
  prescriptions: string[];
  labOrders?: string[];
  nextAppointment?: string;
  notes?: string;
}

export interface PassRecord {
  id: string;
  date: string;
  patient: string;
  dni: string;
  age?: number;
  sex?: 'F' | 'M';
  category: string;
  priorityLevel?: 'PRIORIDAD I' | 'PRIORIDAD II' | 'PRIORIDAD III' | 'PRIORIDAD IV';
  type: 'emergency' | 'consulta_sintoma' | 'consulta_control' | 'general';
  diagnosis: string;
  facility: string;
  eva?: string;
  status: string;
  gpsAddress?: string;
  gpsCoords?: {
    lat: number;
    lng: number;
    accuracy?: string;
  };
  gps?: {
    address: string;
    lat: number;
    lng: number;
    accuracy?: string;
  };
  sbar?: {
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
  };
}

export interface SampleClinicalData {
  evolutionTime: '< 30 minutos' | '1 a 2 horas' | 'Hoy' | '> 24 horas' | string;
  allergies: 'Sin Alergias' | 'Penicilina' | 'AINEs' | 'Otras (Voz)' | string;
  allergiesCustom?: string;
  criticalMeds: 'Ninguno' | 'Anticoagulantes' | 'Insulina' | 'Antihipertensivos' | string;
  preexisting: 'Ninguna' | 'Diabetes/HTA' | 'Enfermedad del Corazón' | 'Asma/Epilepsia' | 'Embarazo' | string;
  lastOralIntake: '< 2 horas' | '2 a 6 horas' | '> 6 horas (Ayuno)' | string;
}

export interface BodyZoneOption {
  id: string;
  name: string;
  icon: string;
  examples: string;
}

export interface PatientData {
  fullName: string;
  dni: string;
  age: number | '';
  sex: 'F' | 'M' | '';
  phone: string;
  beneficiaryType: 'self' | 'other';
  // Vía 1 Emergency fields
  emergencyCategory: string;
  emergencyCustomReason: string;
  canMove: boolean | null;
  sample: SampleClinicalData;
  emergencyReason?: string;
  // Vía 2 Consulta fields
  consultaTipo: ConsultaTipo;
  // If sintoma:
  evaScore: number;
  bodyZone: string;
  symptomDescription: string;
  symptomDuration: string;
  painType: string;
  painLocation?: string;
  primarySymptom?: string;
  // If control:
  controlReason: 'Rutina general' | 'Certificado médico / Laboral' | 'Control de enfermedad crónica';
  chronicDiseaseType?: string;
  screenings: string[]; // ['Análisis de sangre', 'PAP', 'Mamografía', 'PSA']
  // C5 Antecedentes y Hábitos
  chronicConditions: string[];
  allergiesDrug: string;
  allergies?: string;
  dailyMedications: string[];
  medications?: string[];
  previousSurgeries: string;
  surgeries?: string;
  tobacco: string;
  alcohol: string;
  // Center / Facility selection
  selectedCenter: {
    id: number;
    name: string;
    distance: string;
    time: string;
    type: string;
    specialty: string;
    availability: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
}
