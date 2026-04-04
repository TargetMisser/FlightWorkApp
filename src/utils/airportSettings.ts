import AsyncStorage from '@react-native-async-storage/async-storage';

export type AirportPreset = {
  code: string;
  name: string;
  city: string;
  icao?: string;
};

export type AirportInfo = AirportPreset & {
  isCustom: boolean;
};

export const AIRPORT_STORAGE_KEY = 'aerostaff_airport_code_v1';
export const DEFAULT_AIRPORT_CODE = 'PSA';

export const AIRPORT_PRESETS: AirportPreset[] = [
  { code: 'PSA', name: 'Pisa International', city: 'Pisa', icao: 'LIRP' },
  { code: 'FCO', name: 'Rome Fiumicino', city: 'Rome', icao: 'LIRF' },
  { code: 'CIA', name: 'Rome Ciampino', city: 'Rome', icao: 'LIRA' },
  { code: 'MXP', name: 'Milan Malpensa', city: 'Milan', icao: 'LIMC' },
  { code: 'LIN', name: 'Milan Linate', city: 'Milan', icao: 'LIML' },
  { code: 'BGY', name: 'Bergamo Orio al Serio', city: 'Bergamo', icao: 'LIME' },
  { code: 'BLQ', name: 'Bologna Guglielmo Marconi', city: 'Bologna', icao: 'LIPE' },
  { code: 'VCE', name: 'Venice Marco Polo', city: 'Venice', icao: 'LIPZ' },
  { code: 'FLR', name: 'Florence Peretola', city: 'Florence', icao: 'LIRQ' },
  { code: 'NAP', name: 'Naples International', city: 'Naples', icao: 'LIRN' },
  { code: 'CTA', name: 'Catania Fontanarossa', city: 'Catania', icao: 'LICC' },
  { code: 'PMO', name: 'Palermo Falcone Borsellino', city: 'Palermo', icao: 'LICJ' },
];

const AIRPORT_MAP = Object.fromEntries(
  AIRPORT_PRESETS.map(airport => [airport.code, airport] as const),
) as Record<string, AirportPreset>;

export function normalizeAirportCode(value: string | null | undefined): string {
  return (value ?? '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
}

export function isValidAirportCode(value: string | null | undefined): boolean {
  return /^[A-Z]{3}$/.test(normalizeAirportCode(value));
}

export function getAirportInfo(code: string | null | undefined): AirportInfo {
  const normalized = isValidAirportCode(code) ? normalizeAirportCode(code) : DEFAULT_AIRPORT_CODE;
  const preset = AIRPORT_MAP[normalized];
  if (preset) return { ...preset, isCustom: false };
  return {
    code: normalized,
    name: 'Aeroporto personalizzato',
    city: normalized,
    isCustom: true,
  };
}

export function formatAirportSettingLabel(code: string | null | undefined): string {
  const airport = getAirportInfo(code);
  return airport.isCustom
    ? `${airport.code} · Aeroporto personalizzato`
    : `${airport.code} · ${airport.name}`;
}

export function formatAirportHeader(code: string | null | undefined): string {
  const airport = getAirportInfo(code);
  if (airport.isCustom) return `Aeroporto selezionato · ${airport.code}`;
  return airport.icao
    ? `${airport.name} · ${airport.code} / ${airport.icao}`
    : `${airport.name} · ${airport.code}`;
}

export function buildFr24ScheduleUrl(code: string | null | undefined): string {
  const normalized = isValidAirportCode(code) ? normalizeAirportCode(code) : DEFAULT_AIRPORT_CODE;
  return `https://api.flightradar24.com/common/v1/airport.json?code=${normalized.toLowerCase()}&plugin[]=schedule&page=1&limit=100`;
}

export async function getStoredAirportCode(): Promise<string> {
  const stored = await AsyncStorage.getItem(AIRPORT_STORAGE_KEY);
  return isValidAirportCode(stored) ? normalizeAirportCode(stored) : DEFAULT_AIRPORT_CODE;
}

export async function setStoredAirportCode(code: string): Promise<string> {
  const normalized = normalizeAirportCode(code);
  if (!isValidAirportCode(normalized)) {
    throw new Error('INVALID_AIRPORT_CODE');
  }
  await AsyncStorage.setItem(AIRPORT_STORAGE_KEY, normalized);
  return normalized;
}
