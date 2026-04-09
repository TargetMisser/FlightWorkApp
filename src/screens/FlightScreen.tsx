import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  FlatList, TouchableOpacity, RefreshControl, Image, Alert,
  Animated, PanResponder, NativeModules, Platform,
} from 'react-native';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { useAirport } from '../context/AirportContext';
import { getAirlineOps, getAirlineColor } from '../utils/airlineOps';
import { fetchAirportScheduleRaw, type FR24ScheduleRaw } from '../utils/fr24api';
import { formatAirportHeader } from '../utils/airportSettings';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { WIDGET_CACHE_KEY } from '../widgets/widgetTaskHandler';
import type { WidgetData, WidgetFlight } from '../widgets/widgetTaskHandler';
import { ShiftWidget } from '../widgets/ShiftWidget';

const WearDataSender = Platform.OS === 'android' ? NativeModules.WearDataSender : null;

const NOTIF_IDS_KEY = 'aerostaff_notif_ids_v1';
const NOTIF_ENABLED_KEY = 'aerostaff_notif_enabled';
const PINNED_FLIGHT_KEY = 'pinned_flight_v1';
const PINNED_NOTIF_IDS_KEY = 'pinned_notif_ids_v1';
const SHIFT_NOTIF_ID_KEY = 'aerostaff_shift_notif_id_v1';
const SHIFT_NOTIF_CHANNEL = 'turno_attivo';

// ─── In-memory flight cache ────────────────────────────────────────────────────
let _flightCache: { data: FR24ScheduleRaw; ts: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minuti

// Handler: mostra notifiche anche con app aperta (wrapped for Expo Go compat)
try { Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
}); } catch (e) { console.warn('[notifHandler]', e); }


function LogoPill({ iataCode, airlineName, color }: { iataCode: string; airlineName: string; color: string }) {
  const [err, setErr] = useState(false);
  const uri = `https://pics.avs.io/160/60/${(iataCode || '').toUpperCase()}.png`;
  const initials = airlineName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  if (iataCode && !err) {
    return (
      <View style={{ width: 52, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        <Image source={{ uri }} style={{ width: 44, height: 26 }} resizeMode="contain" onError={() => setErr(true)} />
      </View>
    );
  }
  return (
    <View style={{ width: 52, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color, fontWeight: '800', fontSize: 11 }}>{initials}</Text>
    </View>
  );
}

const SWIPE_THRESHOLD = 80;

function SwipeableFlightCard({
  children, isPinned, onToggle,
}: {
  children: React.ReactNode;
  isPinned: boolean;
  onToggle: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) translateX.setValue(g.dx);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -SWIPE_THRESHOLD) {
        Animated.timing(translateX, { toValue: -SWIPE_THRESHOLD, duration: 100, useNativeDriver: true }).start(() => {
          onToggleRef.current();
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start();
        });
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 10 }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    },
  }), []);

  return (
    <View style={{ marginBottom: 10 }}>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

// ─── Helpers notifiche ─────────────────────────────────────────────────────────
async function cancelPreviousNotifications() {
  const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY);
  if (!raw) return;
  const ids: string[] = JSON.parse(raw);
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  await AsyncStorage.removeItem(NOTIF_IDS_KEY);
}

async function scheduleShiftNotifications(
  shiftFlights: any[],
  shiftEnd: number,
): Promise<number> {
  await cancelPreviousNotifications();
  const now = Date.now() / 1000;
  const newIds: string[] = [];

  for (const item of shiftFlights) {
    const ts: number | undefined = item.flight?.time?.scheduled?.arrival;
    if (!ts) continue;
    const secondsUntilNotify = ts - 15 * 60 - now; // 15 min prima
    if (secondsUntilNotify <= 0) continue;           // già passato

    const flightNumber = item.flight?.identification?.number?.default || 'N/A';
    const airline      = item.flight?.airline?.name || 'Sconosciuta';
    const origin       = item.flight?.airport?.origin?.name
                      || item.flight?.airport?.origin?.code?.iata
                      || 'N/A';
    const arrivalTime  = new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `✈️ Arrivo tra 15 min — ${flightNumber}`,
        body: `${airline} da ${origin} · atterraggio alle ${arrivalTime}`,
        sound: true,
        data: { flightNumber, ts },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsUntilNotify), repeats: false },
    });
    newIds.push(id);
  }

  // Notifica fine turno
  const secondsUntilEnd = shiftEnd - now;
  if (secondsUntilEnd > 0) {
    const endTime = new Date(shiftEnd * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const endId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏁 Turno terminato',
        body: `Buon lavoro! Il tuo turno delle ${endTime} è concluso.`,
        sound: true,
        data: { type: 'shift_end' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsUntilEnd), repeats: false },
    });
    newIds.push(endId);
  }

  await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(newIds));
  return newIds.length;
}

async function cancelPinnedNotifications() {
  const raw = await AsyncStorage.getItem(PINNED_NOTIF_IDS_KEY);
  if (!raw) return;
  const ids: string[] = JSON.parse(raw);
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  await AsyncStorage.removeItem(PINNED_NOTIF_IDS_KEY);
}

async function schedulePinnedNotifications(item: any, tab: 'arrivals' | 'departures'): Promise<void> {
  await cancelPinnedNotifications();
  const now = Date.now() / 1000;
  const ids: string[] = [];

  const flightNumber = item.flight?.identification?.number?.default || 'N/A';
  const airline = item.flight?.airline?.name || 'Sconosciuta';

  if (tab === 'arrivals') {
    const ts = item.flight?.time?.scheduled?.arrival;
    if (!ts) return;
    const origin = item.flight?.airport?.origin?.name || item.flight?.airport?.origin?.code?.iata || 'N/A';
    const arrTime = new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const secsUntil = ts - 15 * 60 - now;
    if (secsUntil > 0) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📌 Arrivo tra 15 min — ${flightNumber}`,
          body: `${airline} da ${origin} · atterraggio alle ${arrTime}`,
          sound: true,
          data: { flightNumber, ts, pinned: true },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secsUntil), repeats: false },
      });
      ids.push(id);
    }
  } else {
    const ts = item.flight?.time?.scheduled?.departure;
    if (!ts) return;
    const dest = item.flight?.airport?.destination?.name || item.flight?.airport?.destination?.code?.iata || 'N/A';
    const depTime = new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const ops = getAirlineOps(airline);

    const phases: Array<{ offset: number; title: string; body: string }> = [
      { offset: ops.checkInOpen, title: `📌 Check-in aperto — ${flightNumber}`, body: `Check-in aperto per il volo delle ${depTime} → ${dest}` },
      { offset: ops.gateOpen, title: `📌 Gate aperto — ${flightNumber}`, body: `Gate aperto per il volo delle ${depTime} → ${dest}` },
      { offset: ops.gateClose, title: `📌 Chiusura gate — ${flightNumber}`, body: `Gate in chiusura per il volo delle ${depTime} → ${dest}` },
      { offset: 10, title: `📌 Partenza tra 10 min — ${flightNumber}`, body: `${airline} → ${dest} · partenza alle ${depTime}` },
    ];

    for (const phase of phases) {
      const secsUntil = ts - phase.offset * 60 - now;
      if (secsUntil <= 0) continue;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: phase.title,
          body: phase.body,
          sound: true,
          data: { flightNumber, ts, pinned: true },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secsUntil), repeats: false },
      });
      ids.push(id);
    }
  }

  if (ids.length > 0) {
    await AsyncStorage.setItem(PINNED_NOTIF_IDS_KEY, JSON.stringify(ids));
  }
}

// ─── Notifica persistente turno ───────────────────────────────────────────────
async function setupShiftNotifChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(SHIFT_NOTIF_CHANNEL, {
      name: 'Turno in corso',
      importance: Notifications.AndroidImportance.LOW, // no pop-up, no suono
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: null,
      vibrationPattern: [0],
      enableLights: false,
      showBadge: false,
    });
  } catch {}
}

async function cancelShiftNotification() {
  const id = await AsyncStorage.getItem(SHIFT_NOTIF_ID_KEY);
  if (!id) return;
  await Promise.all([
    Notifications.dismissNotificationAsync(id).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
  ]);
  await AsyncStorage.removeItem(SHIFT_NOTIF_ID_KEY);
}

async function showShiftNotification(
  shift: { start: number; end: number },
  nextFlightLabel: string | null,
) {
  await cancelShiftNotification();
  const fmtT = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `✈️ Turno in corso: ${fmtT(shift.start)} – ${fmtT(shift.end)}`,
      body: nextFlightLabel ?? 'Nessun volo imminente nel turno',
      sticky: true,
      sound: false,
      data: { type: 'shift_active' },
      android: {
        channelId: SHIFT_NOTIF_CHANNEL,
        ongoing: true,
        color: '#2563EB',
        smallIcon: 'ic_notification',
      } as any,
    },
    trigger: null,
  });
  await AsyncStorage.setItem(SHIFT_NOTIF_ID_KEY, id);
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function FlightScreen() {
  const { colors } = useAppTheme();
  const { airport, airportCode, isLoading: airportLoading } = useAirport();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'arrivals' | 'departures'>('departures');
  const [activeDay, setActiveDay] = useState<'today' | 'tomorrow'>('today');
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [departures, setDepartures] = useState<any[]>([]);
  const [shifts, setShifts] = useState<{ today: { start: number; end: number } | null; tomorrow: { start: number; end: number } | null }>({ today: null, tomorrow: null });
  const [notifsEnabled, setNotifsEnabled] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [pinnedFlightId, setPinnedFlightId] = useState<string | null>(null);
  const [inboundArrivals, setInboundArrivals] = useState<Record<string, number>>({});

  // Carica preferenza notifiche salvata
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_ENABLED_KEY).then(v => setNotifsEnabled(v === 'true'));
  }, []);

  const fetchAll = useCallback(async () => {
    if (airportLoading) return;

    try {
      // 1. Voli: usa cache in-memory se fresca (< 2 min), altrimenti fetch
      const now = Date.now();
      let rawResult: FR24ScheduleRaw;
      if (_flightCache && (now - _flightCache.ts) < CACHE_TTL_MS) {
        rawResult = _flightCache.data;
      } else {
        rawResult = await fetchAirportScheduleRaw(airportCode);
        _flightCache = { data: rawResult, ts: now };
      }

      const { allArrivals, departures: fetchedDepartures, arrivals: fetchedArrivals } = rawResult;

      // Build inbound arrival map
      const inboundMap: Record<string, number> = {};
      for (const a of allArrivals) {
        const reg = a.flight?.aircraft?.registration;
        if (!reg) continue;
        const t = a.flight?.time?.real?.arrival
               || a.flight?.time?.estimated?.arrival
               || a.flight?.time?.scheduled?.arrival;
        if (t) inboundMap[reg] = t;
      }
      setInboundArrivals(inboundMap);
      setArrivals(fetchedArrivals);
      setDepartures(fetchedDepartures);

      // 2. Pinned check + calendario IN PARALLELO
      const [pinnedRaw, calResult] = await Promise.all([
        AsyncStorage.getItem(PINNED_FLIGHT_KEY),
        (async () => {
          let shiftToday: { start: number; end: number } | null = null;
          let shiftTomorrow: { start: number; end: number } | null = null;
          let isRestDay = false;
          const { status } = await Calendar.requestCalendarPermissionsAsync();
          if (status === 'granted') {
            const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            const cal = cals.find(c => c.allowsModifications && c.isPrimary) || cals.find(c => c.allowsModifications);
            if (cal) {
              const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
              const tomorrowEnd = new Date(todayStart); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1); tomorrowEnd.setHours(23, 59, 59, 999);
              const evts = await Calendar.getEventsAsync([cal.id], todayStart, tomorrowEnd);
              const todayEnd = new Date(todayStart); todayEnd.setHours(23, 59, 59, 999);
              const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
              for (const e of evts) {
                if (e.title.includes('Riposo')) {
                  const evtDay = new Date(e.startDate);
                  if (evtDay >= todayStart && evtDay <= todayEnd) isRestDay = true;
                  continue;
                }
                if (!e.title.includes('Lavoro')) continue;
                const s = new Date(e.startDate).getTime() / 1000;
                const en = new Date(e.endDate).getTime() / 1000;
                const evtDay = new Date(e.startDate);
                if (evtDay >= todayStart && evtDay <= todayEnd) shiftToday = { start: s, end: en };
                else if (evtDay >= tomorrowStart && evtDay <= tomorrowEnd) shiftTomorrow = { start: s, end: en };
              }
            }
          }
          return { shiftToday, shiftTomorrow, isRestDay };
        })(),
      ]);

      // 3. Processa pinned
      if (pinnedRaw) {
        try {
          const pinned = JSON.parse(pinnedRaw);
          const pinTab = pinned._pinTab || 'departures';
          const pinTs = pinTab === 'arrivals'
            ? pinned.flight?.time?.scheduled?.arrival
            : pinned.flight?.time?.scheduled?.departure;
          const pinId = pinned.flight?.identification?.number?.default;
          const pool = pinTab === 'arrivals' ? fetchedArrivals : fetchedDepartures;
          const stillPresent = !!pinId && pool.some(item => item.flight?.identification?.number?.default === pinId);
          if ((pinTs && pinTs < Date.now() / 1000) || !stillPresent) {
            await AsyncStorage.removeItem(PINNED_FLIGHT_KEY);
            await cancelPinnedNotifications();
            setPinnedFlightId(null);
          }
        } catch {}
      }

      // 4. Turni
      const { shiftToday, shiftTomorrow, isRestDay } = calResult;
      setShifts({ today: shiftToday, tomorrow: shiftTomorrow });

      // 5. Widget cache (fire-and-forget)
      ;(async () => {
        try {
          const fmtT = (ts: number) => new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          const fmtOff = (dep: number, off: number) => fmtT(dep - off * 60);
          const nowHH = fmtT(Date.now() / 1000);
          let widgetData: WidgetData;
          if (isRestDay) {
            widgetData = { state: 'rest' };
          } else if (!shiftToday) {
            widgetData = { state: 'no_shift' };
          } else {
            const shiftLabel = `${fmtT(shiftToday.start)} – ${fmtT(shiftToday.end)}`;
            const pinnedRawW = await AsyncStorage.getItem(PINNED_FLIGHT_KEY);
            let pinnedFn: string | null = null;
            if (pinnedRawW) {
              try { pinnedFn = JSON.parse(pinnedRawW).flight?.identification?.number?.default || null; } catch {}
            }
            const wFlights: WidgetFlight[] = fetchedDepartures
              .filter(item => {
                const ts = item.flight?.time?.scheduled?.departure;
                if (ts == null) return false;
                const airline = item.flight?.airline?.name || '';
                const ops = getAirlineOps(airline);
                const ciO = ts - ops.checkInOpen * 60, ciC = ts - ops.checkInClose * 60;
                const gO = ts - ops.gateOpen * 60, gC = ts - ops.gateClose * 60;
                return (ciO <= shiftToday!.end && ciC >= shiftToday!.start) || (gO <= shiftToday!.end && gC >= shiftToday!.start);
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
                  departureTime: fmtT(ts),
                  ciOpen: fmtOff(ts, ops.checkInOpen), ciClose: fmtOff(ts, ops.checkInClose),
                  gateOpen: fmtOff(ts, ops.gateOpen), gateClose: fmtOff(ts, ops.gateClose),
                  airlineColor: getAirlineColor(airline),
                  isPinned: fn === pinnedFn,
                };
              })
              .sort((a, b) => a.departureTs - b.departureTs);
            widgetData = wFlights.length === 0
              ? { state: 'work_empty', shiftLabel, updatedAt: nowHH }
              : { state: 'work', shiftLabel, flights: wFlights, updatedAt: nowHH };
          }
          await AsyncStorage.setItem(WIDGET_CACHE_KEY, JSON.stringify(widgetData));
          if (Platform.OS === 'android') {
            requestWidgetUpdate({ widgetName: 'ShiftFlights', renderWidget: () => (<ShiftWidget data={widgetData} />) as any }).catch(() => {});
          }
        } catch {}
      })();

      // 6. Notifiche fire-and-forget — non blocca lo spinner
      ;(async () => {
        try {
          const enabled = (await AsyncStorage.getItem(NOTIF_ENABLED_KEY)) === 'true';
          const now = Date.now() / 1000;
          if (enabled && shiftToday && now >= shiftToday.start && now <= shiftToday.end) {
            // Notifiche temporizzate (arrivi + fine turno)
            const shiftFlights = fetchedArrivals.filter(item => {
              const ts = item.flight?.time?.scheduled?.arrival;
              return ts && ts >= shiftToday!.start && ts <= shiftToday!.end;
            });
            const count = await scheduleShiftNotifications(shiftFlights, shiftToday!.end);
            setScheduledCount(count);
            // Notifica persistente: prossimo volo in arrivo nel turno
            const nextArrival = fetchedArrivals
              .filter(item => {
                const ts = item.flight?.time?.scheduled?.arrival;
                return ts && ts > now && ts >= shiftToday!.start && ts <= shiftToday!.end;
              })
              .sort((a, b) => (a.flight?.time?.scheduled?.arrival ?? 0) - (b.flight?.time?.scheduled?.arrival ?? 0))[0];
            const fmtT2 = (ts: number) => new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const nextLabel = nextArrival
              ? `Prossimo arrivo: ${nextArrival.flight?.identification?.number?.default ?? 'N/A'} alle ${fmtT2(nextArrival.flight.time.scheduled.arrival)}`
              : 'Nessun arrivo imminente';
            await showShiftNotification(shiftToday!, nextLabel);
          } else {
            await cancelPreviousNotifications();
            await cancelShiftNotification();
            setScheduledCount(0);
          }
        } catch {}
      })();

    } catch (e) { console.error('[fetchAll]', e); } finally { setLoading(false); setRefreshing(false); }
  }, [airportCode, airportLoading]);

  useEffect(() => {
    if (airportLoading) return;
    setLoading(true);
    fetchAll();
  }, [airportLoading, fetchAll]);

  useEffect(() => {
    AsyncStorage.getItem(PINNED_FLIGHT_KEY).then(raw => {
      if (!raw) return;
      try {
        const pinned = JSON.parse(raw);
        const id = pinned.flight?.identification?.number?.default;
        if (id) setPinnedFlightId(id);
      } catch {}
    });
    // Crea il canale notifiche persistenti all'avvio
    setupShiftNotifChannel();
  }, []);

  // Toggle notifiche
  const toggleNotifications = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso negato', 'Abilita le notifiche nelle impostazioni del telefono per usare questa funzione.');
      return;
    }
    const next = !notifsEnabled;
    setNotifsEnabled(next);
    await AsyncStorage.setItem(NOTIF_ENABLED_KEY, String(next));

    if (!next) {
      await cancelPreviousNotifications();
      await cancelShiftNotification();
      setScheduledCount(0);
      return;
    }

    // Schedula subito con i dati già caricati (turno di oggi)
    const now = Date.now() / 1000;
    if (shifts.today && now >= shifts.today.start && now <= shifts.today.end) {
      const shiftFlights = arrivals.filter(item => {
        const ts = item.flight?.time?.scheduled?.arrival;
        return ts && ts >= shifts.today!.start && ts <= shifts.today!.end;
      });
      const count = await scheduleShiftNotifications(shiftFlights, shifts.today!.end);
      setScheduledCount(count);
      // Mostra notifica persistente
      const nextArrival = arrivals
        .filter(item => {
          const ts = item.flight?.time?.scheduled?.arrival;
          return ts && ts > now && ts >= shifts.today!.start && ts <= shifts.today!.end;
        })
        .sort((a, b) => (a.flight?.time?.scheduled?.arrival ?? 0) - (b.flight?.time?.scheduled?.arrival ?? 0))[0];
      const fmtT = (ts: number) => new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      const nextLabel = nextArrival
        ? `Prossimo arrivo: ${nextArrival.flight?.identification?.number?.default ?? 'N/A'} alle ${fmtT(nextArrival.flight.time.scheduled.arrival)}`
        : 'Nessun arrivo imminente';
      await showShiftNotification(shifts.today!, nextLabel);
      Alert.alert(
        'Notifiche attivate',
        count > 0
          ? `Programmate ${count} notifiche + notifica turno in alto.`
          : 'Notifica turno attiva. Nessun volo futuro trovato.',
      );
    } else if (shifts.today) {
      Alert.alert('Turno non in corso', 'Le notifiche si attiveranno automaticamente all\'inizio del turno.');
    } else {
      Alert.alert('Nessun turno trovato', 'Non ho trovato un turno "Lavoro" per oggi nel calendario.');
      setNotifsEnabled(false);
      await AsyncStorage.setItem(NOTIF_ENABLED_KEY, 'false');
    }
  }, [notifsEnabled, shifts, arrivals]);

  const pinFlight = useCallback(async (item: any) => {
    try {
      const id = item.flight?.identification?.number?.default;
      if (!id) return;
      const tab = activeTab;
      await AsyncStorage.setItem(PINNED_FLIGHT_KEY, JSON.stringify({ ...item, _pinTab: tab, _pinnedAt: Date.now() }));
      setPinnedFlightId(id);
      try { await schedulePinnedNotifications(item, tab); } catch (e) { console.warn('[pinnedNotif]', e); }
      // Send to watch
      if (WearDataSender) {
        const payload = JSON.stringify({
          flightNumber: item.flight?.identification?.number?.default || '',
          airline: item.flight?.airline?.name || '',
          airlineColor: getAirlineColor(item.flight?.airline?.name || ''),
          iataCode: item.flight?.airline?.code?.iata || '',
          tab,
          destination: item.flight?.airport?.destination?.name || item.flight?.airport?.destination?.code?.iata || '',
          origin: item.flight?.airport?.origin?.name || item.flight?.airport?.origin?.code?.iata || '',
          scheduledTime: tab === 'departures' ? item.flight?.time?.scheduled?.departure : item.flight?.time?.scheduled?.arrival,
          estimatedTime: tab === 'departures' ? item.flight?.time?.estimated?.departure : item.flight?.time?.estimated?.arrival,
          realDeparture: item.flight?.time?.real?.departure || null,
          realArrival: item.flight?.time?.real?.arrival || null,
          ops: tab === 'departures' ? getAirlineOps(item.flight?.airline?.name || '') : null,
          inboundArrival: tab === 'departures' && item.flight?.aircraft?.registration ? inboundArrivals[item.flight.aircraft.registration] || null : null,
          pinnedAt: Math.floor(Date.now() / 1000),
        });
        WearDataSender.sendPinnedFlight(payload);
      }
    } catch {}
  }, [activeTab, inboundArrivals]);

  const unpinFlight = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(PINNED_FLIGHT_KEY);
      try { await cancelPinnedNotifications(); } catch (e) { console.warn('[cancelPinNotif]', e); }
      setPinnedFlightId(null);
      if (WearDataSender) WearDataSender.clearPinnedFlight();
    } catch (e) { console.error('[unpin]', e); }
  }, []);

  const userShift = activeDay === 'today' ? shifts.today : shifts.tomorrow;
  const selectedDate = activeDay === 'today' ? new Date() : (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })();
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  const currentData = (activeTab === 'arrivals' ? arrivals : departures).filter(item => {
    const ts = activeTab === 'arrivals' ? item.flight?.time?.scheduled?.arrival : item.flight?.time?.scheduled?.departure;
    return ts && isSameDay(new Date(ts * 1000), selectedDate);
  });

  const renderFlight = useCallback(({ item }: { item: any }) => {
    const flightNumber = item.flight?.identification?.number?.default || 'N/A';
    const airline = item.flight?.airline?.name || 'Sconosciuta';
    const iataCode = item.flight?.airline?.code?.iata || '';
    const statusText = item.flight?.status?.text || 'Scheduled';
    const raw = item.flight?.status?.generic?.status?.color || 'gray';
    const statusColor = raw === 'green' ? '#10b981' : raw === 'red' ? '#ef4444' : raw === 'yellow' ? '#f59e0b' : '#6b7280';
    const originDest = activeTab === 'arrivals'
      ? (item.flight?.airport?.origin?.name || item.flight?.airport?.origin?.code?.iata || 'N/A')
      : (item.flight?.airport?.destination?.name || item.flight?.airport?.destination?.code?.iata || 'N/A');
    const ts = activeTab === 'arrivals' ? item.flight?.time?.scheduled?.arrival : item.flight?.time?.scheduled?.departure;
    const time = ts ? new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
    const duringShift = userShift && ts && (() => {
      if (activeTab === 'arrivals') return ts >= userShift.start && ts <= userShift.end;
      // Departures: CI or Gate window overlaps with shift (even 1 min)
      const opsData = getAirlineOps(airline);
      const ciOpen = ts - opsData.checkInOpen * 60;
      const ciClose = ts - opsData.checkInClose * 60;
      const gOpen = ts - opsData.gateOpen * 60;
      const gClose = ts - opsData.gateClose * 60;
      const ciOverlap = ciOpen <= userShift.end && ciClose >= userShift.start;
      const gateOverlap = gOpen <= userShift.end && gClose >= userShift.start;
      return ciOverlap || gateOverlap;
    })();
    const color = getAirlineColor(airline);
    // ops is null when ts is falsy — fmt is only called when ops is truthy
    const ops = activeTab === 'departures' && ts ? getAirlineOps(airline) : null;
    const fmt = (offsetMin: number) =>
      ts ? new Date((ts - offsetMin * 60) * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
    const fmtTs = (t: number) =>
      new Date(t * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    // Gate open = inbound aircraft arrival time (if available)
    const reg = item.flight?.aircraft?.registration;
    const inboundTs = reg ? inboundArrivals[reg] : undefined;
    const gateOpenFromInbound = activeTab === 'departures' && ts && inboundTs ? inboundTs : undefined;

    const flightId = item.flight?.identification?.number?.default || null;
    const isPinned = flightId !== null && flightId === pinnedFlightId;

    return (
      <SwipeableFlightCard
        isPinned={isPinned}
        onToggle={() => isPinned ? unpinFlight() : pinFlight(item)}
      >
        <View style={[s.card, isPinned && s.cardPinned, { marginBottom: 0 }]}>
          {isPinned && <View style={s.pinBanner}><Text style={s.pinBannerText}>PINNATO</Text></View>}
          {/* Header */}
          <View style={[s.cardHeader, { backgroundColor: color }]}>
            <View style={s.headerLeft}>
              <LogoPill iataCode={iataCode} airlineName={airline} color={color} />
              <View>
                <Text style={s.headerFlightNum}>{flightNumber}</Text>
                <Text style={s.headerAirlineName}>{airline}</Text>
              </View>
            </View>
            <View>
              <Text style={s.headerTime}>{time}</Text>
              <Text style={s.headerDest}>{originDest}</Text>
            </View>
          </View>
        {/* Body */}
        <View style={s.cardBody}>
          {activeTab === 'departures' && ops ? (
            <View style={s.opsRow}>
              <View style={s.opsBadge}>
                <MaterialIcons name="desktop-windows" size={16} color={colors.primary} />
                <View>
                  <Text style={s.opsLabel}>Check-in</Text>
                  <Text style={s.opsTime}>{fmt(ops.checkInOpen)} – {fmt(ops.checkInClose)}</Text>
                </View>
              </View>
              <View style={s.opsBadge}>
                <MaterialIcons name="meeting-room" size={16} color={colors.primary} />
                <View>
                  <Text style={s.opsLabel}>Gate</Text>
                  <Text style={s.opsTime}>
                    {gateOpenFromInbound ? fmtTs(gateOpenFromInbound) : fmt(ops.gateOpen)} – {fmt(ops.gateClose)}
                  </Text>
                </View>
              </View>
            </View>
          ) : activeTab === 'arrivals' && ts ? (() => {
            const realDep = item.flight?.time?.real?.departure;
            const realArr = item.flight?.time?.real?.arrival;
            const estArr = item.flight?.time?.estimated?.arrival;
            const bestArr = realArr || estArr || ts;
            const delayMin = Math.round((bestArr - ts) / 60);
            const landed = !!realArr;
            const departed = !!realDep;

            // Color logic for landing badge
            const landColor = landed ? '#10B981'
              : delayMin > 20 ? '#EF4444'
              : delayMin > 5 ? '#F59E0B'
              : colors.primary;
            const landLabel = landed ? 'Atterrato' : 'Stimato';

            // Delay pill
            const delayText = landed ? 'Atterrato'
              : delayMin > 0 ? `+${delayMin} min`
              : 'In orario';
            const delayColor = landed ? '#10B981'
              : delayMin > 20 ? '#EF4444'
              : delayMin > 5 ? '#F59E0B'
              : '#10B981';

            return (
              <View style={s.opsRow}>
                <View style={s.opsBadge}>
                  <MaterialIcons name="flight-takeoff" size={16} color={departed ? colors.primary : '#6B7280'} />
                  <View>
                    <Text style={s.opsLabel}>Partito</Text>
                    <Text style={[s.opsTime, !departed && { color: '#6B7280' }]}>
                      {departed ? fmtTs(realDep) : '--:--'}
                    </Text>
                  </View>
                </View>
                <View style={s.opsBadge}>
                  <MaterialIcons name="flight-land" size={16} color={landColor} />
                  <View>
                    <Text style={[s.opsLabel, { color: landColor }]}>{landLabel}</Text>
                    <Text style={[s.opsTime, { color: landColor }]}>{fmtTs(bestArr)}</Text>
                  </View>
                </View>
              </View>
            );
          })() : (
            <Text style={s.bodyInfo}>{`Da: ${originDest}`}</Text>
          )}
          {activeTab === 'arrivals' && ts ? (() => {
            const rArr = item.flight?.time?.real?.arrival;
            const eArr = item.flight?.time?.estimated?.arrival;
            const bArr = rArr || eArr || ts;
            const dMin = Math.round((bArr - ts) / 60);
            const isLanded = !!rArr;
            const dText = isLanded ? 'Atterrato' : dMin > 0 ? `+${dMin} min` : 'In orario';
            const dColor = isLanded ? '#10B981' : dMin > 20 ? '#EF4444' : dMin > 5 ? '#F59E0B' : '#10B981';
            return (
              <View style={[s.statusPill, { backgroundColor: dColor + '22' }]}>
                <Text style={[s.statusText, { color: dColor }]}>{dText}</Text>
              </View>
            );
          })() : (
            <View style={[s.statusPill, { backgroundColor: statusColor + '22' }]}>
              <Text style={[s.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          )}
        </View>
      </View>
      </SwipeableFlightCard>
    );
  }, [activeTab, userShift, s, pinnedFlightId, pinFlight, unpinFlight, inboundArrivals, colors]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Page header */}
      <View style={s.pageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>Voli in tempo reale</Text>
          <Text style={s.pageSub}>{formatAirportHeader(airport.code)}</Text>
        </View>
        <TouchableOpacity
          style={[s.notifBtn, notifsEnabled && s.notifBtnActive]}
          onPress={toggleNotifications}
          activeOpacity={0.8}
          accessible
          accessibilityLabel={notifsEnabled ? 'Disattiva notifiche voli' : 'Attiva notifiche voli'}
          accessibilityRole="button"
        >
          <MaterialIcons
            name={notifsEnabled ? 'notifications-active' : 'notifications-none'}
            size={20}
            color={notifsEnabled ? '#fff' : '#64748B'}
          />
          {notifsEnabled && scheduledCount > 0 && (
            <View style={s.notifBadge}>
              <Text style={s.notifBadgeTxt}>{scheduledCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Dual segmented controls */}
      <View style={s.controlsRow}>
        {/* Arrivi / Partenze */}
        <View style={s.segment}>
          {(['arrivals', 'departures'] as const).map(t => (
            <TouchableOpacity key={t} style={[s.segBtn, activeTab === t && s.segBtnActive]} onPress={() => setActiveTab(t)}>
              <Text style={[s.segBtnText, activeTab === t && s.segBtnTextActive]}>{t === 'arrivals' ? 'Arrivi' : 'Partenze'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Oggi / Domani */}
        <View style={s.segment}>
          {(['today', 'tomorrow'] as const).map(d => (
            <TouchableOpacity key={d} style={[s.segBtn, activeDay === d && s.segBtnActive]} onPress={() => setActiveDay(d)}>
              <Text style={[s.segBtnText, activeDay === d && s.segBtnTextActive]}>{d === 'today' ? 'Oggi' : 'Domani'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item, i) => item.flight?.identification?.id || String(i)}
          renderItem={renderFlight}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 15 }}>Nessun volo per questo giorno.</Text>}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function makeStyles(c: any) {
  return StyleSheet.create({
    pageHeader: { backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: 'row', alignItems: 'center' },
    notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.cardSecondary, justifyContent: 'center', alignItems: 'center' },
    notifBtnActive: { backgroundColor: c.primary, shadowColor: c.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 5 },
    notifBadge: { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: c.card },
    notifBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: c.primaryDark },
    pageSub: { fontSize: 13, color: c.textSub, marginTop: 2 },
    controlsRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
    segment: { flex: 1, flexDirection: 'row', backgroundColor: c.bg, borderRadius: 8, padding: 3 },
    segBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 6 },
    segBtnActive: { backgroundColor: c.card, borderWidth: 1, borderColor: c.primaryLight },
    segBtnText: { fontSize: 12, fontWeight: '500', color: c.textSub },
    segBtnTextActive: { color: c.primary, fontWeight: '700' },
    card: { backgroundColor: c.card, borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOpacity: c.isDark ? 0 : 0.06, shadowRadius: 8, elevation: c.isDark ? 0 : 3, borderWidth: c.isDark ? 1 : 0, borderColor: c.border },
    cardShift: { borderWidth: 1.5, borderColor: '#F59E0B' },
    shiftBanner: { backgroundColor: '#F59E0B', paddingVertical: 5, paddingHorizontal: 12 },
    shiftBannerText: { color: '#fff', fontWeight: 'bold', fontSize: 11, letterSpacing: 0.5 },
    cardPinned: { borderWidth: 2, borderColor: '#F59E0B' },
    pinBanner: { backgroundColor: '#F59E0B', paddingVertical: 5, paddingHorizontal: 12 },
    pinBannerText: { color: '#fff', fontWeight: 'bold', fontSize: 11, letterSpacing: 0.5 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 5 },
    statusText: { fontSize: 10, fontWeight: '700' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerFlightNum: { color: '#fff', fontWeight: '900', fontSize: 15, lineHeight: 18 },
    headerAirlineName: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
    headerTime: { color: '#fff', fontWeight: '900', fontSize: 18, lineHeight: 20, textAlign: 'right' },
    headerDest: { color: 'rgba(255,255,255,0.8)', fontSize: 10, textAlign: 'right' },
    cardBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: c.card },
    bodyInfo: { flex: 1, fontSize: 11, color: c.textSub },
    bodyTime: { fontWeight: '700', color: c.text },
    opsRow: { flex: 1, flexDirection: 'row', gap: 8 },
    opsBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
    opsIcon: { fontSize: 16 },
    opsLabel: { fontSize: 10, fontWeight: '600', color: c.textSub, letterSpacing: 0.5 },
    opsTime: { fontSize: 13, fontWeight: '800', color: c.primaryDark },
    pinBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    pinBtnActive: { backgroundColor: 'rgba(245,158,11,0.25)' },
  });
}
