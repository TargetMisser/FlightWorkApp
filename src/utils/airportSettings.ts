import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALLOWED_AIRLINES, AIRLINE_DISPLAY_NAMES } from './airlineOps';

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
export const AIRPORT_AIRLINES_STORAGE_KEY = 'aerostaff_airport_airlines_v1';
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

export const AIRPORT_AIRLINES: Record<string, string[]> = {
  PSA: ['ryanair', 'easyjet', 'wizz', 'aer lingus', 'transavia', 'volotea'],
  FCO: ['ryanair', 'easyjet', 'wizz', 'aer lingus', 'british airways', 'sas', 'flydubai', 'volotea', 'vueling', 'transavia'],
  CIA: ['ryanair', 'easyjet', 'wizz'],
  MXP: ['ryanair', 'easyjet', 'wizz', 'aer lingus', 'british airways', 'flydubai', 'vueling', 'volotea'],
  LIN: ['british airways', 'aer lingus', 'sas'],
  BGY: ['ryanair', 'wizz', 'easyjet', 'vueling', 'volotea'],
  BLQ: ['ryanair', 'easyjet', 'wizz', 'vueling', 'volotea', 'transavia'],
  VCE: ['ryanair', 'easyjet', 'wizz', 'british airways', 'volotea', 'vueling'],
  FLR: ['ryanair', 'easyjet', 'volotea', 'vueling'],
  NAP: ['ryanair', 'easyjet', 'wizz', 'volotea', 'vueling'],
  CTA: ['ryanair', 'easyjet', 'wizz', 'volotea', 'vueling'],
  PMO: ['ryanair', 'easyjet', 'wizz', 'volotea', 'vueling'],
};

const airportAirlinesCache: Record<string, string[]> = Object.fromEntries(
  Object.entries(AIRPORT_AIRLINES).map(([code, airlines]) => [code, [...airlines]]),
);

function normalizeAirlineKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const AIRLINE_CANONICAL_RULES: Array<{ canonical: string; needles: string[] }> = [
  { canonical: 'ryanair', needles: ['ryanair'] },
  { canonical: 'easyjet', needles: ['easyjet', 'easyjet europe', 'easyjet switzerland', 'easyjet uk'] },
  { canonical: 'wizz', needles: ['wizz', 'wizz air malta', 'wizz air uk', 'wizz air abu dhabi'] },
  { canonical: 'volotea', needles: ['volotea'] },
  { canonical: 'vueling', needles: ['vueling'] },
  { canonical: 'transavia', needles: ['transavia france', 'transavia holland', 'transavia airlines', 'transavia'] },
  { canonical: 'aer lingus', needles: ['aer lingus'] },
  { canonical: 'british airways', needles: ['british airways'] },
  { canonical: 'sas', needles: ['sas', 'scandinavian'] },
  { canonical: 'flydubai', needles: ['flydubai'] },
];

function canonicalizeAirlineKey(value: string | null | undefined): string {
  const normalized = normalizeAirlineKey(value);
  if (!normalized) {
    return '';
  }

  for (const rule of AIRLINE_CANONICAL_RULES) {
    if (rule.needles.some(needle => normalized.includes(needle))) {
      return rule.canonical;
    }
  }

  return normalized;
}

function sortAirlineKeys(values: string[]): string[] {
  return [...values].sort((left, right) => {
    const leftLabel = AIRLINE_DISPLAY_NAMES[left] ?? left;
    const rightLabel = AIRLINE_DISPLAY_NAMES[right] ?? right;
    return leftLabel.localeCompare(rightLabel, 'en', { sensitivity: 'base' });
  });
}

function sanitizeAirlineList(values: string[], fallback: string[] = ALLOWED_AIRLINES): string[] {
  const unique = Array.from(new Set(values.map(canonicalizeAirlineKey).filter(Boolean)));
  if (unique.length === 0) {
    return [...fallback];
  }

  return sortAirlineKeys(unique);
}

function normalizeAirportAirlineMap(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const entries = Object.entries(raw as Record<string, unknown>)
    .map(([airportCode, airlines]) => {
      const normalizedCode = normalizeAirportCode(airportCode);
      if (!normalizedCode || !Array.isArray(airlines)) {
        return null;
      }

      return [normalizedCode, sanitizeAirlineList(airlines as string[], [])] as const;
    })
    .filter((entry): entry is readonly [string, string[]] => entry !== null);

  return Object.fromEntries(entries);
}

export function primeAirportAirlinesCache(map: Record<string, string[]>): void {
  Object.entries(normalizeAirportAirlineMap(map)).forEach(([airportCode, airlines]) => {
    airportAirlinesCache[airportCode] = airlines;
  });
}

export async function getStoredAirportAirlineMap(): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(AIRPORT_AIRLINES_STORAGE_KEY);
    const parsed = raw ? normalizeAirportAirlineMap(JSON.parse(raw)) : {};
    primeAirportAirlinesCache(parsed);
    return parsed;
  } catch {
    return {};
  }
}

export async function getStoredAirportAirlines(code: string | null | undefined): Promise<string[]> {
  const normalized = isValidAirportCode(code) ? normalizeAirportCode(code) : DEFAULT_AIRPORT_CODE;
  const stored = await getStoredAirportAirlineMap();
  return stored[normalized] ?? getAirportAirlines(normalized);
}

export function extractAirportAirlinesFromSchedule(...sources: unknown[]): string[] {
  const detected = sources.flatMap(source => {
    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map(item => typeof item === 'string' ? item : item?.flight?.airline?.name)
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
  });

  return sanitizeAirlineList(detected, []);
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export async function storeDetectedAirportAirlines(code: string | null | undefined, ...sources: unknown[]): Promise<string[]> {
  const normalizedCode = isValidAirportCode(code) ? normalizeAirportCode(code) : DEFAULT_AIRPORT_CODE;
  const detected = extractAirportAirlinesFromSchedule(...sources);
  const fallback = AIRPORT_AIRLINES[normalizedCode] ?? ALLOWED_AIRLINES;
  const currentStoredMap = await getStoredAirportAirlineMap();
  const current = currentStoredMap[normalizedCode] ?? getAirportAirlines(normalizedCode);
  const next = sanitizeAirlineList([...fallback, ...current, ...detected], fallback);

  airportAirlinesCache[normalizedCode] = next;

  if (arraysEqual(next, currentStoredMap[normalizedCode] ?? [])) {
    return next;
  }

  await AsyncStorage.setItem(
    AIRPORT_AIRLINES_STORAGE_KEY,
    JSON.stringify({
      ...currentStoredMap,
      [normalizedCode]: next,
    }),
  );

  return next;
}

export function getAirportAirlines(code: string | null | undefined): string[] {
  const normalized = isValidAirportCode(code) ? normalizeAirportCode(code) : DEFAULT_AIRPORT_CODE;
  return airportAirlinesCache[normalized] ?? AIRPORT_AIRLINES[normalized] ?? ALLOWED_AIRLINES;
}

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
