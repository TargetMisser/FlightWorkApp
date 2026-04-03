import { NativeModules, Platform } from 'react-native';

const { LiveUpdate } = NativeModules;

export async function isLiveUpdateSupported(): Promise<boolean> {
  if (Platform.OS !== 'android' || !LiveUpdate) return false;
  return LiveUpdate.isSupported();
}

export function createLiveUpdateChannel(): void {
  if (Platform.OS !== 'android' || !LiveUpdate) return;
  LiveUpdate.createChannel();
}

export type LiveFlightParams = {
  flightNumber: string;
  destination: string;
  departureTime: string;
  ciOpen: string;
  ciClose: string;
  gateOpen: string;
  gateClose: string;
  progress: number; // 0-100
  shiftLabel: string;
};

export function showFlightLiveUpdate(params: LiveFlightParams): void {
  if (Platform.OS !== 'android' || !LiveUpdate) return;
  LiveUpdate.showFlight(params);
}

export function dismissLiveUpdate(): void {
  if (Platform.OS !== 'android' || !LiveUpdate) return;
  LiveUpdate.dismiss();
}
