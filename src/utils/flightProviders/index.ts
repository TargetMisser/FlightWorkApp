import { fr24Provider } from './fr24Provider';
import { staffMonitorProvider } from './staffMonitorProvider';
import type {
  FlightSchedulePayload,
  FlightScheduleProvider,
  FlightScheduleProviderContext,
  FlightScheduleProviderStatus,
} from './types';

export type {
  FlightSchedulePayload,
  FlightScheduleProviderContext,
  FlightScheduleProviderId,
  FlightScheduleProviderStatus,
} from './types';

const DEFAULT_PROVIDERS: FlightScheduleProvider[] = [
  fr24Provider,
  staffMonitorProvider,
];

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error ?? 'unknown_error');
}

export async function fetchFlightScheduleFromProviders(
  context: FlightScheduleProviderContext,
  providers = DEFAULT_PROVIDERS,
): Promise<FlightSchedulePayload> {
  const diagnostics: FlightScheduleProviderStatus[] = [];

  for (const provider of providers) {
    if (!provider.supports(context)) {
      diagnostics.push({
        provider: provider.id,
        label: provider.label,
        status: 'skipped',
        message: `Unsupported airport ${context.airportCode}`,
      });
      continue;
    }

    const startedAt = Date.now();
    try {
      const result = await provider.fetch(context);
      const durationMs = Date.now() - startedAt;
      diagnostics.push({
        provider: provider.id,
        label: provider.label,
        status: 'success',
        durationMs,
        arrivals: result.allArrivals.length,
        departures: result.allDepartures.length,
      });

      return {
        ...result,
        source: provider.id,
        sourceLabel: provider.label,
        fetchedAt: Date.now(),
        diagnostics,
      };
    } catch (error) {
      diagnostics.push({
        provider: provider.id,
        label: provider.label,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        message: errorMessage(error),
      });
      if (__DEV__) console.warn(`[flightProviders] ${provider.id} failed:`, error);
    }
  }

  const summary = diagnostics.map(item => `${item.label}: ${item.message ?? item.status}`).join(' | ');
  throw new Error(`NO_FLIGHT_PROVIDER_AVAILABLE ${summary}`);
}
