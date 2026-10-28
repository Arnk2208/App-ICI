export interface GpsCoordinates {
  lat: number;
  lng: number;
  accuracy?: number; // meters
  altitude?: number | null;
  speed?: number | null;
  timestamp?: number;
}

export type GpsStatus = 'idle' | 'acquiring' | 'live' | 'denied' | 'unavailable' | 'timeout' | 'fallback';

export interface GpsLocationInfo {
  coords: GpsCoordinates;
  status: GpsStatus;
  address: string;
  district?: string;
  city?: string;
  error?: string;
  isRealGps: boolean;
  accuracyLabel: string;
  updatedAt: Date;
}

// Default reference coordinates: Lima Centro / Jesús María, Perú
export const DEFAULT_PERU_COORDS: GpsCoordinates = {
  lat: -12.083842,
  lng: -77.045911,
  accuracy: 12,
};

export const DEFAULT_PERU_ADDRESS = 'Av. Salaverry 1240, Jesús María / San Isidro, Lima, Perú';

/**
 * Calculates the Haversine distance in kilometers between two GPS coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance into a human readable string (e.g., "650 m" or "2.4 km")
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.max(50, Math.round(km * 1000));
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Estimates walking and driving travel time based on distance in km
 */
export function estimateETA(km: number): { walking: string; driving: string } {
  // Walking speed approx 4.5 km/h
  const walkingMinutes = Math.max(1, Math.round((km / 4.5) * 60));
  // Urban driving speed approx 22 km/h in Lima traffic
  const drivingMinutes = Math.max(2, Math.round((km / 22) * 60));

  const formatMin = (m: number) => {
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem === 0 ? `${h} h` : `${h} h ${rem} min`;
  };

  return {
    walking: `${formatMin(walkingMinutes)} a pie`,
    driving: `${formatMin(drivingMinutes)} en auto`,
  };
}

/**
 * Offline heuristic district detector for Peru (mainly Lima & Callao metropolitan area)
 */
export function estimateDistrictOffline(
  lat: number,
  lng: number
): { address: string; district: string; city: string } {
  const districts = [
    { name: 'San Isidro', lat: -12.098, lng: -77.035 },
    { name: 'Jesús María', lat: -12.078, lng: -77.045 },
    { name: 'Miraflores', lat: -12.121, lng: -77.029 },
    { name: 'Lince', lat: -12.083, lng: -77.034 },
    { name: 'Cercado de Lima', lat: -12.052, lng: -77.035 },
    { name: 'La Victoria', lat: -12.065, lng: -77.018 },
    { name: 'Magdalena del Mar', lat: -12.092, lng: -77.070 },
    { name: 'Pueblo Libre', lat: -12.074, lng: -77.065 },
    { name: 'San Miguel', lat: -12.078, lng: -77.085 },
    { name: 'Surquillo', lat: -12.112, lng: -77.020 },
    { name: 'San Borja', lat: -12.095, lng: -77.001 },
    { name: 'Santiago de Surco', lat: -12.140, lng: -76.995 },
    { name: 'Breña', lat: -12.059, lng: -77.051 },
    { name: 'Callao Bellavista', lat: -12.060, lng: -77.127 },
    { name: 'San Martín de Porres', lat: -12.025, lng: -77.060 },
    { name: 'Barranco', lat: -12.146, lng: -77.021 },
    { name: 'Chorrillos', lat: -12.180, lng: -77.015 },
    { name: 'Los Olivos', lat: -11.990, lng: -77.070 },
    { name: 'Comas', lat: -11.930, lng: -77.050 },
    { name: 'Ate Vitarte', lat: -12.025, lng: -76.920 },
    { name: 'San Juan de Lurigancho', lat: -11.980, lng: -77.000 },
  ];

  let closest = districts[0];
  let minD = Infinity;

  for (const d of districts) {
    const dist = calculateDistanceKm(lat, lng, d.lat, d.lng);
    if (dist < minD) {
      minD = dist;
      closest = d;
    }
  }

  const isNearbyLima = minD < 25;
  const districtName = isNearbyLima ? closest.name : 'Ubicación GPS';
  const cityName = isNearbyLima ? 'Lima, Perú' : 'Perú';

  return {
    address: `Coordenadas (${lat.toFixed(4)}, ${lng.toFixed(4)}) • Distrito ${districtName}, ${cityName}`,
    district: districtName,
    city: cityName,
  };
}

/**
 * Attempts reverse geocoding via OpenStreetMap Nominatim with graceful offline fallback
 */
export async function reverseGeocodePeru(
  lat: number,
  lng: number
): Promise<{ address: string; district: string; city: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'es',
        },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.pedestrian || addr.footway || addr.suburb || '';
      const houseNumber = addr.house_number ? ` ${addr.house_number}` : '';
      const neighbourhood = addr.neighbourhood || addr.suburb || '';
      const district = addr.city_district || addr.suburb || addr.district || addr.county || '';
      const city = addr.city || addr.town || 'Lima';

      const streetPart = (road + houseNumber).trim();
      const parts = [streetPart, neighbourhood, district, city].filter(Boolean);

      if (parts.length > 0) {
        return {
          address: parts.join(', '),
          district: district || neighbourhood || 'Lima',
          city,
        };
      }
    }
  } catch {
    // If network fails or timeout, fall back to offline district detection
  }

  return estimateDistrictOffline(lat, lng);
}

/**
 * Promise wrapper around navigator.geolocation.getCurrentPosition with high accuracy
 */
export function getCurrentGpsPosition(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  }
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La geolocalización no es compatible con este navegador o dispositivo.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Helper to build Google Maps navigation URL
 */
export function getGoogleMapsDirUrl(
  destLat: number,
  destLng: number,
  originLat?: number,
  originLng?: number,
  destinationLabel?: string
): string {
  // Prefer the facility name and verified street address over approximate
  // centroids. Maps can resolve the actual place entrance from this query.
  const destination = destinationLabel
    ? encodeURIComponent(destinationLabel)
    : `${destLat},${destLng}`;

  if (originLat !== undefined && originLng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destination}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

/**
 * Helper to build Waze navigation URL
 */
export function getWazeDirUrl(destLat: number, destLng: number): string {
  return `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`;
}

/**
 * Helper to build WhatsApp share link with GPS position for SAMU or family
 */
export function getWhatsAppGpsShareUrl(
  coords: GpsCoordinates,
  address: string,
  patientName?: string,
  extraMessage?: string
): string {
  const lines = [
    '🚨 *ALERTA DE EMERGENCIA MÉDICA (TriajeIA Perú)*',
    patientName ? `👤 *Paciente:* ${patientName}` : '',
    extraMessage ? `⚠️ *Situación:* ${extraMessage}` : '',
    `📍 *Ubicación detectada:* ${address}`,
    `🌐 *Coordenadas GPS:* ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)} (Precisión: ±${Math.round(coords.accuracy || 5)}m)`,
    `🗺️ *Ver en Google Maps:* https://maps.google.com/?q=${coords.lat},${coords.lng}`,
  ].filter(Boolean);

  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}
