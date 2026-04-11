import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
  Platform, UIManager
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import * as Location from 'expo-location';
import { useAppTheme, type ThemeColors } from '../context/ThemeContext';
import ShiftTimeline from '../components/ShiftTimeline';
import { getAirlineOps, getAirlineColor } from '../utils/airlineOps';
import { getWritableCalendarId } from '../utils/shiftCalendar';
import { useLanguage } from '../context/LanguageContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PINNED_FLIGHT_KEY = 'pinned_flight_v1';

function PinnedFlightCard({ item, colors }: { item: any; colors: any }) {
  const { t, locale } = useLanguage();
  const tab = item._pinTab || 'departures';
  const flightNumber = item.flight?.identification?.number?.default || 'N/A';
  const airline = item.flight?.airline?.name || 'Sconosciuta';
  const airlineColor = getAirlineColor(airline);
  const statusText = item.flight?.status?.text || 'Scheduled';
  const raw = item.flight?.status?.generic?.status?.color || 'gray';
  const statusColor = raw === 'green' ? '#10b981' : raw === 'red' ? '#ef4444' : raw === 'yellow' ? '#f59e0b' : '#6b7280';

  const dest = tab === 'arrivals'
    ? (item.flight?.airport?.origin?.code?.iata || 'N/A')
    : (item.flight?.airport?.destination?.code?.iata || 'N/A');
  const ts = tab === 'arrivals'
    ? item.flight?.time?.scheduled?.arrival
    : item.flight?.time?.scheduled?.departure;
  const depTime = ts ? new Date(ts * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : 'N/A';

  const ops = getAirlineOps(airline);
  const fmt = (offsetMin: number) =>
    ts ? new Date((ts - offsetMin * 60) * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <View style={{
      marginHorizontal: 16, marginTop: 16,
      borderRadius: 16, overflow: 'hidden',
      backgroundColor: colors.card,
      shadowColor: colors.isDark ? '#000000' : colors.primary, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
      borderWidth: colors.isDark ? 1 : 0, borderColor: colors.border,
    }}>
      {/* Compact header: airline color bar + flight info */}
      <View style={{
        backgroundColor: airlineColor,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>{flightNumber}</Text>
          </View>
          <View>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>{airline}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{tab === 'arrivals' ? t('homeArrival') : t('homeDeparture')}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22 }}>{depTime}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' }}>{dest}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={{ padding: 12 }}>
        {tab === 'departures' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
              <MaterialIcons name="desktop-windows" size={15} color={colors.primary} />
              <View>
                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textSub, letterSpacing: 0.3 }}>CHECK-IN</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primaryDark }}>{fmt(ops.checkInOpen)} – {fmt(ops.checkInClose)}</Text>
              </View>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
              <MaterialIcons name="meeting-room" size={15} color={colors.primary} />
              <View>
                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textSub, letterSpacing: 0.3 }}>GATE</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primaryDark }}>{fmt(ops.gateOpen)} – {fmt(ops.gateClose)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 12, color: colors.textSub }}>
            Da: {item.flight?.airport?.origin?.name || item.flight?.airport?.origin?.code?.iata || 'N/A'}
          </Text>
        )}
        {/* Status row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <View style={{ backgroundColor: statusColor + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor }}>{statusText}</Text>
          </View>
          <View style={{ backgroundColor: '#F59E0B22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialIcons name="push-pin" size={12} color="#F59E0B" />
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#F59E0B' }}>{t('homePinned')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { t, months, locale, weatherMap } = useLanguage();
  const today = new Date();
  const [shiftEvent, setShiftEvent] = useState<any>(null);
  const [weather, setWeather] = useState<{ text: string; icon: string; temp: number } | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [pinnedFlight, setPinnedFlight] = useState<any>(null);

  useEffect(() => { fetchShift(); }, []);
  useEffect(() => { fetchWeather(); }, []);

  useEffect(() => {
    const loadPinned = async () => {
      const raw = await AsyncStorage.getItem(PINNED_FLIGHT_KEY);
      if (!raw) { setPinnedFlight(null); return; }
      try {
        const pinned = JSON.parse(raw);
        const tab = pinned._pinTab || 'departures';
        const ts = tab === 'arrivals'
          ? pinned.flight?.time?.scheduled?.arrival
          : pinned.flight?.time?.scheduled?.departure;
        if (ts && ts < Date.now() / 1000) {
          await AsyncStorage.removeItem(PINNED_FLIGHT_KEY);
          setPinnedFlight(null);
        } else {
          setPinnedFlight(pinned);
        }
      } catch { setPinnedFlight(null); }
    };
    loadPinned();

    const interval = setInterval(loadPinned, 30_000);
    return () => clearInterval(interval);
  }, []);

  const fetchShift = async (silent = false) => {
    if (!silent) setLoadingShift(true);
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') { setLoadingShift(false); return; }
      const calId = await getWritableCalendarId();
      if (!calId) { setLoadingShift(false); return; }
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(); dEnd.setHours(23, 59, 59, 999);
      const events = await Calendar.getEventsAsync([calId], d, dEnd);
      const shift = events.find(e => e.title.includes('Lavoro') || e.title.includes('Riposo'));
      setShiftEvent(shift || null);
    } catch (e) { if (__DEV__) console.error('[shift]', e); } finally { setLoadingShift(false); }
  };

  const fetchWeather = async () => {
    try {
      await Location.requestForegroundPermissionsAsync();
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&current=temperature_2m,weather_code&timezone=Europe%2FRome`;
      const res = await fetch(url);
      const json = await res.json();
      const code = json.current?.weather_code ?? 0;
      const temp = Math.round(json.current?.temperature_2m ?? 0);
      const w = weatherMap[code] || { text: 'Sereno', icon: '☀️' };
      setWeather({ ...w, temp });
    } catch (e) { if (__DEV__) console.warn('[weather]', e); }
  };

  const isRest = shiftEvent?.title?.includes('Riposo');
  const isWork = shiftEvent?.title?.includes('Lavoro');
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 96 }}>
      {/* Top cards row: Weather + Date */}
      <View style={s.topRow}>
        <View style={s.weatherCard}>
          {weather ? (
            <>
              <Text style={s.weatherEmoji}>{weather.icon}</Text>
              <Text style={s.weatherTemp}>{weather.temp}°</Text>
              <Text style={s.weatherDesc}>{t('homeWeatherLocal')} • {weather.text}</Text>
            </>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
        <View style={s.dateCard}>
          <Text style={s.dateToday}>{t('homeToday')}</Text>
          <Text style={s.dateNum}>{today.getDate()}</Text>
          <Text style={s.dateMonth}>{months[today.getMonth()]}</Text>
        </View>
      </View>

      {/* Pinned flight */}
      {pinnedFlight && <PinnedFlightCard item={pinnedFlight} colors={colors} />}

      {/* Turno Attuale */}
      <Text style={s.sectionTitle}>{t('homeCurrentShift')}</Text>

      <View style={s.shiftCard}>
        {loadingShift ? (
          <ActivityIndicator color={colors.primary} />
        ) : isWork ? (
          <>
            <View style={s.shiftStrip} />
            <View style={{ flex: 1 }}>
              <View style={s.shiftBadgeRow}>
                <View style={s.inProgressBadge}><Text style={s.inProgressText}>{t('homeInProgress')}</Text></View>
              </View>
              <Text style={s.shiftTitle}>{t('homeShiftWork')}</Text>
              <Text style={s.shiftTime}>
                {new Date(shiftEvent.startDate).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})} – {new Date(shiftEvent.endDate).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}
              </Text>
            </View>
          </>
        ) : isRest ? (
          <View style={s.restRow}>
            <Text style={{ fontSize: 28, marginRight: 12 }}>🌴</Text>
            <Text style={s.restText}>{t('homeRestDay')}</Text>
          </View>
        ) : (
          <View style={s.emptyShiftWrap}>
            <View style={s.emptyIconCircle}>
              <MaterialIcons name="event-busy" size={32} color={colors.primary} />
            </View>
            <Text style={s.emptyShiftTitle}>{t('homeNoShift')}</Text>
            <Text style={s.emptyShiftSub}>Controlla la pagina Turni per aggiornamenti</Text>
          </View>
        )}
      </View>

      {/* Timeline voli nel turno — inline */}
      {shiftEvent && isWork && (
        <View style={s.timelineCard}>
          <ShiftTimeline
            visible={false}
            onClose={() => {}}
            shiftStart={new Date(shiftEvent.startDate)}
            shiftEnd={new Date(shiftEvent.endDate)}
            inline
          />
        </View>
      )}

    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    topRow: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 8 },
    weatherCard: { flex: 1, backgroundColor: c.card, borderRadius: 18, padding: 16, alignItems: 'center', shadowColor: c.isDark ? '#000000' : c.primary, shadowOpacity: c.isDark ? 0 : 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: c.isDark ? 0 : 6, borderWidth: 1, borderColor: c.glassBorder },
    weatherEmoji: { fontSize: 28, marginBottom: 4 },
    weatherTemp: { fontSize: 28, fontWeight: '700', color: c.primaryDark },
    weatherDesc: { fontSize: 11, color: c.textSub, textAlign: 'center', marginTop: 2 },
    dateCard: { width: 90, backgroundColor: c.primaryDark, borderRadius: 18, padding: 14, alignItems: 'center', justifyContent: 'center', shadowColor: c.isDark ? '#000000' : c.primary, shadowOpacity: c.isDark ? 0 : 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: c.isDark ? 0 : 6 },
    dateToday: { fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, fontWeight: '700' },
    dateNum: { fontSize: 36, fontWeight: '700', color: '#fff', lineHeight: 40 },
    dateMonth: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: c.textSub, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
    shiftCard: { backgroundColor: c.card, borderRadius: 18, marginHorizontal: 16, padding: 16, flexDirection: 'row', gap: 14, shadowColor: c.isDark ? '#000000' : c.primary, shadowOpacity: c.isDark ? 0 : 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: c.isDark ? 0 : 3, minHeight: 140, borderWidth: 1, borderColor: c.glassBorder },
    shiftStrip: { width: 4, borderRadius: 2, backgroundColor: c.primary, marginRight: 2 },
    shiftBadgeRow: { flexDirection: 'row', marginBottom: 8 },
    inProgressBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    inProgressText: { fontSize: 10, fontWeight: '700', color: '#059669' },
    shiftTitle: { fontSize: 17, fontWeight: '700', color: c.primaryDark, marginBottom: 4 },
    shiftTime: { fontSize: 22, fontWeight: '700', color: c.primary, marginBottom: 4 },
    timelineCard: { backgroundColor: c.card, borderRadius: 18, marginHorizontal: 16, marginTop: 12, padding: 16, shadowColor: c.isDark ? '#000000' : c.primary, shadowOpacity: c.isDark ? 0 : 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: c.isDark ? 0 : 3, borderWidth: 1, borderColor: c.glassBorder },
    restRow: { flexDirection: 'row', alignItems: 'center' },
    restText: { fontSize: 18, fontWeight: '700', color: '#10b981' },
    emptyShiftWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
    emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    emptyShiftTitle: { fontSize: 16, fontWeight: '700', color: c.text, textAlign: 'center', marginBottom: 4 },
    emptyShiftSub: { fontSize: 13, color: c.textSub, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
  });
}
