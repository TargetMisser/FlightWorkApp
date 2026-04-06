import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAirlineOps } from './airlineOps';
import { fetchAirportScheduleRaw } from './fr24api';

const NOTIF_IDS_KEY = 'aerostaff_notif_ids_v1';
const LAST_SCHEDULE_KEY = 'aerostaff_notif_last_schedule';

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
    if (!shiftEvent) return 0;

    const shiftStart = new Date(shiftEvent.startDate).getTime() / 1000;
    const shiftEnd = new Date(shiftEvent.endDate).getTime() / 1000;

    // Fetch departures and arrivals from FR24 using the selected airport
    const { departures: allDepartures, arrivals: allArrivals } = await fetchAirportScheduleRaw();

    // Filter departures during shift
    const shiftDepartures = allDepartures.filter((item: any) => {
      const ts = item.flight?.time?.scheduled?.departure;
      return ts && ts >= shiftStart && ts <= shiftEnd;
    });

    // Filter arrivals during shift (inbound aircraft that become our departures)
    const shiftArrivals = allArrivals.filter((item: any) => {
      const ts = item.flight?.time?.scheduled?.arrival;
      return ts && ts >= shiftStart && ts <= shiftEnd;
    });

    // Cancel old and schedule new
    await cancelPrevious();
    const now = Date.now() / 1000;
    let newIds: string[] = [];

    // ── PERFORMANCE OPTIMIZATION ──
    // Replaced sequential for-of loops with Promise.all and array mapping.
    // This allows all the scheduling operations (I/O) to execute concurrently.

    // ── Arrival notifications: 15 min before landing ──
    const arrivalPromises = shiftArrivals.map(async (item: any) => {
      try {
        const arrTs: number | undefined = item.flight?.time?.scheduled?.arrival;
        if (!arrTs || isNaN(arrTs)) return null;
        const secondsUntilNotify = arrTs - 15 * 60 - now;
        if (secondsUntilNotify <= 0 || isNaN(secondsUntilNotify)) return null;

        const flightNumber = item.flight?.identification?.number?.default || 'N/A';
        const airline = item.flight?.airline?.name || 'Sconosciuta';
        const origin = item.flight?.airport?.origin?.name
          || item.flight?.airport?.origin?.code?.iata || 'N/A';
        const arrivalTime = new Date(arrTs * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        return await Notifications.scheduleNotificationAsync({
          content: {
            title: `✈️ Arrivo tra 15 min — ${flightNumber}`,
            body: `${airline} da ${origin} · arrivo alle ${arrivalTime}`,
            sound: true,
            data: { flightNumber, arrTs, type: 'arrival_15min' },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsUntilNotify), repeats: false },
        });
      } catch (err) {
        console.error('Failed to schedule arrival notification:', err);
        return null;
      }
    });

    // ── Departure notifications: check-in open + gate open ──
    const departurePromises = shiftDepartures.map(async (item: any) => {
      try {
        const depTs: number | undefined = item.flight?.time?.scheduled?.departure;
        if (!depTs || isNaN(depTs)) return [];

        const airline = item.flight?.airline?.name || 'Sconosciuta';
        const flightNumber = item.flight?.identification?.number?.default || 'N/A';
        const destination = item.flight?.airport?.destination?.name
          || item.flight?.airport?.destination?.code?.iata || 'N/A';
        const depTime = new Date(depTs * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        // Get airline-specific ops times
        const ops = getAirlineOps(airline);
        const flightNotificationPromises: Promise<string | null>[] = [];

        // Notification at check-in open (e.g. 2h before departure)
        const ciOpenTs = depTs - ops.checkInOpen * 60;
        const secondsUntilCI = ciOpenTs - now;
        if (secondsUntilCI > 0 && !isNaN(secondsUntilCI)) {
          const ciTime = new Date(ciOpenTs * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          flightNotificationPromises.push(
            (async () => {
              try {
                return await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `📌 Check-in aperto — ${flightNumber}`,
                    body: `${airline} per ${destination} · partenza ${depTime} · CI dalle ${ciTime}`,
                    sound: true,
                    data: { flightNumber, depTs, type: 'checkin_open' },
                  },
                  trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsUntilCI), repeats: false },
                });
              } catch (err) {
                console.error('Failed to schedule check-in notification:', err);
                return null;
              }
            })()
          );
        }

        // Notification at gate open
        const gateOpenTs = depTs - ops.gateOpen * 60;
        const secondsUntilGate = gateOpenTs - now;
        if (secondsUntilGate > 0 && !isNaN(secondsUntilGate)) {
          const gateTime = new Date(gateOpenTs * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          flightNotificationPromises.push(
            (async () => {
              try {
                return await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `🚪 Gate aperto — ${flightNumber}`,
                    body: `${airline} per ${destination} · gate dalle ${gateTime} · partenza ${depTime}`,
                    sound: true,
                    data: { flightNumber, depTs, type: 'gate_open' },
                  },
                  trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsUntilGate), repeats: false },
                });
              } catch (err) {
                console.error('Failed to schedule gate notification:', err);
                return null;
              }
            })()
          );
        }

        return await Promise.all(flightNotificationPromises);
      } catch (err) {
        console.error('Failed to schedule departure notification:', err);
        return [];
      }
    });

    // Shift end notification promise
    let shiftEndPromise: Promise<string | null> = Promise.resolve(null);
    const secondsUntilEnd = shiftEnd - now;
    if (secondsUntilEnd > 0) {
      const endTime = new Date(shiftEnd * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      shiftEndPromise = (async () => {
        try {
          return await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Turno terminato',
              body: `Buon lavoro! Il tuo turno delle ${endTime} è concluso.`,
              sound: true,
              data: { type: 'shift_end' },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsUntilEnd), repeats: false },
          });
        } catch (err) {
          console.error('Failed to schedule shift end notification:', err);
          return null;
        }
      })();
    }

    // Await all scheduling operations concurrently
    const [arrivalResults, departureResults, shiftEndResult] = await Promise.all([
      Promise.all(arrivalPromises),
      Promise.all(departurePromises),
      shiftEndPromise
    ]);

    // Extract successful string IDs, flatten departure array of arrays, and remove nulls
    newIds = [
      ...arrivalResults.filter((id): id is string => typeof id === 'string'),
      ...departureResults.flat().filter((id): id is string => typeof id === 'string')
    ];
    if (typeof shiftEndResult === 'string') {
      newIds.push(shiftEndResult);
    }

    await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(newIds));
    await AsyncStorage.setItem(LAST_SCHEDULE_KEY, todayKey);
    return newIds.length;
  } catch (e) {
    console.error('autoScheduleNotifications error:', e);
    return 0;
  }
}
