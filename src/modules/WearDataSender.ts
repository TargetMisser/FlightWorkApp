import { NativeModules, Platform } from 'react-native';
import { getAirlineOps, getAirlineColor } from '../utils/airlineOps';
import type { PinnedFlightItem, WearFlightPayload } from '../types/flight';

const { WearDataSender } = NativeModules;

/**
 * Transforms a FR24 flight item (as stored in AsyncStorage) into the JSON
 * format expected by the WearOS FlightData.fromJson().
 */
function flightItemToWearJson(item: PinnedFlightItem): string {
  const tab = item._pinTab || 'departures';
  const airline = item.flight?.airline?.name || 'Sconosciuta';
  const iataCode = item.flight?.airline?.code?.iata || '';
  const ops = tab === 'departures' ? getAirlineOps(airline) : null;

  const payload: WearFlightPayload = {
    flightNumber: item.flight?.identification?.number?.default || 'N/A',
    airline,
    airlineColor: getAirlineColor(airline),
    iataCode,
    tab,
    destination:
      item.flight?.airport?.destination?.name ||
      item.flight?.airport?.destination?.code?.iata ||
      '',
    origin:
      item.flight?.airport?.origin?.name ||
      item.flight?.airport?.origin?.code?.iata ||
      '',
    scheduledTime:
      tab === 'arrivals'
        ? item.flight?.time?.scheduled?.arrival ?? 0
        : item.flight?.time?.scheduled?.departure ?? 0,
    pinnedAt: Math.floor((item._pinnedAt || Date.now()) / 1000),
  };

  // Optional times
  const est =
    tab === 'arrivals'
      ? item.flight?.time?.estimated?.arrival
      : item.flight?.time?.estimated?.departure;
  if (est) payload.estimatedTime = est;

  if (item.flight?.time?.real?.departure)
    payload.realDeparture = item.flight.time.real.departure;
  if (item.flight?.time?.real?.arrival)
    payload.realArrival = item.flight.time.real.arrival;

  // For departures: if inbound aircraft arrival is known, send it for dynamic gate open
  if (tab === 'departures' && item._inboundArrival)
    payload.inboundArrival = item._inboundArrival;

  if (ops) {
    payload.ops = {
      checkInOpen: ops.checkInOpen,
      checkInClose: ops.checkInClose,
      gateOpen: ops.gateOpen,
      gateClose: ops.gateClose,
    };
  }

  return JSON.stringify(payload);
}

export async function sendPinnedFlightToWatch(item: PinnedFlightItem): Promise<void> {
  if (Platform.OS !== 'android' || !WearDataSender) return;
  const json = flightItemToWearJson(item);
  await WearDataSender.sendPinnedFlight(json);
}

export async function clearPinnedFlightOnWatch(): Promise<void> {
  if (Platform.OS !== 'android' || !WearDataSender) return;
  await WearDataSender.clearPinnedFlight();
}

export async function startWatchOngoing(item: PinnedFlightItem, shiftEnd: number): Promise<void> {
  if (Platform.OS !== 'android' || !WearDataSender) return;
  const json = flightItemToWearJson(item);
  await WearDataSender.startWatchOngoing(json, shiftEnd);
}

export async function sendWatchAlert(title: string, body: string, type: string): Promise<void> {
  if (Platform.OS !== 'android' || !WearDataSender) return;
  await WearDataSender.sendWatchAlert(title, body, type);
}

export async function stopWatchOngoing(): Promise<void> {
  if (Platform.OS !== 'android' || !WearDataSender) return;
  await WearDataSender.stopWatchOngoing();
}
