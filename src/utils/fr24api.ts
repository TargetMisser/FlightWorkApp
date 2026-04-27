import {
  buildFr24ScheduleUrl,
  getAirportAirlines,
  getAirportInfo,
  getStoredAirportCode,
  isValidAirportCode,
  normalizeAirportCode,
  storeDetectedAirportAirlines,
  type AirportInfo,
} from './airportSettings';

const FETCH_TIMEOUT = 10000; // 10 seconds

export type FR24Schedule = {
  arrivals: any[];
  departures: any[];
  airportCode: string;
  airport: AirportInfo;
};

export type FR24ScheduleRaw = {
  allArrivals: any[];
  allDepartures: any[];
  arrivals: any[];
  departures: any[];
  airportCode: string;
  airport: AirportInfo;
};

function filterAirlines(data: any[], allowedList: string[]) {
  if (allowedList.length === 0) {
    return data;
  }

  return data.filter(item =>
    allowedList.some(key => (item.flight?.airline?.name || '').toLowerCase().includes(key)),
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

    await storeDetectedAirportAirlines(airportCode, allArrivals, allDepartures);
    const airlines = getAirportAirlines(airportCode);
    return {
      arrivals: filterAirlines(allArrivals, airlines),
      departures: filterAirlines(allDepartures, airlines),
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

    await storeDetectedAirportAirlines(airportCode, allArrivals, allDepartures);
    const airlines = getAirportAirlines(airportCode);
    return {
      allArrivals,
      allDepartures,
      arrivals: filterAirlines(allArrivals, airlines),
      departures: filterAirlines(allDepartures, airlines),
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
