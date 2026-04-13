import { getSelectedAirlines } from './airlineOps';
import {
  buildFr24ScheduleUrl,
  getAirportInfo,
  getStoredAirportCode,
  isValidAirportCode,
  normalizeAirportCode,
  type AirportInfo,
} from './airportSettings';

const FETCH_TIMEOUT = 10000; // 10 seconds
const CACHE_TTL = 120_000; // 2 minutes

// In-memory cache to avoid duplicate FR24 requests (e.g. FlightScreen + autoNotifications)
let _cache: { data: FR24ScheduleRaw; ts: number; code: string } | null = null;

// ─── FR24 flight data types ──────────────────────────────────────────────────
export type FR24FlightTime = {
  scheduled?: { departure?: number; arrival?: number };
  real?: { departure?: number; arrival?: number };
  estimated?: { departure?: number; arrival?: number };
};

export type FR24AirportCode = {
  iata?: string;
  icao?: string;
};

export type FR24FlightAirport = {
  code?: FR24AirportCode;
  name?: string;
  position?: { latitude?: number; longitude?: number };
};

export type FR24FlightStatus = {
  text?: string;
  type?: string;
  generic?: { status?: { text?: string; color?: string } };
};

export type FR24FlightIdentification = {
  number?: { default?: string; alternative?: string };
  callsign?: string;
};

export type FR24FlightAirline = {
  name?: string;
  code?: { iata?: string; icao?: string };
};

export type FR24FlightAircraft = {
  model?: { code?: string; text?: string };
  registration?: string;
  hex?: string;
};

export type FR24FlightData = {
  flight?: {
    identification?: FR24FlightIdentification;
    status?: FR24FlightStatus;
    airline?: FR24FlightAirline;
    airport?: {
      origin?: FR24FlightAirport;
      destination?: FR24FlightAirport;
    };
    time?: FR24FlightTime;
    aircraft?: FR24FlightAircraft;
  };
};

// ─── Schedule result types ───────────────────────────────────────────────────
export type FR24Schedule = {
  arrivals: FR24FlightData[];
  departures: FR24FlightData[];
  airportCode: string;
  airport: AirportInfo;
};

export type FR24ScheduleRaw = {
  allArrivals: FR24FlightData[];
  allDepartures: FR24FlightData[];
  arrivals: FR24FlightData[];
  departures: FR24FlightData[];
  airportCode: string;
  airport: AirportInfo;
};

function filterAirlines(data: FR24FlightData[], selected: string[]) {
  return data.filter(item =>
    selected.some(key => (item.flight?.airline?.name || '').toLowerCase().includes(key)),
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
    const selected = await getSelectedAirlines(airportCode);
    const res = await fetch(buildFr24ScheduleUrl(airportCode), {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });
    const json = await res.json();

    const allArrivals = json.result?.response?.airport?.pluginData?.schedule?.arrivals?.data || [];
    const allDepartures = json.result?.response?.airport?.pluginData?.schedule?.departures?.data || [];

    return {
      arrivals: filterAirlines(allArrivals, selected),
      departures: filterAirlines(allDepartures, selected),
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
  const airportCode = await resolveAirportCode(code);
  const selected = await getSelectedAirlines(airportCode);

  // Return cached data if fresh enough
  if (_cache && _cache.code === airportCode && Date.now() - _cache.ts < CACHE_TTL) {
    // Re-filter with current selection (user may have changed airlines)
    return {
      ..._cache.data,
      arrivals: filterAirlines(_cache.data.allArrivals, selected),
      departures: filterAirlines(_cache.data.allDepartures, selected),
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(buildFr24ScheduleUrl(airportCode), {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });
    const json = await res.json();

    const allArrivals = json.result?.response?.airport?.pluginData?.schedule?.arrivals?.data || [];
    const allDepartures = json.result?.response?.airport?.pluginData?.schedule?.departures?.data || [];

    const data: FR24ScheduleRaw = {
      allArrivals,
      allDepartures,
      arrivals: filterAirlines(allArrivals, selected),
      departures: filterAirlines(allDepartures, selected),
      airportCode,
      airport: getAirportInfo(airportCode),
    };

    _cache = { data, ts: Date.now(), code: airportCode };
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Legacy aliases kept to avoid breaking older imports.
export const fetchPSASchedule = fetchAirportSchedule;
export const fetchPSAScheduleRaw = fetchAirportScheduleRaw;
