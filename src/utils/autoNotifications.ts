import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAirlineOps } from './airlineOps';
import { fetchAirportScheduleRaw } from './fr24api';
import {
  showShiftOngoingNotification,
  dismissShiftOngoingNotification,
  syncShiftOngoingExpiry,
} from './shiftOngoingNotification';

const NOTIF_IDS_KEY = 'aerostaff_notif_ids_v1';
const LAST_SCHEDULE_KEY = 'aerostaff_notif_last_schedule';
const FLIGHT_FILTER_STORAGE_KEY = 'aerostaff_flight_filter_v1';

function normalizeAirline(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/\s+/g, ' ')
    : '';
}

function isFlightCoveredByProfile(item: any, selectedAirlines: string[]): boolean {
  if (selectedAirlines.length === 0) {
    return false;
  }

  const airlineName = normalizeAirline(item?.flight?.airline?.name);
  if (!airlineName) {
    return false;
  }

  return selectedAirlines.some(key => airlineName.includes(key));
}

function parseSelectedAirlines(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeAirline).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function cancelPrevious() {
  const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY);
  if (!raw) return;
  const ids: string[] = JSON.parse(raw);
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  await AsyncStorage.removeItem(NOTIF_IDS_KEY);
}

/**
 * Auto-schedule notifications for today's shift departures.
 * For each departure during the shift, notifies at check-in open time.
 * Called once on app startup. Skips if already scheduled today.
 */
export async function autoScheduleNotifications(): Promise<number> {
  try {
    // Dismiss ongoing shift notification if shift has ended
    await syncShiftOngoingExpiry();

    // Skip if already scheduled today
    const todayKey = new Date().toISOString().split('T')[0];
    const lastSchedule = await AsyncStorage.getItem(LAST_SCHEDULE_KEY);
    if (lastSchedule === todayKey) return 0;

    // Request notification permission
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return 0;

    // Get calendar and find today's work shift
    const { status: calStatus } = await Calendar.requestCalendarPermissionsAsync();
    if (calStatus !== 'granted') return 0;

    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const cal = cals.find(c => c.allowsModifications && c.isPrimary) || cals.find(c => c.allowsModifications);
    if (!cal) return 0;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);
    const events = await Calendar.getEventsAsync([cal.id], today, endOfDay);
    const shiftEvent = events.find(e => e.title.includes('Lavoro'));
    if (!shiftEvent) {
      await dismissShiftOngoingNotification();
      return 0;
    }

    const shiftStart = new Date(shiftEvent.startDate).getTime() / 1000;
    const shiftEnd = new Date(shiftEvent.endDate).getTime() / 1000;

    // Fetch departures and arrivals from FR24 using the selected airport
    const { departures: allDepartures, arrivals: allArrivals } = await fetchAirportScheduleRaw();

    const selectedAirlinesRaw = await AsyncStorage.getItem(FLIGHT_FILTER_STORAGE_KEY);
    const selectedAirlines = parseSelectedAirlines(selectedAirlinesRaw);

    // Filter departures during shift + selected profile airlines
    const shiftDepartures = allDepartures.filter((item: any) => {
      const ts = item.flight?.time?.scheduled?.departure;
      return ts
        && ts >= shiftStart
        && ts <= shiftEnd
        && isFlightCoveredByProfile(item, selectedAirlines);
    });

    // Filter arrivals during shift + selected profile airlines
    const shiftArrivals = allArrivals.filter((item: any) => {
      const ts = item.flight?.time?.scheduled?.arrival;
      return ts
        && ts >= shiftStart
        && ts <= shiftEnd
        && isFlightCoveredByProfile(item, selectedAirlines);
    });

    // ── Persistent ongoing shift notification ──────────────────────────────────
    const now = Date.now() / 1000;
    const shiftStartDate = new Date(shiftStart * 1000);
    const shiftEndDate   = new Date(shiftEnd   * 1000);
    const fmt = (d: Date) => d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const shiftLabel = `${fmt(shiftStartDate)}–${fmt(shiftEndDate)}`;

    if (now >= shiftStart && now <= shiftEnd) {
      const upcoming = shiftDepartures
        .filter((f: any) => (f.flight?.time?.scheduled?.departure ?? 0) > now)
        .sort((a: any, b: any) =>
          (a.flight?.time?.scheduled?.departure ?? 0) - (b.flight?.time?.scheduled?.departure ?? 0),
        );
      const next = upcoming[0];
      let flightInfo: string;
      if (next) {
        const depTs = next.flight?.time?.scheduled?.departure as number;
        const fn    = next.flight?.identification?.number?.default ?? '';
        const dest  = next.flight?.airport?.destination?.code?.iata ?? '';
        const time  = new Date(depTs * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        flightInfo  = `Prossima: ${fn} per ${dest} alle ${time} · ${shiftDepartures.length} voli oggi`;
      } else {
        flightInfo = `${shiftDepartures.length} voli · Nessuna partenza imminente`;
      }
      await showShiftOngoingNotification(shiftLabel, flightInfo, shiftEnd);
    } else if (now > shiftEnd) {
      await dismissShiftOngoingNotification();
    }
    // ───────────────────────────────────────────────────────────────────────────


    // Cancel old and schedule new
    await cancelPrevious();
    const newIds: string[] = [];

    // ── Arrival notifications: 10 min before landing ──
    for (const item of shiftArrivals) {
      try {
        const arrTs: number | undefined = item.flight?.time?.scheduled?.arrival;
        if (!arrTs || isNaN(arrTs)) continue;
        const secondsUntilNotify = arrTs - 10 * 60 - now;
        if (secondsUntilNotify <= 0 || isNaN(secondsUntilNotify)) continue;

        const flightNumber = item.flight?.identification?.number?.default || 'N/A';
        const airline = item.flight?.airline?.name || 'Sconosciuta';
        const origin = item.flight?.airport?.origin?.name
          || item.flight?.airport?.origin?.code?.iata || 'N/A';
        const arrivalTime = new Date(arrTs * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Atterraggio tra 10 min - ${flightNumber}`,
            body: `${airline} da ${origin} · arrivo alle ${arrivalTime}`,
            sound: true,
            data: { flightNumber, arrTs, type: 'arrival_10min' },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsUntilNotify), repeats: false },
        });
        newIds.push(id);
      } catch (err) {
        if (__DEV__) console.error('Failed to schedule arrival notification:', err);
      }
    }

    // ── Departure notifications: check-in/gate open-close warnings ──
    for (const item of shiftDepartures) {
      try {
        const depTs: number | undefined = item.flight?.time?.scheduled?.departure;
        if (!depTs || isNaN(depTs)) continue;

        const airline = item.flight?.airline?.name || 'Sconosciuta';
        const flightNumber = item.flight?.identification?.number?.default || 'N/A';
        const destination = item.flight?.airport?.destination?.name
          || item.flight?.airport?.destination?.code?.iata || 'N/A';
        const depTime = new Date(depTs * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        // Get airline-specific ops times
        const ops = getAirlineOps(airline);

        // Check-in open/close timestamps
        const ciOpenTs = depTs - ops.checkInOpen * 60;
        const ciCloseTs = depTs - ops.checkInClose * 60;
        const gateOpenTs = depTs - ops.gateOpen * 60;
        const gateCloseTs = depTs - ops.gateClose * 60;

        // Notification 10 min before check-in open
        const secondsUntilCIOpenWarn = ciOpenTs - 10 * 60 - now;
        if (secondsUntilCIOpenWarn > 0 && !isNaN(secondsUntilCIOpenWarn)) {
          const ciTime = new Date(ciOpenTs * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: `Check-in apre tra 10 min - ${flightNumber}`,
              body: `${airline} per ${destination} · CI apre alle ${ciTime} · partenza ${depTime}`,
              sound: true,
              data: { flightNumber, depTs, type: 'checkin_open_10min' },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsUntilCIOpenWarn), repeats: false },
          });
          newIds.push(id);
        }

        // Notification 10 min before check-in close
        const secondsUntilCICloseWarn = ciCloseTs - 10 * 60 - now;
        if (secondsUntilCICloseWarn > 0 && !isNaN(secondsUntilCICloseWarn)) {
          const ciCloseTime = new Date(ciCloseTs * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: `Check-in chiude tra 10 min - ${flightNumber}`,
              body: `${airline} per ${destination} · chiusura CI alle ${ciCloseTime} · partenza ${depTime}`,
              sound: true,
              data: { flightNumber, depTs, type: 'checkin_close_10min' },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsUntilCICloseWarn), repeats: false },
          });
          newIds.push(id);
        }

        // Notification 5 min before gate open
        const secondsUntilGateOpenWarn = gateOpenTs - 5 * 60 - now;
        if (secondsUntilGateOpenWarn > 0 && !isNaN(secondsUntilGateOpenWarn)) {
          const gateTime = new Date(gateOpenTs * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: `Gate apre tra 5 min - ${flightNumber}`,
              body: `${airline} per ${destination} · gate apre alle ${gateTime} · partenza ${depTime}`,
              sound: true,
              data: { flightNumber, depTs, type: 'gate_open_5min' },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsUntilGateOpenWarn), repeats: false },
          });
          newIds.push(id);
        }

        // Notification 5 min before gate close
        const secondsUntilGateCloseWarn = gateCloseTs - 5 * 60 - now;
        if (secondsUntilGateCloseWarn > 0 && !isNaN(secondsUntilGateCloseWarn)) {
          const gateCloseTime = new Date(gateCloseTs * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: `Gate chiude tra 5 min - ${flightNumber}`,
              body: `${airline} per ${destination} · gate chiude alle ${gateCloseTime} · partenza ${depTime}`,
              sound: true,
              data: { flightNumber, depTs, type: 'gate_close_5min' },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsUntilGateCloseWarn), repeats: false },
          });
          newIds.push(id);
        }
      } catch (err) {
        if (__DEV__) console.error('Failed to schedule departure notification:', err);
      }
    }

    // Shift end notification
    const secondsUntilEnd = shiftEnd - now;
    if (secondsUntilEnd > 0) {
      const endTime = new Date(shiftEnd * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      const endId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Turno terminato',
          body: `Buon lavoro! Il tuo turno delle ${endTime} è concluso.`,
          sound: true,
          data: { type: 'shift_end' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsUntilEnd), repeats: false },
      });
      newIds.push(endId);
    }

    await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(newIds));
    await AsyncStorage.setItem(LAST_SCHEDULE_KEY, todayKey);
    return newIds.length;
  } catch (e) {
    if (__DEV__) console.error('autoScheduleNotifications error:', e);
    return 0;
  }
}
