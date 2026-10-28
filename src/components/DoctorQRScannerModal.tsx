import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { DoctorOrder } from '../types';

interface DoctorQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderImported: (order: DoctorOrder) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const DoctorQRScannerModal: React.FC<DoctorQRScannerModalProps> = ({
  isOpen,
  onClose,
  onOrderImported,
  showToast,
}) => {
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'starting' | 'scanning' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Initialize scanner when modal opens
    let isMounted = true;
    setScannerStatus('starting');
    setErrorMessage('');

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera'));
          const camId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(camId);
          startScanning(camId);
        } else {
          setScannerStatus('error');
          setErrorMessage('No se encontraron cámaras disponibles en este dispositivo.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Error accessing cameras:', err);
        setScannerStatus('error');
        setErrorMessage('Permiso de cámara no concedido en el navegador o bloqueado por el sandbox.');
      });

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const startScanning = async (cameraId: string) => {
    try {
      if (html5QrCodeRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode('doctor-qr-reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Frame error, scan in progress
        }
      );

      setScannerStatus('scanning');
    } catch (err: unknown) {
      console.warn('Failed to start camera scan:', err);
      setScannerStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'No se pudo inicializar el flujo de video de la cámara.'
      );
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      html5QrCodeRef.current = null;
    }
  };

  const handleSuccessfulScan = async (rawText: string) => {
    await stopScanner();
    setScannerStatus('success');

    try {
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // If not pure JSON, wrap text into a basic order format
        parsed = {
          diagnosis: rawText,
          doctor: 'Médico Tratante',
          specialty: 'Medicina General',
          facility: 'Centro de Salud / Hospital',
          prescriptions: ['Ver indicaciones en nota clínica'],
        };
      }

      const newOrder: DoctorOrder = {
        id: parsed.id || `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: parsed.date || new Date().toLocaleString(),
        doctor: parsed.doctor || 'Dr. Médico Especialista MINSA',
        specialty: parsed.specialty || 'Medicina General / Cardiología',
        facility: parsed.facility || 'Hospital Nacional de la Red',
        patientDni: parsed.patientDni || parsed.patient?.dni || '72849102',
        diagnosis: parsed.diagnosis || parsed.category || 'Atención Médica Concluida',
        prescriptions: Array.isArray(parsed.prescriptions)
          ? parsed.prescriptions
          : parsed.prescriptions
          ? [parsed.prescriptions]
          : ['Tratamiento médico ambulatorio según receta'],
        labOrders: parsed.labOrders || [],
        nextAppointment: parsed.nextAppointment || 'Control en 15 días',
        notes: parsed.notes || parsed.sbar?.recommendation || 'Ficha clínica importada exitosamente.',
      };

      onOrderImported(newOrder);
      showToast('¡Orden médica del doctor importada con éxito!', 'fa-clipboard-check');
      onClose();
    } catch (err) {
      console.error('Error parsing doctor QR:', err);
      setScannerStatus('error');
      setErrorMessage('El código QR escaneado no tiene un formato clínico válido.');
    }
  };

  // Allow uploading a QR image file as fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerStatus('starting');
      const html5QrCode = new Html5Qrcode('doctor-qr-reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      handleSuccessfulScan(decodedText);
    } catch (err) {
      console.error('Failed to scan file:', err);
      setScannerStatus('error');
      setErrorMessage('No se detectó un código QR legible en la imagen seleccionada.');
    }
  };

  // Demo test payload button
  const handleLoadDemoDoctorOrder = () => {
    const demoPayload = JSON.stringify({
      type: 'DOCTOR_ORDER',
      id: `ORD-DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      doctor: 'Dra. Carmen Rosa Valdivia (CMP 48291)',
      specialty: 'Cardiología / Medicina Interna',
      facility: 'Hospital Nac. Edgardo Rebagliati Martins',
      date: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patientDni: '72849102',
      diagnosis: 'Angina Estable compensada • HTA Estadío 1',
      prescriptions: [
        'Aspirina 100mg - 1 tableta cada 24 horas por 30 días',
        'Atorvastatina 20mg - 1 tableta por la noche',
        'Losartán 50mg - 1 tableta cada 12 horas',
      ],
      labOrders: ['Perfil lipídico completo', 'Troponina I de control', 'Ecocardiograma Doppler'],
      nextAppointment: '18 de Noviembre 2026 - 10:30 AM',
      notes: 'Paciente con buena tolerancia hemodinámica. Mantener dieta hiposódica y control de presión.',
    });

    handleSuccessfulScan(demoPayload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0f17]/90 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-squircle liquid-glass-card p-5 sm:p-6 shadow-2xl border border-slate-300 dark:border-slate-700 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm shadow">
              <i className="fa-solid fa-camera"></i>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Escanear QR del Doctor
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Importa diagnósticos, recetas u órdenes médicas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Video Scanner Element */}
        <div className="relative w-full aspect-square max-h-72 rounded-2xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center border border-slate-800">
          <div id="doctor-qr-reader" className="w-full h-full" />

          {/* Overlay viewfinder frame */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-56 rounded-2xl border-2 border-dashed border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center">
              <div className="w-full h-0.5 bg-blue-500/80 animate-pulse"></div>
            </div>
          </div>

          {/* Status overlay */}
          {scannerStatus === 'starting' && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-2 text-white text-xs font-mono">
              <i className="fa-solid fa-circle-notch animate-spin text-2xl text-blue-500"></i>
              <span>Iniciando cámara...</span>
            </div>
          )}

          {scannerStatus === 'error' && (
            <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col items-center justify-center text-center gap-3 text-white">
              <i className="fa-solid fa-video-slash text-3xl text-amber-500"></i>
              <p className="text-xs text-slate-300 leading-snug">{errorMessage}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-full bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all cursor-pointer"
              >
                Cargar imagen con QR
              </button>
            </div>
          )}
        </div>

        {/* Camera Selector & Controls */}
        {cameras.length > 1 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono">Cámara:</span>
            <select
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                startScanning(e.target.value);
              }}
              className="py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none border border-slate-200 dark:border-slate-700"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Cámara ${c.id.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Buttons: File upload & Demo button */}
        <div className="space-y-2 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <i className="fa-solid fa-image text-blue-500"></i>
              <span>Cargar Imagen</span>
            </button>

            <button
              type="button"
              onClick={handleLoadDemoDoctorOrder}
              className="py-2.5 px-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-emerald-500/30"
              title="Simula la lectura del QR emitido por la Dra. Valdivia"
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              <span>Probar QR Doctor</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
