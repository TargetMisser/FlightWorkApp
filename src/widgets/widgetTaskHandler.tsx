import React from 'react';
import * as Calendar from 'expo-calendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import type { HexColor } from '../utils/airlineOps';
import { getAirlineOps, getAirlineColor } from '../utils/airlineOps';
import { fetchAirportScheduleRaw } from '../utils/fr24api';
import { getStoredAirportCode } from '../utils/airportSettings';
import { ShiftWidget } from './ShiftWidget';

const PINNED_FLIGHT_KEY = 'pinned_flight_v1';

/** Key used by the main app (FlightScreen) to push pre-built widget data */
export const WIDGET_CACHE_KEY = 'widget_data_cache_v1';

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
};

export type WidgetData =
  | { state: 'work'; shiftLabel: string; flights: WidgetFlight[]; updatedAt: string }
  | { state: 'work_empty'; shiftLabel: string; updatedAt: string }
  | { state: 'rest' }
  | { state: 'no_shift' }
  | { state: 'error' };

// ─── Autonomous data builder — runs without FlightScreen ─────────────────────
const fmtT = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

async function buildWidgetDataFromCalendar(): Promise<WidgetData> {
  // 1. Read today's shift from calendar
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return { state: 'no_shift' };

  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const cal = cals.find(c => c.allowsModifications && c.isPrimary)
    || cals.find(c => c.allowsModifications);
  if (!cal) return { state: 'no_shift' };

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart); todayEnd.setHours(23, 59, 59, 999);
  const events = await Calendar.getEventsAsync([cal.id], todayStart, todayEnd);

  let shiftToday: { start: number; end: number } | null = null;
  let isRestDay = false;

  for (const e of events) {
    if (e.title.includes('Riposo')) { isRestDay = true; continue; }
    if (!e.title.includes('Lavoro')) continue;
    shiftToday = {
      start: new Date(e.startDate).getTime() / 1000,
      end: new Date(e.endDate).getTime() / 1000,
    };
  }

  if (isRestDay && !shiftToday) return { state: 'rest' };
  if (!shiftToday) return { state: 'no_shift' };

  // 2. Fetch flights
  const airportCode = await getStoredAirportCode();
  const { departures } = await fetchAirportScheduleRaw(airportCode);

  // 3. Build widget flights
  const shiftLabel = `${fmtT(shiftToday.start)} – ${fmtT(shiftToday.end)}`;
  const nowHH = fmtT(Date.now() / 1000);
  const fmtOff = (dep: number, off: number) => fmtT(dep - off * 60);

  let pinnedFn: string | null = null;
  try {
    const raw = await AsyncStorage.getItem(PINNED_FLIGHT_KEY);
    if (raw) pinnedFn = JSON.parse(raw).flight?.identification?.number?.default || null;
  } catch {}

  const wFlights: WidgetFlight[] = departures
    .filter(item => {
      const ts = item.flight?.time?.scheduled?.departure;
      if (ts == null) return false;
      const airline = item.flight?.airline?.name || '';
      const ops = getAirlineOps(airline);
      const ciO = ts - ops.checkInOpen * 60, ciC = ts - ops.checkInClose * 60;
      const gO = ts - ops.gateOpen * 60, gC = ts - ops.gateClose * 60;
      return (ciO <= shiftToday!.end && ciC >= shiftToday!.start)
        || (gO <= shiftToday!.end && gC >= shiftToday!.start);
    })
    .map(item => {
      const ts = item.flight?.time?.scheduled?.departure ?? 0;
      const airline = item.flight?.airline?.name || 'Sconosciuta';
      const ops = getAirlineOps(airline);
      const fn = item.flight?.identification?.number?.default || 'N/A';
      return {
        flightNumber: fn,
        destinationIata: item.flight?.airport?.destination?.code?.iata || '???',
        departureTs: ts,
        departureTime: fmtT(ts),
        ciOpen: fmtOff(ts, ops.checkInOpen), ciClose: fmtOff(ts, ops.checkInClose),
        gateOpen: fmtOff(ts, ops.gateOpen), gateClose: fmtOff(ts, ops.gateClose),
        airlineColor: getAirlineColor(airline),
        isPinned: fn === pinnedFn,
      };
    })
    .sort((a, b) => a.departureTs - b.departureTs);

  const data: WidgetData = wFlights.length === 0
    ? { state: 'work_empty', shiftLabel, updatedAt: nowHH }
    : { state: 'work', shiftLabel, flights: wFlights, updatedAt: nowHH };

  // Persist so FlightScreen can pick it up too
  await AsyncStorage.setItem(WIDGET_CACHE_KEY, JSON.stringify(data));
  return data;
}

// ─── Read cached data or build fresh ─────────────────────────────────────────
async function getWidgetData(): Promise<WidgetData> {
  try {
    return await buildWidgetDataFromCalendar();
  } catch (e) {
    // Fallback to cache if autonomous fetch fails
    try {
      const cached = await AsyncStorage.getItem(WIDGET_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return { state: 'error' };
  }
}

// ─── Task handler ───────────────────────────────────────────────────────────────
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await getWidgetData();
      props.renderWidget(<ShiftWidget data={data} />);
      break;
    }

    case 'WIDGET_CLICK': {
      if (props.clickAction === 'REFRESH') {
        const data = await getWidgetData();
        props.renderWidget(<ShiftWidget data={data} />);
      }
      break;
    }

    case 'WIDGET_DELETED':
    default:
      break;
  }
}
