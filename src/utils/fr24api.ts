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
import { AIRLINE_DISPLAY_NAMES } from './airlineOps';
import { fetchStaffMonitorData, type StaffMonitorFlight } from './staffMonitor';

const FETCH_TIMEOUT = 10000; // 10 seconds
const STAFF_MONITOR_FALLBACK_AIRPORT = 'PSA';

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

type SchedulePayload = {
  allArrivals: any[];
  allDepartures: any[];
};

type AirlineMeta = {
  key: string;
  name: string;
  iata: string;
  prefixes: string[];
};

const AIRLINE_BY_FLIGHT_PREFIX: AirlineMeta[] = [
  { key: 'ryanair', name: AIRLINE_DISPLAY_NAMES.ryanair, iata: 'FR', prefixes: ['FR', 'RYR'] },
  { key: 'easyjet', name: AIRLINE_DISPLAY_NAMES.easyjet, iata: 'U2', prefixes: ['U2', 'EJU', 'EZY'] },
  { key: 'wizz', name: AIRLINE_DISPLAY_NAMES.wizz, iata: 'W6', prefixes: ['W6', 'W4', 'W9'] },
  { key: 'volotea', name: AIRLINE_DISPLAY_NAMES.volotea, iata: 'V7', prefixes: ['V7'] },
  { key: 'vueling', name: AIRLINE_DISPLAY_NAMES.vueling, iata: 'VY', prefixes: ['VY'] },
  { key: 'transavia', name: AIRLINE_DISPLAY_NAMES.transavia, iata: 'HV', prefixes: ['HV', 'TO'] },
  { key: 'aer lingus', name: AIRLINE_DISPLAY_NAMES['aer lingus'], iata: 'EI', prefixes: ['EI'] },
  { key: 'british airways', name: AIRLINE_DISPLAY_NAMES['british airways'], iata: 'BA', prefixes: ['BA'] },
  { key: 'sas', name: AIRLINE_DISPLAY_NAMES.sas, iata: 'SK', prefixes: ['SK'] },
  { key: 'scandinavian', name: AIRLINE_DISPLAY_NAMES.scandinavian, iata: 'SK', prefixes: ['SAS'] },
  { key: 'flydubai', name: AIRLINE_DISPLAY_NAMES.flydubai, iata: 'FZ', prefixes: ['FZ'] },
  { key: 'aeroitalia', name: 'Aeroitalia', iata: 'XZ', prefixes: ['XZ'] },
  { key: 'air arabia maroc', name: 'Air Arabia Maroc', iata: '3O', prefixes: ['3O'] },
  { key: 'air arabia', name: 'Air Arabia', iata: 'G9', prefixes: ['G9'] },
  { key: 'air dolomiti', name: 'Air Dolomiti', iata: 'EN', prefixes: ['EN'] },
  { key: 'buzz', name: 'Buzz', iata: 'RR', prefixes: ['RR'] },
  { key: 'dhl', name: 'DHL', iata: 'QY', prefixes: ['QY'] },
  { key: 'eurowings', name: 'Eurowings', iata: 'EW', prefixes: ['EW'] },
  { key: 'ita airways', name: 'ITA Airways', iata: 'AZ', prefixes: ['AZ'] },
  { key: 'lufthansa', name: 'Lufthansa', iata: 'LH', prefixes: ['LH'] },
];

function inferAirline(flightNumber: string): AirlineMeta {
  const normalized = flightNumber.toUpperCase().replace(/\s+/g, '');
  for (const airline of AIRLINE_BY_FLIGHT_PREFIX) {
    if (airline.prefixes.some(prefix => normalized.startsWith(prefix))) {
      return airline;
    }
  }

  const fallbackCode = normalized.match(/^([A-Z0-9]{2,3}?)(?=\d)/)?.[1] ?? normalized.slice(0, 2);
  return {
    key: fallbackCode.toLowerCase(),
    name: fallbackCode ? `Compagnia ${fallbackCode}` : 'Sconosciuta',
    iata: fallbackCode,
    prefixes: [fallbackCode],
  };
}

function parseStaffMonitorClock(value?: string, baseDate = new Date()): number | undefined {
  const match = value?.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (!match) return undefined;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
    return undefined;
  }

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function alignEstimatedTime(scheduledTs: number | undefined, estimatedTs: number | undefined): number | undefined {
  if (!scheduledTs || !estimatedTs) return estimatedTs;
  const halfDay = 12 * 60 * 60;
  if (estimatedTs < scheduledTs - halfDay) return estimatedTs + 24 * 60 * 60;
  if (estimatedTs > scheduledTs + halfDay) return estimatedTs - 24 * 60 * 60;
  return estimatedTs;
}

function statusColor(statusText: string | undefined, scheduledTs: number | undefined, bestTs: number | undefined): string {
  const status = (statusText ?? '').toLowerCase();
  if (/cancel|annull/.test(status)) return 'red';
  if (/ritar|delay/.test(status)) return 'yellow';
  if (/imbarco|boarding|atterr|landed|decoll|partit|take/.test(status)) return 'green';
  if (scheduledTs && bestTs && bestTs - scheduledTs > 5 * 60) return 'yellow';
  return 'gray';
}

function hasRealEvent(statusText: string | undefined, direction: 'arrivals' | 'departures'): boolean {
  const status = (statusText ?? '').toLowerCase();
  return direction === 'arrivals'
    ? /atterr|landed/.test(status)
    : /decoll|partit|take/.test(status);
}

function airportEndpoint(name: string, iata?: string, icao?: string) {
  return {
    name,
    code: {
      ...(iata ? { iata } : {}),
      ...(icao ? { icao } : {}),
    },
  };
}

function staffMonitorFlightToScheduleItem(
  item: StaffMonitorFlight,
  direction: 'arrivals' | 'departures',
  airportCode: string,
  airport: AirportInfo,
): any | null {
  const scheduledTs = parseStaffMonitorClock(item.scheduledTime);
  if (!scheduledTs) return null;

  const estimatedTs = alignEstimatedTime(scheduledTs, parseStaffMonitorClock(item.estimatedTime));
  const effectiveTs = estimatedTs ?? scheduledTs;
  const timeField = direction === 'arrivals' ? 'arrival' : 'departure';
  const airline = inferAirline(item.flightNumber);
  const routeName = item.route ?? 'N/A';
  const homeAirport = airportEndpoint(airport.name, airportCode, airport.icao);
  const remoteAirport = airportEndpoint(routeName);
  const realTs = hasRealEvent(item.status, direction) ? effectiveTs : undefined;
  const statusText = item.status ?? (estimatedTs && estimatedTs !== scheduledTs ? 'Stimato' : 'Scheduled');

  return {
    flight: {
      identification: {
        id: `staffmonitor_${direction}_${item.flightNumber}_${scheduledTs}`,
        number: { default: item.flightNumber },
      },
      airline: {
        name: airline.name,
        code: { iata: airline.iata },
      },
      aircraft: {
        registration: item.registration,
        model: { code: item.aircraftType },
      },
      airport: direction === 'arrivals'
        ? { origin: remoteAirport, destination: homeAirport }
        : { origin: homeAirport, destination: remoteAirport },
      time: {
        scheduled: { [timeField]: scheduledTs },
        estimated: estimatedTs ? { [timeField]: estimatedTs } : {},
        real: realTs ? { [timeField]: realTs } : {},
      },
      status: {
        text: statusText,
        generic: { status: { color: statusColor(item.status, scheduledTs, effectiveTs) } },
      },
      _source: 'staffMonitor',
    },
  };
}

async function fetchStaffMonitorSchedulePayload(airportCode: string, airport: AirportInfo): Promise<SchedulePayload | null> {
  if (airportCode !== STAFF_MONITOR_FALLBACK_AIRPORT) return null;

  const [departures, arrivals] = await Promise.all([
    fetchStaffMonitorData('D'),
    fetchStaffMonitorData('A'),
  ]);

  return {
    allArrivals: arrivals
      .map(item => staffMonitorFlightToScheduleItem(item, 'arrivals', airportCode, airport))
      .filter(Boolean),
    allDepartures: departures
      .map(item => staffMonitorFlightToScheduleItem(item, 'departures', airportCode, airport))
      .filter(Boolean),
  };
}

async function fetchFr24SchedulePayload(airportCode: string, signal: AbortSignal): Promise<SchedulePayload> {
  const res = await fetch(buildFr24ScheduleUrl(airportCode), {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json,text/plain,*/*',
    },
    signal,
  });
  const body = await res.text();

  if (!res.ok) {
    throw new Error(`FR24_HTTP_${res.status}`);
  }
  if (/^\s*</.test(body) || /cloudflare|just a moment|enable javascript/i.test(body)) {
    throw new Error('FR24_BLOCKED_OR_HTML_RESPONSE');
  }

  let json: any;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error('FR24_INVALID_JSON_RESPONSE');
  }

  return {
    allArrivals: json.result?.response?.airport?.pluginData?.schedule?.arrivals?.data || [],
    allDepartures: json.result?.response?.airport?.pluginData?.schedule?.departures?.data || [],
  };
}

async function fetchScheduleRawData(code?: string): Promise<FR24ScheduleRaw> {
  const airportCode = await resolveAirportCode(code);
  const airport = getAirportInfo(airportCode);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  let payload: SchedulePayload;
  try {
    payload = await fetchFr24SchedulePayload(airportCode, controller.signal);
  } catch (error) {
    if (__DEV__) console.warn('[fr24api] FR24 failed, trying fallback:', error);
    const fallback = await fetchStaffMonitorSchedulePayload(airportCode, airport);
    if (!fallback) throw error;
    payload = fallback;
  } finally {
    clearTimeout(timer);
  }

  const { allArrivals, allDepartures } = payload;
  await storeDetectedAirportAirlines(airportCode, allArrivals, allDepartures);
  const airlines = getAirportAirlines(airportCode);
  return {
    allArrivals,
    allDepartures,
    arrivals: filterAirlines(allArrivals, airlines),
    departures: filterAirlines(allDepartures, airlines),
    airportCode,
    airport,
  };
}

/**
 * Fetch airport schedule from FlightRadar24, filtered by allowed airlines.
 * Includes a 10s timeout to prevent UI blocking.
 */
export async function fetchAirportSchedule(code?: string): Promise<FR24Schedule> {
  const raw = await fetchScheduleRawData(code);
  return {
    arrivals: raw.arrivals,
    departures: raw.departures,
    airportCode: raw.airportCode,
    airport: raw.airport,
  };
}

/**
 * Fetch raw (unfiltered) schedule — needed when callers also use non-allowed airline data
 * (e.g. inbound arrival map by registration).
 */
export async function fetchAirportScheduleRaw(code?: string): Promise<FR24ScheduleRaw> {
  return fetchScheduleRawData(code);
}

// Legacy aliases kept to avoid breaking older imports.
export const fetchPSASchedule = fetchAirportSchedule;
export const fetchPSAScheduleRaw = fetchAirportScheduleRaw;
