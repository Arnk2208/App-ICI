import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  calculateDistanceKm,
  formatDistance,
  reverseGeocodePeru,
  getCurrentGpsPosition,
  DEFAULT_PERU_COORDS,
  DEFAULT_PERU_ADDRESS,
  getGoogleMapsDirUrl,
} from '../services/gpsService';
import { EMERGENCY_HOSPITALS } from './EmergencyMap';
import { INITIAL_HEALTH_CENTERS } from './ConsultaMap';

interface HomeMapPreviewProps {
  onCoordsAvailable?: (coords: { lat: number; lng: number; accuracy?: string }, address: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const HomeMapPreview: React.FC<HomeMapPreviewProps> = ({
  onCoordsAvailable,
  showToast,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number }>(DEFAULT_PERU_COORDS);
  const [address, setAddress] = useState<string>(DEFAULT_PERU_ADDRESS);
  const [district, setDistrict] = useState<string>('Lima Centro');
  const [gpsStatus, setGpsStatus] = useState<'prompt' | 'acquiring' | 'live' | 'denied' | 'fallback'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);

  // Compute nearby facilities count
  const nearbyStats = useMemo(() => {
    const hospitalsWithin5km = EMERGENCY_HOSPITALS.filter((h) => {
      const d = calculateDistanceKm(coords.lat, coords.lng, h.lat, h.lng);
      return d <= 6.0;
    });

    const centersWithin5km = INITIAL_HEALTH_CENTERS.filter((c) => {
      const d = calculateDistanceKm(coords.lat, coords.lng, c.lat, c.lng);
      return d <= 5.0;
    });

    return {
      hospitals: hospitalsWithin5km.length,
      centers: centersWithin5km.length,
    };
  }, [coords]);

  // Request Native Device GPS (Triggers browser permission popup)
  const requestDeviceGPS = async (isManualClick = false) => {
    setGpsStatus('acquiring');
    setErrorMessage('');

    if (!navigator.geolocation) {
      setGpsStatus('fallback');
      setErrorMessage('Geolocalización no soportada por el navegador.');
      return;
    }

    try {
      const pos = await getCurrentGpsPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      const { latitude, longitude, accuracy } = pos.coords;
      const newCoords = { lat: latitude, lng: longitude, accuracy };
      setCoords(newCoords);
      setGpsStatus('live');

      // Reverse geocode to get street / district
      let resolvedAddr = `Coordenadas: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      let resolvedDist = 'Lima';
      try {
        const geo = await reverseGeocodePeru(latitude, longitude);
        resolvedAddr = geo.address;
        resolvedDist = geo.district;
      } catch {
        // fallback
      }

      setAddress(resolvedAddr);
      setDistrict(resolvedDist);

      if (onCoordsAvailable) {
        onCoordsAvailable(
          { lat: latitude, lng: longitude, accuracy: `±${Math.round(accuracy)}m` },
          resolvedAddr
        );
      }

      if (isManualClick) {
        showToast('Ubicación del dispositivo detectada con éxito', 'fa-location-dot');
      }

      // Update map view and markers
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([latitude, longitude], 14, { animate: true });
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([latitude, longitude]);
        userMarkerRef.current.bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;color:#0f172a;min-width:160px;">
            <strong style="color:#2563eb;">📍 Ubicación de tu Dispositivo</strong>
            <div style="font-size:11px;color:#475569;margin-top:2px;">${resolvedAddr}</div>
            <div style="font-size:10px;color:#16a34a;font-weight:bold;margin-top:2px;">Precisión GPS: ±${Math.round(accuracy)}m</div>
          </div>`
        );
      }
      if (accuracyCircleRef.current && mapInstanceRef.current) {
        accuracyCircleRef.current.setLatLng([latitude, longitude]);
        accuracyCircleRef.current.setRadius(accuracy);
      }
    } catch (err: unknown) {
      const geoErr = err as GeolocationPositionError;
      console.warn('GPS error in Home preview:', geoErr?.message || err);
      setGpsStatus('denied');

      if (geoErr && geoErr.code === 1) {
        setErrorMessage('Permiso de GPS bloqueado o denegado en el navegador. Haz clic en "Permitir GPS" o revisa los permisos.');
      } else if (geoErr && geoErr.code === 2) {
        setErrorMessage('Satélites no disponibles. Mostrando referencia Lima Centro.');
      } else {
        setErrorMessage('Tiempo de espera agotado buscando señal GPS.');
      }
    }
  };

  // Immediate request on component mount
  useEffect(() => {
    requestDeviceGPS(false);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Accuracy circle
      const accCircle = L.circle([coords.lat, coords.lng], {
        radius: coords.accuracy || 20,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        weight: 1,
      }).addTo(map);
      accuracyCircleRef.current = accCircle;

      // Pulsing user pin
      const userIcon = L.divIcon({
        className: 'user-pin-marker',
        html: `
          <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:34px; height:34px; border-radius:9999px; background:rgba(59,130,246,0.35); animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position:absolute; width:18px; height:18px; border-radius:9999px; background:#2563eb; box-shadow:0 0 16px #3b82f6;"></div>
            <div style="position:relative; width:8px; height:8px; border-radius:9999px; background:#ffffff;"></div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const userMarker = L.marker([coords.lat, coords.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;color:#0f172a;min-width:160px;">
            <strong style="color:#2563eb;">📍 Ubicación de tu Dispositivo</strong>
            <div style="font-size:11px;color:#475569;margin-top:2px;">${address}</div>
          </div>`
        );

      userMarkerRef.current = userMarker;

      // Add Emergency Hospitals markers (Red)
      EMERGENCY_HOSPITALS.forEach((h) => {
        const hospitalIcon = L.divIcon({
          className: 'hospital-preview-marker',
          html: `
            <div style="
              width: 26px;
              height: 26px;
              background: #991b1b;
              border: 1.5px solid #ffffff;
              border-radius: 8px;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.5);
              cursor: pointer;
            ">
              <i class="fa-solid fa-hospital" style="font-size:11px;"></i>
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const d = calculateDistanceKm(coords.lat, coords.lng, h.lat, h.lng);
        L.marker([h.lat, h.lng], { icon: hospitalIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif; font-size:11px; color:#0f172a;">
              <strong style="color:#b91c1c;">${h.name}</strong>
              <div style="color:#64748b; font-size:10px;">${h.guardStatus}</div>
              <div style="color:#0284c7; font-weight:bold; margin-top:2px;">A ${formatDistance(d)} de ti</div>
            </div>
          `);
      });

      // Add Health Centers markers (Blue)
      INITIAL_HEALTH_CENTERS.forEach((c) => {
        const centerIcon = L.divIcon({
          className: 'center-preview-marker',
          html: `
            <div style="
              width: 24px;
              height: 24px;
              background: #1e3a8a;
              border: 1.5px solid #38bdf8;
              border-radius: 8px;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.5);
              cursor: pointer;
            ">
              <i class="fa-solid fa-stethoscope" style="font-size:10px;"></i>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const d = calculateDistanceKm(coords.lat, coords.lng, c.lat, c.lng);
        L.marker([c.lat, c.lng], { icon: centerIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif; font-size:11px; color:#0f172a;">
              <strong style="color:#0369a1;">${c.name}</strong>
              <div style="color:#64748b; font-size:10px;">${c.type} • ${c.specialty}</div>
              <div style="color:#16a34a; font-weight:bold; margin-top:2px;">A ${formatDistance(d)} de ti</div>
            </div>
          `);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full space-y-2 mb-4">
      {/* Top Banner / Device Location Bar */}
      <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-[#121620]/90 border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                gpsStatus === 'live'
                  ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                  : gpsStatus === 'acquiring'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            ></span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
              {gpsStatus === 'live'
                ? `GPS Satelital Activo (±${Math.round(coords.accuracy || 8)}m)`
                : gpsStatus === 'acquiring'
                ? 'Solicitando permiso de GPS...'
                : 'Ubicación de Referencia'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => requestDeviceGPS(true)}
              className="px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-mono text-[10px] sm:text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              title="Solicitar o refrescar permiso GPS"
            >
              <i className={`fa-solid ${gpsStatus === 'acquiring' ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`}></i>
              <span>{gpsStatus === 'live' ? 'Refrescar' : 'Permitir GPS'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-zinc-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <i className={`fa-solid ${isMapExpanded ? 'fa-compress' : 'fa-expand'}`}></i>
            </button>
          </div>
        </div>

        {/* Detected Device Address */}
        <div className="flex items-start justify-between gap-2 text-xs">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
              Ubicación del dispositivo detectada:
            </div>
            <div className="font-bold text-slate-900 dark:text-white truncate text-sm mt-0.5">
              {address}
            </div>
          </div>

          <div className="text-right shrink-0 font-mono text-[11px]">
            <span className="text-slate-400">Zona: </span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{district}</span>
          </div>
        </div>

        {/* Permission Alert Banner if blocked or denied */}
        {gpsStatus === 'denied' && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <i className="fa-solid fa-triangle-exclamation text-amber-500 shrink-0"></i>
              <span className="text-[11px] leading-tight truncate">
                {errorMessage || 'Permiso de ubicación denegado en el navegador.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => requestDeviceGPS(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] shrink-0 cursor-pointer shadow"
            >
              Habilitar GPS
            </button>
          </div>
        )}
      </div>

      {/* Interactive Map Preview Window */}
      <div
        className={`relative w-full rounded-2xl bg-slate-950 overflow-hidden shadow-xl border border-slate-300 dark:border-slate-800 transition-all duration-300 ${
          isMapExpanded ? 'h-72 sm:h-80' : 'h-44 sm:h-52'
        }`}
      >
        <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-950" />

        {/* Floating Quick Action Overlay on Map Preview */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([coords.lat, coords.lng], 14, { animate: true });
              }
            }}
            className="w-7 h-7 rounded-full bg-slate-900/90 text-white hover:bg-slate-800 border border-white/20 flex items-center justify-center text-xs shadow-md cursor-pointer"
            title="Centrar en mi dispositivo"
          >
            <i className="fa-solid fa-crosshairs text-blue-400 text-xs"></i>
          </button>
        </div>

        {/* Bottom stats overlay bar */}
        <div className="absolute bottom-2 inset-x-2 z-10 p-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-white/10 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="font-bold text-red-300">{nearbyStats.hospitals}</span>
              <span className="text-zinc-400 hidden sm:inline">Hospitales Shock Trauma 24h</span>
              <span className="text-zinc-400 sm:hidden">Hosp. 24h</span>
            </span>

            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="font-bold text-blue-300">{nearbyStats.centers}</span>
              <span className="text-zinc-400 hidden sm:inline">Postas y Policlínicos</span>
              <span className="text-zinc-400 sm:hidden">Postas</span>
            </span>
          </div>

          <a
            href={`https://maps.google.com/?q=${coords.lat},${coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <span>Google Maps</span>
            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
          </a>
        </div>
      </div>
    </div>
  );
};
