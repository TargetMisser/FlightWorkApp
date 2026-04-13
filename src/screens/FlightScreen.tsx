import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Modal,
  FlatList, TouchableOpacity, RefreshControl, Image, Alert,
  Animated, PanResponder, NativeModules, Platform,
} from 'react-native';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../context/ThemeContext';
import { useAirport } from '../context/AirportContext';
import { getAirlineOps, getAirlineColor } from '../utils/airlineOps';
import { fetchAirportScheduleRaw } from '../utils/fr24api';
import { fetchStaffMonitorData, normalizeFlightNumber, type StaffMonitorFlight } from '../utils/staffMonitor';
import { formatAirportHeader } from '../utils/airportSettings';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { WIDGET_CACHE_KEY } from '../widgets/widgetTaskHandler';
import type { WidgetData, WidgetFlight } from '../widgets/widgetTaskHandler';
import { ShiftWidget } from '../widgets/ShiftWidget';
import { useLanguage } from '../context/LanguageContext';

const WearDataSender = Platform.OS === 'android' ? NativeModules.WearDataSender : null;

const NOTIF_IDS_KEY = 'aerostaff_notif_ids_v1';
const NOTIF_ENABLED_KEY = 'aerostaff_notif_enabled';
const PINNED_FLIGHT_KEY = 'pinned_flight_v1';
const PINNED_NOTIF_IDS_KEY = 'pinned_notif_ids_v1';
const FLIGHT_FILTER_KEY = 'aerostaff_flight_filter_v1';

// Handler: mostra notifiche anche con app aperta (wrapped for Expo Go compat)
try { Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
}); } catch (e) { if (__DEV__) console.warn('[notifHandler]', e); }


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

function SwipeableFlightCardComponent({
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

// Performance optimization: memoize flatlist item to prevent unnecessary re-renders
const SwipeableFlightCard = React.memo(SwipeableFlightCardComponent);

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
  locale: string,
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
    const arrivalTime  = new Date(ts * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

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
    const endTime = new Date(shiftEnd * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
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

async function schedulePinnedNotifications(item: any, tab: 'arrivals' | 'departures', locale: string): Promise<void> {
  await cancelPinnedNotifications();
  const now = Date.now() / 1000;
  const ids: string[] = [];

  const flightNumber = item.flight?.identification?.number?.default || 'N/A';
  const airline = item.flight?.airline?.name || 'Sconosciuta';

  if (tab === 'arrivals') {
    const ts = item.flight?.time?.scheduled?.arrival;
    if (!ts) return;
    const origin = item.flight?.airport?.origin?.name || item.flight?.airport?.origin?.code?.iata || 'N/A';
    const arrTime = new Date(ts * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
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
    const depTime = new Date(ts * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
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

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function FlightScreen() {
  const { colors } = useAppTheme();
  const { t, locale } = useLanguage();
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
  const [filterMode, setFilterMode] = useState<'mine' | 'all'>('mine');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [allArrivalsFull, setAllArrivalsFull] = useState<any[]>([]);
  const [allDeparturesFull, setAllDeparturesFull] = useState<any[]>([]);
  const [staffMonitorDeps, setStaffMonitorDeps] = useState<StaffMonitorFlight[]>([]);
  const [staffMonitorArrs, setStaffMonitorArrs] = useState<StaffMonitorFlight[]>([]);

  // Carica preferenza notifiche salvata
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_ENABLED_KEY).then(v => setNotifsEnabled(v === 'true'));
    AsyncStorage.getItem(FLIGHT_FILTER_KEY).then(v => { if (v === 'all' || v === 'mine') setFilterMode(v); });
  }, []);

  const fetchAll = useCallback(async () => {
    if (airportLoading) return;

    try {
      const {
        allArrivals,
        allDepartures,
        departures: fetchedDepartures,
        arrivals: fetchedArrivals,
      } = await fetchAirportScheduleRaw(airportCode);
      setAllArrivalsFull(allArrivals);
      setAllDeparturesFull(allDepartures);

      // Build inbound arrival map: registration → best known arrival timestamp
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

      // Auto-clear expired pinned flight or stale data from another airport
      const pinnedRaw = await AsyncStorage.getItem(PINNED_FLIGHT_KEY);
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

      // Shift (today + tomorrow)
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
      setShifts({ today: shiftToday, tomorrow: shiftTomorrow });

      // ── Push data to widget cache ──
      try {
        const fmtT = (ts: number) => new Date(ts * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
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

      // Schedula notifiche se attive (solo turno di oggi)
      const enabled = (await AsyncStorage.getItem(NOTIF_ENABLED_KEY)) === 'true';
      if (enabled && shiftToday) {
        const shiftFlights = fetchedArrivals.filter(item => {
          const ts = item.flight?.time?.scheduled?.arrival;
          return ts && ts >= shiftToday!.start && ts <= shiftToday!.end;
        });
        const count = await scheduleShiftNotifications(shiftFlights, shiftToday!.end, locale);
        setScheduledCount(count);
      } else {
        await cancelPreviousNotifications();
        setScheduledCount(0);
      }
    } catch (e) { if (__DEV__) console.error('[fetchAll]', e); } finally { setLoading(false); setRefreshing(false); }
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
  }, []);

  // staffMonitor: poll stand / gate / belt every 60 s
  useEffect(() => {
    const load = async () => {
      try {
        const [deps, arrs] = await Promise.all([
          fetchStaffMonitorData('D'),
          fetchStaffMonitorData('A'),
        ]);
        setStaffMonitorDeps(deps);
        setStaffMonitorArrs(arrs);
      } catch {}
    };
    load();
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, []);

  // Toggle notifiche
  const toggleNotifications = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('flightNotifPermDenied'), t('flightNotifPermMsg'));
      return;
    }
    const next = !notifsEnabled;
    setNotifsEnabled(next);
    await AsyncStorage.setItem(NOTIF_ENABLED_KEY, String(next));

    if (!next) {
      await cancelPreviousNotifications();
      setScheduledCount(0);
      return;
    }

    // Schedula subito con i dati già caricati (turno di oggi)
    if (shifts.today) {
      const shiftFlights = arrivals.filter(item => {
        const ts = item.flight?.time?.scheduled?.arrival;
        return ts && ts >= shifts.today!.start && ts <= shifts.today!.end;
      });
      const count = await scheduleShiftNotifications(shiftFlights, shifts.today!.end, locale);
      setScheduledCount(count);
      Alert.alert(
        t('flightNotifEnabled'),
        count > 0
          ? `${t('flightNotifMsg1').replace('{count}', String(count))}`
          : t('flightNotifMsg0'),
      );
    } else {
      Alert.alert(t('flightNoShift'), t('flightNoShiftMsg'));
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
      try { await schedulePinnedNotifications(item, tab, locale); } catch (e) { if (__DEV__) console.warn('[pinnedNotif]', e); }
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
      try { await cancelPinnedNotifications(); } catch (e) { if (__DEV__) console.warn('[cancelPinNotif]', e); }
      setPinnedFlightId(null);
      if (WearDataSender) WearDataSender.clearPinnedFlight();
    } catch (e) { if (__DEV__) console.error('[unpin]', e); }
  }, []);

  const userShift = activeDay === 'today' ? shifts.today : shifts.tomorrow;
  const selectedDate = activeDay === 'today' ? new Date() : (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })();
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  const currentData = (() => {
    const source = filterMode === 'all'
      ? (activeTab === 'arrivals' ? allArrivalsFull : allDeparturesFull)
      : (activeTab === 'arrivals' ? arrivals : departures);
    return source.filter(item => {
      const ts = activeTab === 'arrivals'
        ? item.flight?.time?.scheduled?.arrival
        : item.flight?.time?.scheduled?.departure;
      return ts && isSameDay(new Date(ts * 1000), selectedDate);
    });
  })();

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
    const time = ts ? new Date(ts * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : 'N/A';
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
      ts ? new Date((ts - offsetMin * 60) * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';
    const fmtTs = (t: number) =>
      new Date(t * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    // Gate open = inbound aircraft arrival time (if available)
    const reg = item.flight?.aircraft?.registration;
    const inboundTs = reg ? inboundArrivals[reg] : undefined;
    const gateOpenFromInbound = activeTab === 'departures' && ts && inboundTs ? inboundTs : undefined;

    const flightId = item.flight?.identification?.number?.default || null;
    const isPinned = flightId !== null && flightId === pinnedFlightId;

    const normFn = normalizeFlightNumber(flightNumber);
    const normalizeForMatching = (s: string) => s.replace(/[\s\-_]/g, '').toUpperCase();
    const normFnStripped = normalizeForMatching(normFn);
    const smPool = activeTab === 'departures' ? staffMonitorDeps : staffMonitorArrs;
    const smFlight =
      smPool.find(sm => sm.flightNumber === normFn) ??
      smPool.find(sm => normalizeForMatching(sm.flightNumber) === normFnStripped);
    if (__DEV__ && !smFlight && smPool.length > 0) {
      console.log(`[FlightScreen] No staffMonitor match for "${normFn}" (stripped: "${normFnStripped}") in ${activeTab}`);
    }

    return (
      <SwipeableFlightCard
        isPinned={isPinned}
        onToggle={() => isPinned ? unpinFlight() : pinFlight(item)}
      >
        <View style={[s.card, isPinned && s.cardPinned, { marginBottom: 0 }]}>
          {isPinned && <View style={s.pinBanner}><Text style={s.pinBannerText}>{t('flightPinned')}</Text></View>}
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
                  <Text style={s.opsLabel}>{t('flightCheckin')}</Text>
                  <Text style={s.opsTime}>{fmt(ops.checkInOpen)} – {fmt(ops.checkInClose)}</Text>
                </View>
              </View>
              <View style={s.opsBadge}>
                <MaterialIcons name="meeting-room" size={16} color={colors.primary} />
                <View>
                  <Text style={s.opsLabel}>{t('flightGate')}</Text>
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
            const landLabel = landed ? t('flightLanded') : t('flightEstimated');

            // Delay pill
            const delayText = landed ? 'Atterrato'
              : delayMin > 0 ? `+${delayMin} min`
              : t('flightOnTime');
            const delayColor = landed ? '#10B981'
              : delayMin > 20 ? '#EF4444'
              : delayMin > 5 ? '#F59E0B'
              : '#10B981';

            return (
              <View style={s.opsRow}>
                <View style={s.opsBadge}>
                  <MaterialIcons name="flight-takeoff" size={16} color={departed ? colors.primary : '#6B7280'} />
                  <View>
                    <Text style={s.opsLabel}>{t('flightDeparted')}</Text>
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
        {smFlight && (smFlight.stand || smFlight.checkin || smFlight.gate || smFlight.belt) && (
          <View style={s.smFooter}>
            {smFlight.stand && (
              <View style={s.smPill}>
                <MaterialIcons name="local-parking" size={11} color={colors.primary} />
                <Text style={s.smPillText}>Stand {smFlight.stand}</Text>
              </View>
            )}
            {smFlight.checkin && (
              <View style={s.smPill}>
                <MaterialIcons name="desktop-windows" size={11} color={colors.primary} />
                <Text style={s.smPillText}>{t('flightCheckin')} {smFlight.checkin}</Text>
              </View>
            )}
            {smFlight.gate && (
              <View style={s.smPill}>
                <MaterialIcons name="meeting-room" size={11} color={colors.primary} />
                <Text style={s.smPillText}>{t('flightGate')} {smFlight.gate}</Text>
              </View>
            )}
            {smFlight.belt && (
              <View style={s.smPill}>
                <MaterialIcons name="luggage" size={11} color={colors.primary} />
                <Text style={s.smPillText}>{t('flightBelt')} {smFlight.belt}</Text>
              </View>
            )}
          </View>
        )}
      </SwipeableFlightCard>
    );
  }, [activeTab, userShift, s, pinnedFlightId, pinFlight, unpinFlight, inboundArrivals, colors, staffMonitorDeps, staffMonitorArrs]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Page header */}
      <View style={s.pageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>{t('flightTitle')}</Text>
          <Text style={s.pageSub}>{formatAirportHeader(airport.code)}</Text>
        </View>
        <TouchableOpacity
          style={[s.filterBtn, filterMode === 'all' && s.filterBtnActive]}
          onPress={() => setFilterMenuVisible(true)}
          activeOpacity={0.8}
          accessibilityLabel={t('flightFilterTitle')}
          accessibilityRole="button"
        >
          <MaterialIcons name="filter-list" size={20} color={filterMode === 'all' ? '#fff' : '#64748B'} />
        </TouchableOpacity>
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
          {(['arrivals', 'departures'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[s.segBtn, activeTab === tab && s.segBtnActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.segBtnText, activeTab === tab && s.segBtnTextActive]}>{tab === 'arrivals' ? t('flightArrivals') : t('flightDepartures')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Oggi / Domani */}
        <View style={s.segment}>
          {(['today', 'tomorrow'] as const).map(d => (
            <TouchableOpacity key={d} style={[s.segBtn, activeDay === d && s.segBtnActive]} onPress={() => setActiveDay(d)}>
              <Text style={[s.segBtnText, activeDay === d && s.segBtnTextActive]}>{d === 'today' ? t('flightToday') : t('flightTomorrow')}</Text>
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
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 15 }}>{t('flightNoFlights')}</Text>}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Flight Filter Modal */}
      <Modal
        visible={filterMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterMenuVisible(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterMenuVisible(false)}
        >
          <View style={s.filterSheet}>
            <View style={s.filterSheetHandle} />
            <Text style={s.filterSheetTitle}>{t('flightFilterTitle')}</Text>
            {(['mine', 'all'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[s.filterOption, filterMode === mode && s.filterOptionActive]}
                activeOpacity={0.8}
                onPress={() => {
                  setFilterMode(mode);
                  AsyncStorage.setItem(FLIGHT_FILTER_KEY, mode);
                  setFilterMenuVisible(false);
                }}
              >
                <MaterialIcons
                  name={filterMode === mode ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={22}
                  color={filterMode === mode ? colors.primary : '#9CA3AF'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[s.filterOptionText, filterMode === mode && { color: colors.primary }]}>
                    {mode === 'mine' ? t('flightFilterMine') : t('flightFilterAll')}
                  </Text>
                  <Text style={s.filterOptionSub}>
                    {mode === 'mine' ? t('flightFilterMineSub') : t('flightFilterAllSub')}
                  </Text>
                </View>
                {filterMode === mode && (
                  <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
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
    card: { backgroundColor: c.card, borderRadius: 16, marginBottom: 10, overflow: 'hidden', shadowColor: c.primary, shadowOpacity: c.isDark ? 0 : 0.08, shadowRadius: 10, elevation: c.isDark ? 0 : 3, borderWidth: c.isDark ? 1 : 0, borderColor: c.glassBorder },
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
    filterBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.cardSecondary, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    filterBtnActive: { backgroundColor: c.primary, shadowColor: c.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    filterSheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
    filterSheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
    filterSheetTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 16, textAlign: 'center' },
    filterOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 8, backgroundColor: c.bg },
    filterOptionActive: { backgroundColor: c.primaryLight, borderWidth: 1.5, borderColor: c.primaryLight },
    filterOptionText: { fontSize: 15, fontWeight: '600', color: c.text },
    filterOptionSub: { fontSize: 12, color: c.textSub, marginTop: 2 },
    smFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 10, backgroundColor: c.card },
    smPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    smPillText: { fontSize: 11, fontWeight: '700', color: c.primaryDark },
  });
}
