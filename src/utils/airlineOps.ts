export type HexColor = `#${string}`;

export type AirlineOps = {
  checkInOpen: number;
  checkInClose: number;
  gateOpen: number;
  gateClose: number;
};

export const DEFAULT_OPS: AirlineOps = { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 20 };

export const AIRLINE_OPS: Array<{ key: string; ops: AirlineOps }> = [
  { key: 'easyjet',         ops: { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'wizz',            ops: { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 15 } },
  { key: 'aer lingus',      ops: { checkInOpen: 150, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'british airways', ops: { checkInOpen: 180, checkInClose: 45, gateOpen: 45, gateClose: 20 } },
  { key: 'sas',             ops: { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'scandinavian',    ops: { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'flydubai',        ops: { checkInOpen: 180, checkInClose: 60, gateOpen: 40, gateClose: 20 } },
];

export function getAirlineOps(name: string): AirlineOps {
  const lower = name.toLowerCase();
  return AIRLINE_OPS.find(({ key }) => lower.includes(key))?.ops ?? DEFAULT_OPS;
}

export const AIRLINE_COLORS: Record<string, HexColor> = {
  'wizz': '#C6006E', 'easyjet': '#FF6600', 'aer lingus': '#006E44',
  'british airways': '#075AAA', 'sas': '#003E7E', 'scandinavian': '#003E7E', 'flydubai': '#CC1E42',
};

export function getAirlineColor(name: string): HexColor {
  const lower = name.toLowerCase();
  for (const [k, c] of Object.entries(AIRLINE_COLORS)) if (lower.includes(k)) return c;
  return '#2563EB';
}

export const ALLOWED_AIRLINES = ['wizz', 'aer lingus', 'easyjet', 'british airways', 'sas', 'scandinavian', 'flydubai'];

// ─── Dynamic airline selection (persisted in AsyncStorage) ───────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_AIRLINES_PREFIX = 'aerostaff_selected_airlines_v1_';

function airlineKey(airportCode: string) {
  return `${SELECTED_AIRLINES_PREFIX}${airportCode.toUpperCase()}`;
}

async function resolveCode(airportCode?: string): Promise<string> {
  if (airportCode) return airportCode;
  const { getStoredAirportCode } = await import('./airportSettings');
  return getStoredAirportCode();
}

/** Read user-selected airlines for a specific airport. Falls back to ALLOWED_AIRLINES if never set. */
export async function getSelectedAirlines(airportCode?: string): Promise<string[]> {
  try {
    const code = await resolveCode(airportCode);
    const raw = await AsyncStorage.getItem(airlineKey(code));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return ALLOWED_AIRLINES;
}

/** Persist the user's airline selection for a specific airport (lowercase keys). */
export async function setSelectedAirlines(airlines: string[], airportCode?: string): Promise<void> {
  const code = await resolveCode(airportCode);
  await AsyncStorage.setItem(airlineKey(code), JSON.stringify(airlines));
}
