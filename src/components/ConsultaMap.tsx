import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  calculateDistanceKm,
  formatDistance,
  estimateETA,
  getGoogleMapsDirUrl,
  reverseGeocodePeru,
} from '../services/gpsService';
import {
  HEALTH_FACILITIES_DATABASE,
  getNearestHealthCenters,
  HealthFacility,
} from '../data/healthFacilitiesPeru';

export interface HealthCenterItem {
  id: number;
  name: string;
  distance: string;
  time: string;
  type: string;
  specialty: string;
  availability: string;
  availColor?: string;
  icon?: string;
  address?: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  walkingTime?: string;
  drivingTime?: string;
  district?: string;
  zone?: string;
}

export const INITIAL_HEALTH_CENTERS: HealthCenterItem[] = HEALTH_FACILITIES_DATABASE.map((f, i) => ({
  id: i + 1,
  name: f.name,
  distance: 'Cálculo GPS...',
  time: 'En cálculo',
  type: f.type,
  specialty: f.specialty,
  availability: f.availability,
  availColor: f.hasEmergency24h ? 'rose' : 'emerald',
  icon: f.category.includes('Hospital') ? 'apartment' : 'local_hospital',
  address: `${f.address} (${f.district})`,
  lat: f.lat,
  lng: f.lng,
  district: f.district,
  zone: f.zone,
}));

interface ConsultaMapProps {
  selectedCenter: HealthCenterItem;
  onSelectCenter: (c: HealthCenterItem) => void;
  userCoords: { lat: number; lng: number };
  onCoordsUpdated?: (coords: { lat: number; lng: number; accuracy: string; address?: string }) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onCentersRecalculated?: (centers: HealthCenterItem[]) => void;
}

export const ConsultaMap: React.FC<ConsultaMapProps> = ({
  selectedCenter,
  onSelectCenter,
  userCoords,
  onCoordsUpdated,
  isExpanded = false,
  onToggleExpand,
  onCentersRecalculated,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<{ [key: number]: L.Marker }>({});

  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'live' | 'denied' | 'fallback'>('acquiring');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string>('');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(userCoords);
  const [accuracyLabel, setAccuracyLabel] = useState<string>('±6m');

  // Compute dynamic distance & ETA for centers from current GPS coordinates
  const calculatedCenters = useMemo(() => {
    return getNearestHealthCenters(currentCoords.lat, currentCoords.lng, 25).map((c, index) => ({
      // Keep the original facility ID after sorting by distance so selecting a
      // center never silently points to a different facility.
      id: INITIAL_HEALTH_CENTERS.find((initial) => initial.name === c.name)?.id ?? index + 1,
      name: c.name,
      distance: `${c.distanceFormatted} • ${c.etaWalking}`,
      time: c.etaWalking || '',
      type: c.type,
      specialty: c.specialty,
      availability: c.availability,
      availColor: c.hasEmergency24h ? 'rose' : 'emerald',
      icon: c.category.includes('Hospital') ? 'apartment' : 'local_hospital',
      address: `${c.address} (${c.district})`,
      lat: c.lat,
      lng: c.lng,
      distanceKm: c.distanceKm,
      walkingTime: c.etaWalking,
      drivingTime: c.etaDriving,
      district: c.district,
      zone: c.zone,
    }));
  }, [currentCoords]);

  useEffect(() => {
    if (onCentersRecalculated) {
      onCentersRecalculated(calculatedCenters);
    }
  }, [calculatedCenters, onCentersRecalculated]);

  const requestNativeGPS = () => {
    setGpsStatus('acquiring');
    setGpsErrorMsg('');

    if (!window.isSecureContext) {
      setGpsStatus('fallback');
      setGpsErrorMsg('El navegador solo permite GPS en HTTPS o localhost. Abre la app con una conexión segura.');
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('fallback');
      setGpsErrorMsg('Geolocalización no soportada en este navegador.');
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

        let resolvedAddress = `Coordenadas: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
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
          mapInstanceRef.current.setView([latitude, longitude], 14, { animate: true });
        }
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        }
        updateRouteLine(coords, selectedCenter);
      },
      (err) => {
        console.warn('GPS position error or permission denied:', err.message);
        if (err.code === 1) {
          setGpsStatus('denied');
          setGpsErrorMsg('Permiso de GPS denegado. Usando centro de referencia Lima.');
        } else if (err.code === 2) {
          setGpsStatus('fallback');
          setGpsErrorMsg('No se pudo obtener la ubicación. Activa GPS y vuelve a intentarlo.');
        } else {
          setGpsStatus('fallback');
          setGpsErrorMsg('GPS tardó demasiado. Reintenta con ubicación y permisos activados.');
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

  const updateRouteLine = (userPos: { lat: number; lng: number }, center: HealthCenterItem) => {
    if (!mapInstanceRef.current) return;

    if (routeLineRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    const latlngs: [number, number][] = [
      [userPos.lat, userPos.lng],
      [center.lat, center.lng],
    ];

    const polyline = L.polyline(latlngs, {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.85,
      dashArray: '5, 8',
    }).addTo(mapInstanceRef.current);

    routeLineRef.current = polyline;
  };

  // Re-render markers function
  const updateMarkers = () => {
    if (!mapInstanceRef.current) return;

    Object.values(markersRef.current).forEach((m) => {
      mapInstanceRef.current?.removeLayer(m);
    });
    markersRef.current = {};

    calculatedCenters.forEach((c) => {
      const isSelected = c.id === selectedCenter.id;
      const centerIcon = L.divIcon({
        className: 'health-center-marker',
        html: `
          <div style="
            width: ${isSelected ? '36px' : '30px'};
            height: ${isSelected ? '36px' : '30px'};
            background: ${isSelected ? '#2563eb' : '#0f172a'};
            border: 2px solid ${isSelected ? '#ffffff' : '#38bdf8'};
            border-radius: 10px;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: ${isSelected ? '0 0 18px rgba(37,99,235,0.9)' : '0 4px 12px rgba(0,0,0,0.5)'};
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <i class="fa-solid fa-hospital" style="font-size:${isSelected ? '15px' : '12px'};"></i>
          </div>
        `,
        iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
        iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15],
      });

      const marker = L.marker([c.lat, c.lng], { icon: centerIcon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#0f172a; min-width:180px;">
            <strong style="color:#0369a1; font-size:13px;">${c.name}</strong>
            <div style="color:#64748b; font-size:11px; margin:2px 0;">${c.address}</div>
            <div style="color:#16a34a; font-weight:bold; font-size:11px;">${c.distance}</div>
          </div>
        `)
        .on('click', () => {
          onSelectCenter(c);
        });

      markersRef.current[c.id] = marker;
    });
  };

  // Initialize Map
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

      // Pulsing user location pin
      const userIcon = L.divIcon({
        className: 'user-pin-marker',
        html: `
          <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:30px; height:30px; border-radius:9999px; background:rgba(59,130,246,0.35); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position:absolute; width:16px; height:16px; border-radius:9999px; background:#2563eb; box-shadow:0 0 14px #3b82f6;"></div>
            <div style="position:relative; width:6px; height:6px; border-radius:9999px; background:#ffffff;"></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const userMarker = L.marker([currentCoords.lat, currentCoords.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<strong style="font-family:sans-serif;font-size:12px;color:#0f172a;">📍 Tu ubicación GPS</strong>');

      userMarkerRef.current = userMarker;
      mapInstanceRef.current = map;

      updateMarkers();
      updateRouteLine(currentCoords, selectedCenter);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    updateMarkers();
  }, [calculatedCenters]);

  // Update markers when selection or GPS changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    calculatedCenters.forEach((c) => {
      const isSelected = c.id === selectedCenter.id;
      const marker = markersRef.current[c.id];
      if (marker) {
        const updatedIcon = L.divIcon({
          className: 'health-center-marker',
          html: `
            <div style="
              width: ${isSelected ? '36px' : '30px'};
              height: ${isSelected ? '36px' : '30px'};
              background: ${isSelected ? '#2563eb' : '#0f172a'};
              border: 2px solid ${isSelected ? '#ffffff' : '#38bdf8'};
              border-radius: 10px;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: ${isSelected ? '0 0 20px rgba(37,99,235,0.9)' : '0 4px 12px rgba(0,0,0,0.5)'};
              cursor: pointer;
              transform: ${isSelected ? 'scale(1.1)' : 'scale(1)'};
              transition: all 0.2s ease;
            ">
              <i class="fa-solid fa-hospital" style="font-size:${isSelected ? '15px' : '12px'};"></i>
            </div>
          `,
          iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
          iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15],
        });
        marker.setIcon(updatedIcon);
      }
    });

    updateRouteLine(currentCoords, selectedCenter);

    mapInstanceRef.current.panTo([selectedCenter.lat, selectedCenter.lng], {
      animate: true,
      duration: 0.7,
    });
  }, [selectedCenter, currentCoords]);

  const activeSelected = calculatedCenters.find((c) => c.id === selectedCenter.id) || selectedCenter;

  return (
    <div
      className={`relative w-full rounded-2xl bg-slate-950 overflow-hidden shadow-lg flex flex-col justify-between transition-all duration-300 border border-slate-800 ${
        isExpanded ? 'h-72 sm:h-80' : 'h-48 sm:h-52'
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-950" />

      {/* Top Bar with GPS status & controls */}
      <div className="absolute top-2.5 inset-x-2.5 z-10 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-xl border border-white/10 text-white shadow-md">
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
              ? `GPS Real (${accuracyLabel})`
              : gpsStatus === 'acquiring'
              ? 'Detectando GPS...'
              : 'GPS Referencia: Lima Centro'}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={requestNativeGPS}
            aria-label="Actualizar mi ubicación GPS"
            className="w-7 h-7 rounded-full bg-slate-950/85 text-white hover:bg-slate-900 border border-white/15 flex items-center justify-center text-xs shadow-md cursor-pointer"
            title="Actualizar mi ubicación GPS"
          >
            <i className={`fa-solid ${gpsStatus === 'acquiring' ? 'fa-spinner animate-spin' : 'fa-location-crosshairs'} text-blue-400`}></i>
          </button>

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="px-2.5 py-1 rounded-full bg-slate-950/85 hover:bg-slate-900 text-blue-300 text-xs font-semibold backdrop-blur-xl transition-all cursor-pointer border border-white/10 flex items-center gap-1"
            >
              <span>{isExpanded ? 'Contraer' : 'Expandir'}</span>
              <i className={`fa-solid ${isExpanded ? 'fa-compress' : 'fa-expand'} text-[10px]`}></i>
            </button>
          )}
        </div>
      </div>

      {/* GPS Error Alert if needed */}
      {gpsErrorMsg && (
        <div className="absolute top-11 inset-x-2.5 z-10 p-1.5 px-2 rounded-lg bg-slate-900/90 border border-amber-500/40 text-[10px] text-amber-300 font-mono flex items-center justify-between gap-1 shadow-md">
          <span className="truncate">{gpsErrorMsg}</span>
          <button
            type="button"
            onClick={requestNativeGPS}
            className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold shrink-0 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Bottom Bar with selected center details & Google Maps navigation */}
      <div className="absolute bottom-2 inset-x-2 z-10 p-2 rounded-xl bg-slate-950/95 backdrop-blur-xl border border-blue-500/30 flex items-center justify-between gap-2 text-xs text-white">
        <div className="flex items-center gap-2 truncate min-w-0">
          <i className="fa-solid fa-hospital text-blue-400 shrink-0"></i>
          <span className="font-bold truncate text-slate-100 text-[11px] sm:text-xs">
            {activeSelected.name}
          </span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold shrink-0">
            {activeSelected.type}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[10px] sm:text-[11px] text-emerald-400 font-bold">
            {activeSelected.distance || activeSelected.time}
          </span>
          <a
            href={getGoogleMapsDirUrl(
              activeSelected.lat,
              activeSelected.lng,
              currentCoords.lat,
              currentCoords.lng,
              `${activeSelected.name}, ${activeSelected.address || activeSelected.district || ''}, Perú`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-mono text-[10px] font-bold flex items-center gap-1 shadow transition-all"
            title="Abrir indicaciones en Google Maps"
          >
            <i className="fa-solid fa-route"></i>
            <span className="hidden sm:inline">Ruta</span>
          </a>
        </div>
      </div>
    </div>
  );
};
