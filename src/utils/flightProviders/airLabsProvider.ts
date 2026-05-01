import { AIRLINE_DISPLAY_NAMES } from '../airlineOps';
import type { FlightScheduleProvider } from './types';

const AIRLABS_API_BASE = 'https://airlabs.co/api/v9/schedules';
const AIRLABS_LIMIT = 50;

type AirLabsScheduleItem = Record<string, any>;

const AIRLINE_NAME_BY_IATA: Record<string, string> = {
  '3O': 'Air Arabia Maroc',
  '9H': 'Wizz Air Malta',
  AZ: 'ITA Airways',
  BA: AIRLINE_DISPLAY_NAMES['british airways'],
  EI: AIRLINE_DISPLAY_NAMES['aer lingus'],
  EN: 'Air Dolomiti',
  EW: 'Eurowings',
  FR: AIRLINE_DISPLAY_NAMES.ryanair,
  FZ: AIRLINE_DISPLAY_NAMES.flydubai,
  G9: 'Air Arabia',
  HV: AIRLINE_DISPLAY_NAMES.transavia,
  LH: 'Lufthansa',
  QY: 'DHL',
  RR: 'Buzz',
  SK: AIRLINE_DISPLAY_NAMES.sas,
  TO: AIRLINE_DISPLAY_NAMES.transavia,
  U2: AIRLINE_DISPLAY_NAMES.easyjet,
  V7: AIRLINE_DISPLAY_NAMES.volotea,
  VY: AIRLINE_DISPLAY_NAMES.vueling,
  W4: 'Wizz Air Malta',
  W6: AIRLINE_DISPLAY_NAMES.wizz,
  W9: 'Wizz Air UK',
  XZ: 'Aeroitalia',
};

function buildAirLabsUrl(paramName: 'dep_iata' | 'arr_iata', airportCode: string, apiKey: string): string {
  const params = [
    ['api_key', apiKey],
    [paramName, airportCode],
    ['limit', String(AIRLABS_LIMIT)],
  ];
  return `${AIRLABS_API_BASE}?${params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error ?? 'unknown_error');
}

function parseUnixTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return parseUnixTimestamp(Number(value));
  }
  return undefined;
}

function parseAirLabsDateTime(value: unknown, utc = false): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if (!match) return undefined;

  const [, y, mo, d, h, mi] = match;
  const year = Number(y);
  const month = Number(mo) - 1;
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const ms = utc
    ? Date.UTC(year, month, day, hour, minute, 0, 0)
    : new Date(year, month, day, hour, minute, 0, 0).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
}

function readTime(item: AirLabsScheduleItem, localField: string): number | undefined {
  return parseUnixTimestamp(item[`${localField}_ts`])
    ?? parseAirLabsDateTime(item[`${localField}_utc`], true)
    ?? parseAirLabsDateTime(item[localField], false);
}

function airportEndpoint(code: unknown, icao: unknown) {
  const iataCode = typeof code === 'string' ? code.toUpperCase() : undefined;
  const icaoCode = typeof icao === 'string' ? icao.toUpperCase() : undefined;
  const name = iataCode || icaoCode || 'N/A';
  return {
    name,
    code: {
      ...(iataCode ? { iata: iataCode } : {}),
      ...(icaoCode ? { icao: icaoCode } : {}),
    },
  };
}

function normalizeFlightNumber(item: AirLabsScheduleItem): string {
  const explicit = typeof item.flight_iata === 'string' ? item.flight_iata.trim() : '';
  if (explicit) return explicit.replace(/\s+/g, '');

  const airline = typeof item.airline_iata === 'string' ? item.airline_iata.trim().toUpperCase() : '';
  const number = typeof item.flight_number === 'string' || typeof item.flight_number === 'number'
    ? String(item.flight_number).trim()
    : '';
  return `${airline}${number}`.replace(/\s+/g, '') || 'N/A';
}

function statusColor(statusText: unknown, scheduledTs: number | undefined, bestTs: number | undefined): string {
  const status = typeof statusText === 'string' ? statusText.toLowerCase() : '';
  if (/cancel/.test(status)) return 'red';
  if (/delay/.test(status)) return 'yellow';
  if (/active|landed|boarding|departed/.test(status)) return 'green';
  if (scheduledTs && bestTs && bestTs - scheduledTs > 5 * 60) return 'yellow';
  return 'gray';
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const cleaned = String(value).trim();
  return cleaned || undefined;
}

function itemToScheduleItem(
  item: AirLabsScheduleItem,
  direction: 'arrivals' | 'departures',
): any | null {
  const timePrefix = direction === 'arrivals' ? 'arr' : 'dep';
  const timeField = direction === 'arrivals' ? 'arrival' : 'departure';
  const scheduledTs = readTime(item, `${timePrefix}_time`);
  if (!scheduledTs) return null;

  const estimatedTs = readTime(item, `${timePrefix}_estimated`);
  const actualTs = readTime(item, `${timePrefix}_actual`);
  const bestTs = actualTs ?? estimatedTs ?? scheduledTs;
  const flightNumber = normalizeFlightNumber(item);
  const airlineIata = cleanString(item.airline_iata)?.toUpperCase();
  const airlineIcao = cleanString(item.airline_icao)?.toUpperCase();
  const airlineName = airlineIata ? AIRLINE_NAME_BY_IATA[airlineIata] : undefined;
  const depAirport = airportEndpoint(item.dep_iata, item.dep_icao);
  const arrAirport = airportEndpoint(item.arr_iata, item.arr_icao);
  const status = cleanString(item.status) ?? (estimatedTs && estimatedTs !== scheduledTs ? 'delayed' : 'scheduled');

  return {
    flight: {
      identification: {
        id: `airlabs_${direction}_${flightNumber}_${scheduledTs}`,
        number: { default: flightNumber },
      },
      airline: {
        name: airlineName ?? (airlineIata ? `Compagnia ${airlineIata}` : 'Sconosciuta'),
        code: {
          ...(airlineIata ? { iata: airlineIata } : {}),
          ...(airlineIcao ? { icao: airlineIcao } : {}),
        },
      },
      aircraft: {
        model: { code: cleanString(item.aircraft_icao) },
      },
      airport: {
        origin: depAirport,
        destination: arrAirport,
      },
      time: {
        scheduled: { [timeField]: scheduledTs },
        estimated: estimatedTs ? { [timeField]: estimatedTs } : {},
        real: actualTs ? { [timeField]: actualTs } : {},
      },
      status: {
        text: status,
        generic: { status: { color: statusColor(status, scheduledTs, bestTs) } },
      },
      _operational: {
        departureGate: cleanString(item.dep_gate),
        departureTerminal: cleanString(item.dep_terminal),
        arrivalGate: cleanString(item.arr_gate),
        arrivalTerminal: cleanString(item.arr_terminal),
        belt: cleanString(item.arr_baggage),
      },
      _source: 'airlabs',
    },
  };
}

async function fetchAirLabsDirection(
  airportCode: string,
  direction: 'arrivals' | 'departures',
  apiKey: string,
  signal?: AbortSignal,
): Promise<any[]> {
  const paramName = direction === 'arrivals' ? 'arr_iata' : 'dep_iata';
  const res = await fetch(buildAirLabsUrl(paramName, airportCode, apiKey), {
    headers: { Accept: 'application/json' },
    signal,
  });
  const body = await res.text();

  if (!res.ok) {
    throw new Error(`AIRLABS_HTTP_${res.status}`);
  }

  let json: any;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error('AIRLABS_INVALID_JSON_RESPONSE');
  }

  if (json?.error) {
    const code = json.error.code ? `AIRLABS_${String(json.error.code).toUpperCase()}` : 'AIRLABS_ERROR';
    throw new Error(`${code}: ${json.error.message ?? 'Unknown AirLabs error'}`);
  }

  const response = Array.isArray(json) ? json : json?.response;
  if (!Array.isArray(response)) {
    throw new Error('AIRLABS_UNEXPECTED_RESPONSE');
  }

  return response
    .map(item => itemToScheduleItem(item, direction))
    .filter((item): item is any => item !== null);
}

export const airLabsProvider: FlightScheduleProvider = {
  id: 'airlabs',
  label: 'AirLabs',
  supports: ({ airLabsApiKey }) => Boolean(airLabsApiKey),
  unavailableMessage: () => 'AirLabs API key non configurata',
  fetch: async ({ airportCode, airLabsApiKey, signal }) => {
    if (!airLabsApiKey) throw new Error('AIRLABS_API_KEY_MISSING');

    const [departuresResult, arrivalsResult] = await Promise.allSettled([
      fetchAirLabsDirection(airportCode, 'departures', airLabsApiKey, signal),
      fetchAirLabsDirection(airportCode, 'arrivals', airLabsApiKey, signal),
    ]);

    const allDepartures = departuresResult.status === 'fulfilled' ? departuresResult.value : [];
    const allArrivals = arrivalsResult.status === 'fulfilled' ? arrivalsResult.value : [];

    if (departuresResult.status === 'rejected' && arrivalsResult.status === 'rejected') {
      throw new Error(
        `AIRLABS_FAILED D:${errorMessage(departuresResult.reason)} A:${errorMessage(arrivalsResult.reason)}`,
      );
    }

    if (allArrivals.length + allDepartures.length === 0) {
      throw new Error('AIRLABS_EMPTY_SCHEDULE');
    }

    return { allArrivals, allDepartures };
  },
};
