import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  calculateDistanceKm,
  formatDistance,
  estimateETA,
  getGoogleMapsDirUrl,
  getWazeDirUrl,
  reverseGeocodePeru,
} from '../services/gpsService';
import {
  HEALTH_FACILITIES_DATABASE,
  getNearestEmergencyHospitals,
  HealthFacility,
} from '../data/healthFacilitiesPeru';

export interface EmergencyHospital {
  id: string;
  name: string;
  address: string;
  distance: string;
  eta: string;
  guardStatus: string;
  phone: string;
  type?: 'MINSA' | 'EsSalud' | 'MINSA III-1' | 'MINSA II-2' | 'EsSalud II' | 'EsSalud III' | string;
  lat: number;
  lng: number;
  distanceKm?: number;
  district?: string;
  zone?: string;
}

export const EMERGENCY_HOSPITALS: EmergencyHospital[] = HEALTH_FACILITIES_DATABASE
  .filter((f) => f.hasEmergency24h)
  .map((f) => ({
    id: f.id,
    name: f.name,
    address: f.address,
    distance: 'Cálculo GPS...',
    eta: 'En cálculo',
    guardStatus: f.guardStatus,
    phone: f.phone,
    type: f.type,
    lat: f.lat,
    lng: f.lng,
    district: f.district,
    zone: f.zone,
  }));

interface EmergencyMapProps {
  selectedHospital: EmergencyHospital;
  onSelectHospital: (h: EmergencyHospital) => void;
  userCoords: { lat: number; lng: number };
  onCoordsUpdated?: (coords: { lat: number; lng: number; accuracy: string; address?: string }) => void;
  onHospitalsRecalculated?: (hospitals: EmergencyHospital[]) => void;
}

export const EmergencyMap: React.FC<EmergencyMapProps> = ({
  selectedHospital,
  onSelectHospital,
  userCoords,
  onCoordsUpdated,
  onHospitalsRecalculated,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'live' | 'denied' | 'fallback'>('acquiring');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string>('');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(userCoords);
  const [accuracyLabel, setAccuracyLabel] = useState<string>('±8m');

  // Compute dynamic nearest hospitals from the Lima y Callao database
  const sortedHospitals = useMemo(() => {
    return getNearestEmergencyHospitals(currentCoords.lat, currentCoords.lng, 15).map((h) => ({
      id: h.id,
      name: h.name,
      address: h.address,
      distance: h.distanceFormatted || formatDistance(h.distanceKm || 0),
      eta: h.etaDriving || estimateETA(h.distanceKm || 0).driving,
      guardStatus: h.guardStatus,
      phone: h.phone,
      type: h.type,
      lat: h.lat,
      lng: h.lng,
      distanceKm: h.distanceKm,
      district: h.district,
      zone: h.zone,
    }));
  }, [currentCoords]);

  // Notify parent of updated hospital distances if callback provided
  useEffect(() => {
    if (onHospitalsRecalculated) {
      onHospitalsRecalculated(sortedHospitals);
    }
  }, [sortedHospitals, onHospitalsRecalculated]);

  // Request Native GPS Position
  const requestNativeGPS = () => {
    setGpsStatus('acquiring');
    setGpsErrorMsg('');

    if (!navigator.geolocation) {
      setGpsStatus('fallback');
      setGpsErrorMsg('Geolocalización no soportada por el navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const coords = { lat: latitude, lng: longitude };
        setCurrentCoords(coords);
        setGpsStatus('live');
        const accText = `±${Math.round(accuracy)}m`;
        setAccuracyLabel(accText);

        let resolvedAddress = `Coordenadas GPS reales: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          const geo = await reverseGeocodePeru(latitude, longitude);
          resolvedAddress = geo.address;
        } catch {
          // Keep default
        }

        if (onCoordsUpdated) {
          onCoordsUpdated({
            lat: latitude,
            lng: longitude,
            accuracy: accText,
            address: resolvedAddress,
          });
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 13, { animate: true });
        }
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        }
        updateRouteLine(coords, selectedHospital);
      },
      (err) => {
        console.warn('GPS position error or permission denied:', err.message);
        setGpsStatus('denied');
        if (err.code === 1) {
          setGpsErrorMsg('Permiso GPS denegado. Usando centro de referencia de Lima.');
        } else if (err.code === 2) {
          setGpsErrorMsg('Satélites no disponibles. Usando coordenadas de referencia.');
        } else {
          setGpsErrorMsg('Tiempo de espera GPS agotado. Usando referencia.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    requestNativeGPS();
  }, []);

  // Draw or update route polyline between user and selected hospital
  const updateRouteLine = (userPos: { lat: number; lng: number }, hospital: EmergencyHospital) => {
    if (!mapInstanceRef.current) return;

    if (routeLineRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    const latlngs: [number, number][] = [
      [userPos.lat, userPos.lng],
      [hospital.lat, hospital.lng],
    ];

    const polyline = L.polyline(latlngs, {
      color: '#ef4444',
      weight: 3,
      opacity: 0.85,
      dashArray: '6, 8',
    }).addTo(mapInstanceRef.current);

    routeLineRef.current = polyline;
  };

  // Re-render Hospital Markers when sortedHospitals changes
  const updateMarkers = () => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => {
      mapInstanceRef.current?.removeLayer(m);
    });
    markersRef.current = {};

    sortedHospitals.forEach((h) => {
      const isSelected = h.id === selectedHospital.id;
      const hospitalIcon = L.divIcon({
        className: 'hospital-marker',
        html: `
          <div style="
            width: ${isSelected ? '38px' : '32px'};
            height: ${isSelected ? '38px' : '32px'};
            background: ${isSelected ? '#dc2626' : '#1e293b'};
            border: 2px solid ${isSelected ? '#ffffff' : '#ef4444'};
            border-radius: 12px;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: ${isSelected ? '0 0 20px rgba(220,38,38,0.9)' : '0 8px 18px rgba(0,0,0,0.5)'};
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <i class="fa-solid fa-hospital" style="font-size:${isSelected ? '16px' : '13px'};"></i>
          </div>
        `,
        iconSize: [isSelected ? 38 : 32, isSelected ? 38 : 32],
        iconAnchor: [isSelected ? 19 : 16, isSelected ? 19 : 16],
      });

      const marker = L.marker([h.lat, h.lng], { icon: hospitalIcon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#0f172a; min-width:180px;">
            <strong style="color:#b91c1c; font-size:13px;">${h.name}</strong>
            <div style="color:#475569; margin:3px 0; font-size:11px;">${h.address} (${h.district})</div>
            <div style="color:#0284c7; font-weight:bold;">${h.distance} • ${h.eta}</div>
            <div style="color:#16a34a; font-size:10px; margin-top:2px;">${h.guardStatus}</div>
          </div>
        `)
        .on('click', () => {
          onSelectHospital(h);
        });

      markersRef.current[h.id] = marker;
    });
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentCoords.lat, currentCoords.lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // User location pulsing beacon marker
      const userIcon = L.divIcon({
        className: 'user-pin-marker',
        html: `
          <div style="position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:32px; height:32px; border-radius:9999px; background:rgba(59,130,246,0.4); animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position:absolute; width:18px; height:18px; border-radius:9999px; background:#2563eb; box-shadow:0 0 16px #3b82f6;"></div>
            <div style="position:relative; width:8px; height:8px; border-radius:9999px; background:#ffffff;"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const userMarker = L.marker([currentCoords.lat, currentCoords.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<strong style="font-family:sans-serif;font-size:12px;color:#0f172a;">📍 Tu ubicación GPS</strong>');

      userMarkerRef.current = userMarker;
      mapInstanceRef.current = map;

      updateMarkers();
      updateRouteLine(currentCoords, selectedHospital);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when sortedHospitals changes
  useEffect(() => {
    updateMarkers();
  }, [sortedHospitals]);

  // Update marker styles & route line when selectedHospital or currentCoords changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    sortedHospitals.forEach((h) => {
      const isSelected = h.id === selectedHospital.id;
      const marker = markersRef.current[h.id];
      if (marker) {
        const updatedIcon = L.divIcon({
          className: 'hospital-marker',
          html: `
            <div style="
              width: ${isSelected ? '38px' : '32px'};
              height: ${isSelected ? '38px' : '32px'};
              background: ${isSelected ? '#dc2626' : '#0f172a'};
              border: 2px solid ${isSelected ? '#ffffff' : '#ef4444'};
              border-radius: 12px;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: ${isSelected ? '0 0 22px rgba(220,38,38,0.85)' : '0 8px 18px rgba(0,0,0,0.5)'};
              cursor: pointer;
              transform: ${isSelected ? 'scale(1.1)' : 'scale(1)'};
              transition: all 0.2s ease;
            ">
              <i class="fa-solid fa-hospital" style="font-size:${isSelected ? '16px' : '13px'};"></i>
            </div>
          `,
          iconSize: [isSelected ? 38 : 32, isSelected ? 38 : 32],
          iconAnchor: [isSelected ? 19 : 16, isSelected ? 19 : 16],
        });
        marker.setIcon(updatedIcon);
      }
    });

    updateRouteLine(currentCoords, selectedHospital);

    mapInstanceRef.current.panTo([selectedHospital.lat, selectedHospital.lng], {
      animate: true,
      duration: 0.8,
    });
  }, [selectedHospital, currentCoords]);

  // Dynamic calculated info for current selected hospital
  const selectedWithDist = sortedHospitals.find((h) => h.id === selectedHospital.id) || selectedHospital;

  return (
    <div className="relative w-full h-64 sm:h-80 rounded-squircle overflow-hidden shadow-2xl border border-red-500/30">
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-950" />

      {/* Top Left GPS Status Badge */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 max-w-[85%]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-xl border border-white/10 text-white shadow-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              gpsStatus === 'live'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : gpsStatus === 'acquiring'
                ? 'bg-amber-400 animate-ping'
                : 'bg-rose-500'
            }`}
          ></span>
          <span className="font-mono text-[10px] sm:text-[11px] font-bold">
            {gpsStatus === 'live'
              ? `GPS Satelital Activo (${accuracyLabel})`
              : gpsStatus === 'acquiring'
              ? 'Conectando satélites GPS...'
              : 'GPS Modo Referencia: Lima Centro'}
          </span>
        </div>

        {/* Fallback Error Banner if permission denied */}
        {gpsErrorMsg && (
          <div className="p-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-amber-500/40 text-[10px] text-amber-300 font-mono flex items-center justify-between gap-2 shadow-lg">
            <span className="truncate">{gpsErrorMsg}</span>
            <button
              type="button"
              onClick={requestNativeGPS}
              className="px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-bold shrink-0 cursor-pointer"
            >
              Reintentar GPS
            </button>
          </div>
        )}
      </div>

      {/* Top Right Quick Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([currentCoords.lat, currentCoords.lng], 14, { animate: true });
            }
          }}
          className="w-8 h-8 rounded-full bg-slate-950/85 text-white hover:bg-slate-900 border border-white/15 flex items-center justify-center text-xs shadow-md cursor-pointer"
          title="Centrar en mi ubicación GPS"
        >
          <i className="fa-solid fa-crosshairs text-blue-400"></i>
        </button>

        <button
          type="button"
          onClick={() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([selectedHospital.lat, selectedHospital.lng], 15, { animate: true });
            }
          }}
          className="w-8 h-8 rounded-full bg-slate-950/85 text-white hover:bg-slate-900 border border-white/15 flex items-center justify-center text-xs shadow-md cursor-pointer"
          title="Centrar en hospital seleccionado"
        >
          <i className="fa-solid fa-hospital text-red-400"></i>
        </button>
      </div>

      {/* Bottom overlay preview bar with Live Navigation Shortcuts */}
      <div className="absolute bottom-2 inset-x-2 z-10 p-2.5 rounded-xl bg-slate-950/95 backdrop-blur-xl border border-red-500/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white">
        <div className="flex items-center gap-2 truncate w-full sm:w-auto">
          <i className="fa-solid fa-hospital text-red-500 shrink-0"></i>
          <span className="font-bold truncate text-slate-100">{selectedWithDist.name}</span>
          {selectedWithDist.type && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold shrink-0">
              {selectedWithDist.type}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-400 font-bold">
            <span>{selectedWithDist.distance}</span>
            <span>•</span>
            <span className="text-emerald-400">{selectedWithDist.eta}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={getGoogleMapsDirUrl(
                selectedHospital.lat,
                selectedHospital.lng,
                currentCoords.lat,
                currentCoords.lng,
                `${selectedHospital.name}, ${selectedHospital.address || selectedHospital.district || ''}, Perú`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-mono text-[10px] font-bold flex items-center gap-1 transition-all shadow"
              title="Abrir ruta directa en Google Maps"
            >
              <i className="fa-solid fa-route"></i>
              <span>Google Maps</span>
            </a>
            <a
              href={getWazeDirUrl(selectedHospital.lat, selectedHospital.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-mono text-[10px] font-bold flex items-center gap-1 transition-all border border-sky-400/30"
              title="Abrir en Waze"
            >
              <i className="fa-brands fa-waze text-xs"></i>
              <span>Waze</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
