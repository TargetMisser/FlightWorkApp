import { ALLOWED_AIRLINES } from './airlineOps';

const FR24_URL = 'https://api.flightradar24.com/common/v1/airport.json?code=psa&plugin[]=schedule&page=1&limit=100';
const FETCH_TIMEOUT = 10000; // 10 seconds

export type FR24Schedule = {
  arrivals: any[];
  departures: any[];
};

/**
 * Fetch PSA airport schedule from FlightRadar24, filtered by allowed airlines.
 * Includes a 10s timeout to prevent UI blocking.
 */
export async function fetchPSASchedule(): Promise<FR24Schedule> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(FR24_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });
    const json = await res.json();

    const filterAirlines = (data: any[]) =>
      data.filter(i => ALLOWED_AIRLINES.some(k => (i.flight?.airline?.name || '').toLowerCase().includes(k)));

    const allArrivals = json.result?.response?.airport?.pluginData?.schedule?.arrivals?.data || [];
    const allDepartures = json.result?.response?.airport?.pluginData?.schedule?.departures?.data || [];

    return {
      arrivals: filterAirlines(allArrivals),
      departures: filterAirlines(allDepartures),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch raw (unfiltered) schedule — needed when callers also use non-allowed airline data
 * (e.g. inbound arrival map by registration).
 */
export async function fetchPSAScheduleRaw(): Promise<{ allArrivals: any[]; allDepartures: any[]; arrivals: any[]; departures: any[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(FR24_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });
    const json = await res.json();

    const filterAirlines = (data: any[]) =>
      data.filter(i => ALLOWED_AIRLINES.some(k => (i.flight?.airline?.name || '').toLowerCase().includes(k)));

    const allArrivals = json.result?.response?.airport?.pluginData?.schedule?.arrivals?.data || [];
    const allDepartures = json.result?.response?.airport?.pluginData?.schedule?.departures?.data || [];

    return {
      allArrivals,
      allDepartures,
      arrivals: filterAirlines(allArrivals),
      departures: filterAirlines(allDepartures),
    };
  } finally {
    clearTimeout(timer);
  }
}
