import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, Modal, TextInput,
  Platform, UIManager
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import * as Calendar from 'expo-calendar';
import * as Location from 'expo-location';
import { useAppTheme, type ThemeColors } from '../context/ThemeContext';
import ShiftTimeline from '../components/ShiftTimeline';

import { getAirlineOps, getAirlineColor } from '../utils/airlineOps';
import {
  getWritableCalendarId,
  replaceShiftForDate,
  replaceShiftsForRange,
} from '../utils/shiftCalendar';
import { useLanguage } from '../context/LanguageContext';

const GOLD = '#F59E0B';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PINNED_FLIGHT_KEY = 'pinned_flight_v1';
const HOME_REST_TIMING = { startHour: 12, startMinute: 0, endHour: 14, endMinute: 0, allDay: true };

const weatherMap: Record<number, { text: string; icon: string }> = {
  0: { text: 'Sereno', icon: '☀️' }, 1: { text: 'Poco Nuvoloso', icon: '🌤️' },
  2: { text: 'Nuvoloso', icon: '⛅' }, 3: { text: 'Coperto', icon: '☁️' },
  45: { text: 'Nebbia', icon: '🌫️' }, 61: { text: 'Pioggia Leggera', icon: '🌦️' },
  63: { text: 'Pioggia', icon: '🌧️' }, 80: { text: 'Rovesci', icon: '🌧️' },
};

// months comes from useLanguage() context

const engineHtml = `<!DOCTYPE html><html lang="it"><head>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script></head>
<body style="background-color:transparent;"><script>
window.runTesseract = async function(base64JsonStr) {
  try {
    const images = JSON.parse(base64JsonStr);
    let combinedText = '';
    for (let i = 0; i < images.length; i++) {
      const ret = await Tesseract.recognize(images[i], 'ita+eng');
      combinedText += ret.data.text + '\\n\\n';
    }
    window.ReactNativeWebView.postMessage(JSON.stringify({ success: true, text: combinedText }));
  } catch (e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, error: e.message || e.toString() }));
  }
};
</script></body></html>`;

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
  const HOME_SHIFT_TITLES = { work: t('homeShiftWork'), rest: '🌴 Riposo' };
  const today = new Date();
  const [shiftEvent, setShiftEvent] = useState<any>(null);
  const [weather, setWeather] = useState<{ text: string; icon: string; temp: number } | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [imageList, setImageList] = useState<string[]>([]);
  const [ocrText, setOcrText] = useState('');
  const [processing, setProcessing] = useState(false);

  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [newShiftType, setNewShiftType] = useState<'Lavoro' | 'Riposo'>('Lavoro');
  const [newStartH, setNewStartH] = useState('08');
  const [newStartM, setNewStartM] = useState('00');
  const [newEndH, setNewEndH] = useState('16');
  const [newEndM, setNewEndM] = useState('00');
  const [uploadMode, setUploadMode] = useState<'image' | 'manual' | null>(null);
  const [pinnedFlight, setPinnedFlight] = useState<any>(null);

  const webViewRef = useRef<WebView>(null);

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

  const openModifyModal = () => {
    if (shiftEvent) {
      setNewShiftType(isRest ? 'Riposo' : 'Lavoro');
      const start = new Date(shiftEvent.startDate);
      const end = new Date(shiftEvent.endDate);
      setNewStartH(start.getHours().toString().padStart(2, '0'));
      setNewStartM(start.getMinutes().toString().padStart(2, '0'));
      setNewEndH(end.getHours().toString().padStart(2, '0'));
      setNewEndM(end.getMinutes().toString().padStart(2, '0'));
    } else {
      setNewShiftType('Lavoro');
      setNewStartH('08'); setNewStartM('00'); setNewEndH('16'); setNewEndM('00');
    }
    setShiftModalOpen(true);
  };

  const saveManualShift = async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') { Alert.alert(t('homePermDenied'), t('homeCalendarAuth')); return; }
    try {
      const calendarId = await getWritableCalendarId();
      if (!calendarId) { Alert.alert('Errore', t('homeNoWritableCalendar')); return; }

      const todayDate = new Date();
      const y = todayDate.getFullYear();
      const m = todayDate.getMonth() + 1;
      const d = todayDate.getDate();
      const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      await replaceShiftForDate({
        calendarId,
        date,
        type: newShiftType === 'Riposo' ? 'rest' : 'work',
        startTime: newShiftType === 'Lavoro' ? `${newStartH.padStart(2, '0')}:${newStartM.padStart(2, '0')}` : undefined,
        endTime: newShiftType === 'Lavoro' ? `${newEndH.padStart(2, '0')}:${newEndM.padStart(2, '0')}` : undefined,
        titles: HOME_SHIFT_TITLES,
        restTiming: HOME_REST_TIMING,
      });

      setShiftModalOpen(false);
      fetchShift(true);
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const fetchShift = async (silent = false) => {
    if (!silent) setLoadingShift(true);
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') { setLoadingShift(false); return; }
      const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const cal = cals.find(c => c.allowsModifications && c.isPrimary) || cals.find(c => c.allowsModifications);
      if (!cal) { setLoadingShift(false); return; }
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(); dEnd.setHours(23, 59, 59, 999);
      const events = await Calendar.getEventsAsync([cal.id], d, dEnd);
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true, quality: 1, base64: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setImageList(result.assets.map(a => a.uri));
        setProcessing(true); setOcrText('');
        const base64List = result.assets.map(a => `data:image/jpeg;base64,${a.base64}`);
        const base64Json = JSON.stringify(base64List);
        // Use postMessage pattern to avoid script-injection risks with injectJavaScript
        webViewRef.current?.injectJavaScript(`
          if(window.runTesseract){
            window.runTesseract(${JSON.stringify(base64Json)});
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({success:false,error:'OCR non pronto'}));
          }
          true;
        `);
      }
    } catch (e) { if (__DEV__) console.error('[imagePicker]', e); setProcessing(false); }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const r = JSON.parse(event.nativeEvent.data);
      if (r.success) setOcrText(r.text);
      else Alert.alert('Errore riconoscimento testo', r.error || 'Prova con un\'immagine più nitida o meglio illuminata.');
    } catch (e) { if (__DEV__) console.error('[ocrMessage]', e); } finally { setProcessing(false); }
  };

  const parseAndSave = async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permesso negato', 'Autorizza il calendario.'); return; }
    try {
      const calendarId = await getWritableCalendarId();
      if (!calendarId) { Alert.alert('Errore', 'Nessun calendario scrivibile.'); return; }
      const norText = ocrText.replace(/[OoQ]/g, '0').replace(/[Il|]/g, '1');
      const dateRegex = /\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/g;
      const dates: any[] = []; let m;
      while ((m = dateRegex.exec(norText)) !== null) dates.push({ day: +m[1], month: +m[2]-1, year: +m[3], raw: m[0] });
      const safeText = norText.replace(/\b20\d{2}\b/g, ' ANNO ');
      const shiftRegex = /\b([01]?\d|2\d)[.,:]?(\d{2})\s*[-–—_~|]+\s*([01]?\d|2\d)[.,:]?(\d{2})\b|\b(R|RIP|RIP0S0|R1P0S0|R1POSO)\b/g;
      const shifts: any[] = [];
      while ((m = shiftRegex.exec(safeText)) !== null) {
        if (m[5]) shifts.push({ isRest: true, raw: m[0] });
        else shifts.push({ isRest: false, startH: +m[1], startM: +m[2], endH: +m[3], endM: +m[4], raw: m[0] });
      }

      const parsedShifts = [];
      for (let i = 0; i < Math.min(dates.length, shifts.length); i++) {
        const d = dates[i];
        const s = shifts[i];
        const date = `${d.year}-${String(d.month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

        if (s.isRest) {
          parsedShifts.push({ date, type: 'rest' as const });
        } else {
          parsedShifts.push({
            date,
            type: 'work' as const,
            startTime: `${String(s.startH).padStart(2, '0')}:${String(s.startM).padStart(2, '0')}`,
            endTime: `${String(s.endH).padStart(2, '0')}:${String(s.endM).padStart(2, '0')}`,
          });
        }
      }

      const saved = await replaceShiftsForRange({
        calendarId,
        shifts: parsedShifts,
        titles: HOME_SHIFT_TITLES,
        restTiming: HOME_REST_TIMING,
      });

      Alert.alert(saved > 0 ? t('homeShiftSynced') : t('homeNoSchedule'), saved > 0 ? `${saved} turni salvati.` : `Date: ${dates.length}, Orari: ${shifts.length}`);
      if (saved > 0) fetchShift(true);
    } catch (e: any) { Alert.alert(t('homeCalErr'), e.message); }
  };

  const isRest = shiftEvent?.title?.includes('Riposo');
  const isWork = shiftEvent?.title?.includes('Lavoro');
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 96 }}>
      {/* Hidden OCR WebView */}
      <View style={s.hiddenWV}>
        <WebView ref={webViewRef} source={{ html: engineHtml }} onMessage={handleWebViewMessage} javaScriptEnabled />
      </View>

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
          <Text style={s.emptyShift}>{t('homeNoShift')}</Text>
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
    hiddenWV: { height: 1, width: 1, opacity: 0, position: 'absolute', top: -100 },
    topRow: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 8 },
    weatherCard: { flex: 1, backgroundColor: c.card, borderRadius: 18, padding: 16, alignItems: 'center', shadowColor: c.isDark ? '#000000' : c.primary, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: c.glassBorder },
    weatherEmoji: { fontSize: 28, marginBottom: 4 },
    weatherTemp: { fontSize: 28, fontWeight: '700', color: c.primaryDark },
    weatherDesc: { fontSize: 11, color: c.textSub, textAlign: 'center', marginTop: 2 },
    dateCard: { width: 90, backgroundColor: c.primaryDark, borderRadius: 18, padding: 14, alignItems: 'center', justifyContent: 'center', shadowColor: c.isDark ? '#000000' : c.primary, shadowOpacity: 0.30, shadowRadius: 12, elevation: 6 },
    dateToday: { fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, fontWeight: '700' },
    dateNum: { fontSize: 36, fontWeight: '700', color: '#fff', lineHeight: 40 },
    dateMonth: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: c.textSub, letterSpacing: 0.5, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
    shiftCard: { backgroundColor: c.card, borderRadius: 18, marginHorizontal: 16, padding: 16, flexDirection: 'row', gap: 14, shadowColor: c.isDark ? '#000000' : c.primary, shadowOpacity: 0.10, shadowRadius: 12, elevation: 4, minHeight: 90, borderWidth: 1, borderColor: c.glassBorder },
    shiftStrip: { width: 4, borderRadius: 2, backgroundColor: c.primary, marginRight: 2 },
    shiftBadgeRow: { flexDirection: 'row', marginBottom: 8 },
    inProgressBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    inProgressText: { fontSize: 10, fontWeight: '700', color: '#059669' },
    shiftTitle: { fontSize: 17, fontWeight: '700', color: c.primaryDark, marginBottom: 4 },
    shiftTime: { fontSize: 22, fontWeight: '700', color: c.primary, marginBottom: 4 },
    timelineCard: { backgroundColor: c.card, borderRadius: 18, marginHorizontal: 16, marginTop: 12, padding: 16, shadowColor: c.isDark ? '#000000' : c.primary, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: c.glassBorder },
    restRow: { flexDirection: 'row', alignItems: 'center' },
    restText: { fontSize: 18, fontWeight: '700', color: '#10b981' },
    emptyShift: { color: c.textSub, fontSize: 15, lineHeight: 24, textAlign: 'center', flex: 1 },
    uploadToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 16, backgroundColor: c.card, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, shadowColor: c.isDark ? '#000000' : c.primary, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: c.glassBorder },
    uploadToggleText: { flex: 1, fontSize: 15, fontWeight: '600', color: c.primaryDark },
    uploadSection: { marginHorizontal: 16, backgroundColor: c.card, borderRadius: 18, padding: 16, marginTop: 2, shadowColor: c.isDark ? '#000000' : c.primary, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: c.glassBorder },
    uploadDesc: { fontSize: 13, color: c.textSub, lineHeight: 19, marginBottom: 14 },
    scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.primaryDark, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 20 },
    scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    imagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    thumb: { width: '47%', height: 120, borderRadius: 10, resizeMode: 'cover' },
    ocrResult: { backgroundColor: c.cardSecondary, borderRadius: 12, padding: 12, marginTop: 12 },
    ocrTitle: { fontSize: 12, fontWeight: '700', color: c.textSub, marginBottom: 6 },
    ocrText: { fontSize: 12, color: c.text, lineHeight: 18 },
    syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary, borderRadius: 12, paddingVertical: 13, marginTop: 12 },
    syncBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: c.isDark ? c.bg : c.card, width: '100%', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 14, elevation: 8, borderWidth: 1, borderColor: c.glassBorder },
    modalTitle: { fontSize: 17, fontWeight: '700', color: c.primaryDark, marginBottom: 14 },
    modalLabel: { fontSize: 12, fontWeight: '700', color: c.textSub, marginBottom: 8 },
    modalInput: { borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 14, color: c.text },
    modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
    typeBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: c.bg, alignItems: 'center' },
    inputLabel: { fontSize: 11, color: c.textSub, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
    modeBtn: { flex: 1, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 20, alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: c.primary, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    modeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  });
}
