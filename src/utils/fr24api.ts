import { ALLOWED_AIRLINES } from './airlineOps';
import {
  buildFr24ScheduleUrl,
  getAirportInfo,
  getStoredAirportCode,
  isValidAirportCode,
  normalizeAirportCode,
  type AirportInfo,
} from './airportSettings';
import type { FR24Flight } from '../types/flight';

const FETCH_TIMEOUT = 10000; // 10 seconds

export type FR24Schedule = {
  arrivals: FR24Flight[];
  departures: FR24Flight[];
  airportCode: string;
  airport: AirportInfo;
};

export type FR24ScheduleRaw = {
  allArrivals: FR24Flight[];
  allDepartures: FR24Flight[];
  arrivals: FR24Flight[];
  departures: FR24Flight[];
  airportCode: string;
  airport: AirportInfo;
};

function filterAirlines(data: FR24Flight[]) {
  return data.filter(item =>
    ALLOWED_AIRLINES.some(key => (item.flight?.airline?.name || '').toLowerCase().includes(key)),
  );
}

async function resolveAirportCode(code?: string): Promise<string> {
  const normalized = normalizeAirportCode(code);
  return isValidAirportCode(normalized) ? normalized : getStoredAirportCode();
}

/**
 * Fetch airport schedule from FlightRadar24, filtered by allowed airlines.
 * Includes a 10s timeout to prevent UI blocking.
 */
export async function fetchAirportSchedule(code?: string): Promise<FR24Schedule> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const airportCode = await resolveAirportCode(code);
    const res = await fetch(buildFr24ScheduleUrl(airportCode), {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });
    const json = await res.json();

    const allArrivals = json.result?.response?.airport?.pluginData?.schedule?.arrivals?.data || [];
    const allDepartures = json.result?.response?.airport?.pluginData?.schedule?.departures?.data || [];

    return {
      arrivals: filterAirlines(allArrivals),
      departures: filterAirlines(allDepartures),
      airportCode,
      airport: getAirportInfo(airportCode),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch raw (unfiltered) schedule — needed when callers also use non-allowed airline data
 * (e.g. inbound arrival map by registration).
 */
export async function fetchAirportScheduleRaw(code?: string): Promise<FR24ScheduleRaw> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const airportCode = await resolveAirportCode(code);
    const res = await fetch(buildFr24ScheduleUrl(airportCode), {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });
    const json = await res.json();

    const allArrivals = json.result?.response?.airport?.pluginData?.schedule?.arrivals?.data || [];
    const allDepartures = json.result?.response?.airport?.pluginData?.schedule?.departures?.data || [];

    return {
      allArrivals,
      allDepartures,
      arrivals: filterAirlines(allArrivals),
      departures: filterAirlines(allDepartures),
      airportCode,
      airport: getAirportInfo(airportCode),
    };
  } finally {
    clearTimeout(timer);
  }
}

// Legacy aliases kept to avoid breaking older imports.
export const fetchPSASchedule = fetchAirportSchedule;
export const fetchPSAScheduleRaw = fetchAirportScheduleRaw;
