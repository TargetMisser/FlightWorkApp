import type { AirportInfo } from '../airportSettings';

export type FlightScheduleProviderId = 'fr24' | 'staffMonitor' | 'cache';

export type FlightScheduleProviderStatus = {
  provider: FlightScheduleProviderId;
  label: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  durationMs?: number;
  arrivals?: number;
  departures?: number;
};

export type FlightScheduleProviderContext = {
  airportCode: string;
  airport: AirportInfo;
  signal?: AbortSignal;
  now?: Date;
};

export type FlightScheduleProviderResult = {
  allArrivals: any[];
  allDepartures: any[];
};

export type FlightSchedulePayload = FlightScheduleProviderResult & {
  source: FlightScheduleProviderId;
  sourceLabel: string;
  fetchedAt: number;
  diagnostics: FlightScheduleProviderStatus[];
};

export type FlightScheduleProvider = {
  id: FlightScheduleProviderId;
  label: string;
  supports: (context: FlightScheduleProviderContext) => boolean;
  fetch: (context: FlightScheduleProviderContext) => Promise<FlightScheduleProviderResult>;
};
