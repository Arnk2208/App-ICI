import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GpsCoordinates,
  GpsStatus,
  GpsLocationInfo,
  DEFAULT_PERU_COORDS,
  DEFAULT_PERU_ADDRESS,
  getCurrentGpsPosition,
  reverseGeocodePeru,
} from '../services/gpsService';

export function useGpsLocation(autoStart = true) {
  const [coords, setCoords] = useState<GpsCoordinates>(DEFAULT_PERU_COORDS);
  const [status, setStatus] = useState<GpsStatus>('idle');
  const [address, setAddress] = useState<string>(DEFAULT_PERU_ADDRESS);
  const [district, setDistrict] = useState<string>('Jesús María / San Isidro');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isRealGps, setIsRealGps] = useState<boolean>(false);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());

  const watchIdRef = useRef<number | null>(null);

  const processCoordinates = useCallback(async (lat: number, lng: number, accuracy = 10, isLive = true) => {
    const newCoords: GpsCoordinates = { lat, lng, accuracy, timestamp: Date.now() };
    setCoords(newCoords);
    setIsRealGps(isLive);
    setStatus(isLive ? 'live' : 'fallback');
    setUpdatedAt(new Date());

    try {
      const geo = await reverseGeocodePeru(lat, lng);
      setAddress(geo.address);
      setDistrict(geo.district);
    } catch {
      setAddress(`Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    setStatus('acquiring');
    setErrorMsg('');

    if (!navigator.geolocation) {
      setStatus('unavailable');
      setErrorMsg('Geolocalización no soportada por el navegador.');
      setIsRealGps(false);
      return;
    }

    try {
      const pos = await getCurrentGpsPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      const { latitude, longitude, accuracy } = pos.coords;
      await processCoordinates(latitude, longitude, accuracy, true);
    } catch (err: unknown) {
      const geoErr = err as GeolocationPositionError;
      console.warn('GPS Error:', geoErr?.message || err);
      setIsRealGps(false);

      if (geoErr && geoErr.code === 1) {
        setStatus('denied');
        setErrorMsg('Permiso de GPS no concedido en el navegador. Usando referencia Lima Centro.');
      } else if (geoErr && geoErr.code === 2) {
        setStatus('unavailable');
        setErrorMsg('Señal GPS no disponible. Usando coordenadas de referencia.');
      } else if (geoErr && geoErr.code === 3) {
        setStatus('timeout');
        setErrorMsg('Tiempo de espera agotado para satélites GPS. Usando referencia.');
      } else {
        setStatus('fallback');
        setErrorMsg('Ubicación GPS por defecto (Lima Centro).');
      }

      // Keep default coordinates as fallback
      setCoords(DEFAULT_PERU_COORDS);
      setAddress(DEFAULT_PERU_ADDRESS);
      setDistrict('Jesús María / San Isidro');
    }
  }, [processCoordinates]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current !== null) return;

    setIsWatching(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        processCoordinates(latitude, longitude, accuracy, true);
      },
      (err) => {
        console.warn('Error en GPS watchPosition:', err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000,
      }
    );
  }, [processCoordinates]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  const toggleWatching = useCallback(() => {
    if (isWatching) {
      stopWatching();
    } else {
      startWatching();
    }
  }, [isWatching, startWatching, stopWatching]);

  useEffect(() => {
    if (autoStart) {
      refreshLocation();
    }

    return () => {
      stopWatching();
    };
  }, [autoStart, refreshLocation, stopWatching]);

  const locationInfo: GpsLocationInfo = {
    coords,
    status,
    address,
    district,
    error: errorMsg,
    isRealGps,
    accuracyLabel: coords.accuracy ? `±${Math.round(coords.accuracy)}m` : '±10m',
    updatedAt,
  };

  return {
    ...locationInfo,
    locationInfo,
    refreshLocation,
    isWatching,
    startWatching,
    stopWatching,
    toggleWatching,
  };
}
