import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import type { HexColor } from '../utils/airlineOps';
import { getAirlineOps, getAirlineColor } from '../utils/airlineOps';
import { getStoredAirportCode, buildFr24ScheduleUrl, getAirportAirlines } from '../utils/airportSettings';
import { ShiftWidget } from './ShiftWidget';

/** Key used by the main app (FlightScreen) to push pre-built widget data */
export const WIDGET_CACHE_KEY = 'widget_data_cache_v1';

/** Key used to store today's shift data so the widget can self-update */
export const WIDGET_SHIFT_KEY = 'widget_shift_v1';

// ─── Types ──────────────────────────────────────────────────────────────────────
export type WidgetFlight = {
  flightNumber: string;
  destinationIata: string;
  departureTime: string;
  ciOpen: string;
  ciClose: string;
  gateOpen: string;
  gateClose: string;
  airlineColor: HexColor;
  departureTs: number;
  isPinned?: boolean;
  stand?: string;
  checkin?: string;
  gate?: string;
};

export type WidgetData =
  | { state: 'work'; shiftLabel: string; flights: WidgetFlight[]; updatedAt: string }
  | { state: 'work_empty'; shiftLabel: string; updatedAt: string }
  | { state: 'rest' }
  | { state: 'no_shift' }
  | { state: 'error' };

export type WidgetShiftData = {
  date: string; // 'YYYY-MM-DD' — the day this shift data refers to
  shiftToday: { start: number; end: number } | null;
  isRestDay: boolean;
};

function fmtTs(ts: number): string {
  const d = new Date(ts * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Read cached data written by the main app ──────────────────────────────────
async function getWidgetData(): Promise<WidgetData> {
  try {
    const todayIso = new Date().toISOString().split('T')[0];
    const shiftRaw = await AsyncStorage.getItem(WIDGET_SHIFT_KEY);

    if (shiftRaw) {
      const shiftData: WidgetShiftData = JSON.parse(shiftRaw);
      if (shiftData.date === todayIso) {
        // Shift key is authoritative for today's work/rest classification.
        if (shiftData.isRestDay) return { state: 'rest' };
        if (!shiftData.shiftToday) return { state: 'no_shift' };

        // It's a work day — return cached flight data only if it's also a 'work' state.
        // A stale 'rest' in the cache must not override the shift key.
        const cached = await AsyncStorage.getItem(WIDGET_CACHE_KEY);
        if (cached) {
          const data: WidgetData = JSON.parse(cached);
          if (data.state === 'work' || data.state === 'work_empty') return data;
        }
        // Cache is stale or missing — show work_empty until periodic update runs.
        const { start, end } = shiftData.shiftToday;
        return { state: 'work_empty', shiftLabel: `${fmtTs(start)} – ${fmtTs(end)}`, updatedAt: '' };
      }
    }

    // Shift key is missing or from a different day — fall back to cache.
    const cached = await AsyncStorage.getItem(WIDGET_CACHE_KEY);
    if (!cached) return { state: 'error' };
    const data: WidgetData = JSON.parse(cached);
    // Rest/no_shift cached but shift key is stale → treat as no_shift.
    if (data.state === 'rest' || data.state === 'no_shift') return { state: 'no_shift' };
    return data;
  } catch {}
  return { state: 'error' };
}

// ─── Fetch fresh widget data from FR24 + cached shift key ─────────────────────
async function fetchFreshWidgetData(): Promise<WidgetData> {
  try {
    const shiftRaw = await AsyncStorage.getItem(WIDGET_SHIFT_KEY);
    if (!shiftRaw) return getWidgetData();

    const shiftData: WidgetShiftData = JSON.parse(shiftRaw);
    const todayIso = new Date().toISOString().split('T')[0];

    // Shift data is from a different day — cannot be used
    if (shiftData.date !== todayIso) return { state: 'no_shift' };
    if (shiftData.isRestDay) return { state: 'rest' };
    if (!shiftData.shiftToday) return { state: 'no_shift' };

    const shiftToday = shiftData.shiftToday;
    const airportCode = await getStoredAirportCode();
    const allAirlines = getAirportAirlines(airportCode);
    const filterRaw = await AsyncStorage.getItem('aerostaff_flight_filter_v1');
    const allowedAirlines: string[] = filterRaw ? JSON.parse(filterRaw) : allAirlines;
    const url = buildFr24ScheduleUrl(airportCode);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let allDepartures: any[] = [];
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: controller.signal });
      const json = await res.json();
      allDepartures = json.result?.response?.airport?.pluginData?.schedule?.departures?.data || [];
    } finally {
      clearTimeout(timer);
    }

    const fmtOff = (dep: number, off: number) => fmtTs(dep - off * 60);
    const nowHH = fmtTs(Date.now() / 1000);
    const shiftLabel = `${fmtTs(shiftToday.start)} – ${fmtTs(shiftToday.end)}`;

    const filteredDeps = allDepartures.filter(item =>
      allowedAirlines.some(key => (item.flight?.airline?.name || '').toLowerCase().includes(key)),
    );

    const wFlights: WidgetFlight[] = filteredDeps
      .filter(item => {
        const ts = item.flight?.time?.scheduled?.departure;
        if (ts == null) return false;
        const airline = item.flight?.airline?.name || '';
        const ops = getAirlineOps(airline);
        const ciO = ts - ops.checkInOpen * 60, ciC = ts - ops.checkInClose * 60;
        const gO = ts - ops.gateOpen * 60, gC = ts - ops.gateClose * 60;
        return (ciO <= shiftToday.end && ciC >= shiftToday.start) || (gO <= shiftToday.end && gC >= shiftToday.start);
      })
      .map(item => {
        const ts = item.flight.time.scheduled.departure;
        const airline = item.flight?.airline?.name || 'Sconosciuta';
        const ops = getAirlineOps(airline);
        const fn = item.flight?.identification?.number?.default || 'N/A';
        return {
          flightNumber: fn,
          destinationIata: item.flight?.airport?.destination?.code?.iata || '???',
          departureTs: ts,
          departureTime: fmtTs(ts),
          ciOpen: fmtOff(ts, ops.checkInOpen), ciClose: fmtOff(ts, ops.checkInClose),
          gateOpen: fmtOff(ts, ops.gateOpen), gateClose: fmtOff(ts, ops.gateClose),
          airlineColor: getAirlineColor(airline),
        };
      })
      .sort((a, b) => a.departureTs - b.departureTs);

    const freshData: WidgetData = wFlights.length === 0
      ? { state: 'work_empty', shiftLabel, updatedAt: nowHH }
      : { state: 'work', shiftLabel, flights: wFlights, updatedAt: nowHH };

    // Update the cache with fresh data
    await AsyncStorage.setItem(WIDGET_CACHE_KEY, JSON.stringify(freshData));
    return freshData;
  } catch {
    return getWidgetData();
  }
}

// ─── Task handler ───────────────────────────────────────────────────────────────
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_RESIZED': {
      const data = await getWidgetData();
      props.renderWidget(<ShiftWidget data={data} />);
      break;
    }

    case 'WIDGET_UPDATE': {
      // Fetch fresh data from FR24 + cached shift on periodic updates
      const data = await fetchFreshWidgetData();
      props.renderWidget(<ShiftWidget data={data} />);
      break;
    }

    case 'WIDGET_CLICK': {
      if (props.clickAction === 'REFRESH') {
        const data = await fetchFreshWidgetData();
        props.renderWidget(<ShiftWidget data={data} />);
      }
      break;
    }

    case 'WIDGET_DELETED':
    default:
      break;
  }
}
