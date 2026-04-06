import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity,
  PanResponder, Platform, UIManager, Animated, Dimensions, Modal, Alert, FlatList, TextInput, KeyboardAvoidingView, Keyboard,
} from 'react-native';
import * as SystemCalendar from 'expo-calendar';
import * as Location from 'expo-location';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../context/ThemeContext';
import { useAirport } from '../context/AirportContext';
import { fetchAirportScheduleRaw } from '../utils/fr24api';
import {
  getWritableCalendarId,
  replaceShiftForDate,
  replaceShiftsForRange,
} from '../utils/shiftCalendar';
import {
  getPdfExtractorHtml, parseShiftCells,
  type ParsedSchedule, type ParsedEmployee, type ParsedShift,
} from '../utils/pdfShiftParser';
import { SHIFT_TITLE_REST, SHIFT_TITLE_WORK } from '../constants/shifts';

const PRIMARY = '#2563EB';
const STORAGE_KEY = '@shift_import_name';

type ShiftEvent = {
  id: string;
  title: string;
  startDate: string | Date;
  endDate: string | Date;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const weatherMap: Record<number, { text: string; icon: string }> = {
  0: { text: 'Sereno', icon: '☀️' },
  1: { text: 'Poco Nuvoloso', icon: '🌤️' },
  2: { text: 'Nuvoloso', icon: '⛅' },
  3: { text: 'Coperto', icon: '☁️' },
  45: { text: 'Nebbia', icon: '🌫️' },
  61: { text: 'Pioggia Leggera', icon: '🌦️' },
  63: { text: 'Pioggia', icon: '🌧️' },
  80: { text: 'Rovesci', icon: '🌧️' },
};

function getMonday(d: Date | null | undefined): Date {
  if (!d || isNaN(d.getTime())) return getMonday(new Date());
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  return date;
}

export default function CalendarScreen() {
  const { colors } = useAppTheme();
  const { airportCode, isLoading: airportLoading } = useAirport();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().split('T')[0]);
  const [markedDates, setMarkedDates] = useState<Record<string, string>>({});
  const [eventsData, setEventsData] = useState<Record<string, ShiftEvent[]>>({});
  const [dailyStats, setDailyStats] = useState<Record<string, { weatherText: string; weatherIcon: string; flightCount: number }>>({});
  const [loading, setLoading] = useState(true);
  const [calId, setCalId] = useState<string | null>(null);

  // Import flow state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importStep, setImportStep] = useState<'idle' | 'extracting' | 'pickName' | 'preview' | 'saving' | 'done'>('idle');
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
  const [parsedSchedule, setParsedSchedule] = useState<ParsedSchedule | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<ParsedEmployee | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);

  // ─── Edit menu + manual entry ───────────────────────────────────────────────
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualDate, setManualDate] = useState(selectedDay);
  const [manualType, setManualType] = useState<'Lavoro' | 'Riposo'>('Lavoro');
  const [manualStartH, setManualStartH] = useState('08');
  const [manualStartM, setManualStartM] = useState('00');
  const [manualEndH, setManualEndH] = useState('16');
  const [manualEndM, setManualEndM] = useState('00');
  const manualStartMRef = useRef<TextInput>(null);
  const manualEndHRef = useRef<TextInput>(null);
  const manualEndMRef = useRef<TextInput>(null);

  const openManualEntry = () => {
    setEditMenuOpen(false);
    setManualDate(selectedDay);
    setManualType('Lavoro');
    setManualStartH('08'); setManualStartM('00');
    setManualEndH('16'); setManualEndM('00');
    setManualModalOpen(true);
  };

  const sanitizeTimePart = (value: string) => value.replace(/\D/g, '').slice(0, 2);

  const saveManualShift = async () => {
    const { status } = await SystemCalendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permesso negato'); return; }

    try {
      const calendarId = calId ?? await getWritableCalendarId();
      if (!calendarId) { Alert.alert('Errore', 'Nessun calendario scrivibile'); return; }
      if (!calId) setCalId(calendarId);

      await replaceShiftForDate({
        calendarId,
        date: manualDate,
        type: manualType === 'Riposo' ? 'rest' : 'work',
        startTime: manualType === 'Lavoro' ? `${manualStartH.padStart(2, '0')}:${manualStartM.padStart(2, '0')}` : undefined,
        endTime: manualType === 'Lavoro' ? `${manualEndH.padStart(2, '0')}:${manualEndM.padStart(2, '0')}` : undefined,
      });

      setManualModalOpen(false);
      fetchCalendar(true);
      Alert.alert('Turno salvato!');
    } catch (e: any) { Alert.alert('Errore', e.message); }
  };

  const SCREEN_W = Dimensions.get('window').width;
  const weekSlideX = useRef(new Animated.Value(0)).current;

  // Load saved name
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(n => { if (n) setSavedName(n); });
  }, []);

  const changeWeek = (dir: 1 | -1) => {
    Animated.timing(weekSlideX, {
      toValue: dir * SCREEN_W, duration: 120, useNativeDriver: true,
    }).start(() => {
      setCurrentWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + dir * -7); return n; });
      weekSlideX.setValue(-dir * SCREEN_W);
      Animated.timing(weekSlideX, {
        toValue: 0, duration: 120, useNativeDriver: true,
      }).start();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => { weekSlideX.setValue(g.dx); },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > SCREEN_W * 0.2) {
          changeWeek(g.dx > 0 ? 1 : -1);
        } else {
          Animated.spring(weekSlideX, {
            toValue: 0, useNativeDriver: true, tension: 120, friction: 10,
          }).start();
        }
      },
    })
  ).current;

  const getWeekDays = (start: Date) =>
    Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      return {
        date: d, iso,
        dayNum: d.getDate(),
        dayName: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][d.getDay()],
      };
    });

  useEffect(() => {
    if (!airportLoading) fetchCalendar();
  }, [currentWeekStart, airportCode, airportLoading]);

  const fetchCalendar = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { status } = await SystemCalendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') { setLoading(false); return; }
      const calendars = await SystemCalendar.getCalendarsAsync(SystemCalendar.EntityTypes.EVENT);
      const cal = calendars.find(c => c.allowsModifications && c.isPrimary) || calendars.find(c => c.allowsModifications);
      if (!cal) { setLoading(false); return; }
      setCalId(cal.id);
      const start = new Date(currentWeekStart); start.setHours(0, 0, 0, 0);
      const end = new Date(currentWeekStart); end.setDate(end.getDate() + 7);
      const events = await SystemCalendar.getEventsAsync([cal.id], start, end);
      const dots: Record<string, string> = {};
      const localData: Record<string, ShiftEvent[]> = {};
      events.forEach(e => {
        if (e.title.includes('Lavoro') || e.title.includes('Riposo')) {
          const iso = new Date(e.startDate).toISOString().split('T')[0];
          if (!localData[iso]) localData[iso] = [];
          localData[iso].push({ id: e.id, title: e.title, startDate: e.startDate, endDate: e.endDate });
          // Lavoro has priority over Riposo for dot color
          if (e.title.includes('Lavoro') || !dots[iso]) {
            dots[iso] = e.title.includes('Riposo') ? '#10b981' : PRIMARY;
          }
        }
      });
      setMarkedDates(dots);
      setEventsData(localData);
      setLoading(false);
      fetchWeatherAndFlights(start, end, localData);
    } catch (e) { console.error(e); setLoading(false); }
  };

  const fetchWeatherAndFlights = async (start: Date, end: Date, localData: Record<string, ShiftEvent[]>) => {
    const dict: Record<string, { weatherText: string; weatherIcon: string; flightCount: number }> = {};
    try {
      await Location.requestForegroundPermissionsAsync();
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const s = start.toISOString().split('T')[0];
      const e2 = new Date(end.getTime() - 1000).toISOString().split('T')[0];
      const wr = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&daily=weather_code&timezone=Europe%2FRome&start_date=${s}&end_date=${e2}`);
      const wj = await wr.json();
      if (wj.daily?.time) {
        wj.daily.time.forEach((date: string, i: number) => {
          const m = weatherMap[wj.daily.weather_code[i] || 0] || { text: 'Sereno', icon: '☀️' };
          dict[date] = { weatherText: m.text, weatherIcon: m.icon, flightCount: 0 };
        });
      }
    } catch (e) { console.warn('[calWeather]', e); }
    try {
      const { arrivals, departures } = await fetchAirportScheduleRaw(airportCode);
      const allF = [...arrivals, ...departures];
      Object.keys(localData).forEach(iso => {
        const sh = localData[iso].find(e => e.title.includes('Lavoro'));
        if (sh) {
          const sTS = new Date(sh.startDate).getTime() / 1000;
          const eTS = new Date(sh.endDate).getTime() / 1000;
          const cnt = allF.filter(f => {
            const ts = f.flight?.time?.scheduled?.arrival || f.flight?.time?.scheduled?.departure;
            return ts && ts >= sTS && ts <= eTS;
          }).length;
          if (dict[iso]) dict[iso].flightCount = cnt; else dict[iso] = { weatherText: 'N/A', weatherIcon: '❓', flightCount: cnt };
        }
      });
    } catch (e) { console.warn('[calFlights]', e); }
    setDailyStats(dict);
  };

  // ─── Import flow ─────────────────────────────────────────────────────────────
  const startImport = async () => {
    let step = 'picker';
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      step = 'read';
      const uri = result.assets[0].uri;
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        Alert.alert('Errore', `File non trovato: ${uri}`);
        return;
      }

      step = 'base64';
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

      step = 'webview';
      setImportStep('extracting');
      setImportModalVisible(true);
      setPdfHtml(getPdfExtractorHtml(base64));
    } catch (e: any) {
      console.error(`Import error at step=${step}:`, e);
      Alert.alert('Errore', `Errore (${step}): ${e?.message || e}`);
    }
  };

  const onWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setPdfHtml(null); // Remove WebView

      if (!data.ok) {
        Alert.alert('Errore', 'Impossibile estrarre il testo dal PDF');
        setImportModalVisible(false);
        setImportStep('idle');
        return;
      }

      const schedule = parseShiftCells(data.cells);
      if (schedule.employees.length === 0) {
        Alert.alert('Errore', 'Nessun dipendente trovato nel PDF');
        setImportModalVisible(false);
        setImportStep('idle');
        return;
      }

      setParsedSchedule(schedule);

      // Auto-select if saved name matches
      if (savedName) {
        const match = schedule.employees.find(e =>
          e.name.toLowerCase().includes(savedName.toLowerCase())
        );
        if (match) {
          setSelectedEmployee(match);
          setImportStep('preview');
          return;
        }
      }

      setImportStep('pickName');
    } catch (e) {
      console.error(e);
      Alert.alert('Errore', 'Errore nel parsing del PDF');
      setImportModalVisible(false);
      setImportStep('idle');
    }
  };

  const selectEmployee = (emp: ParsedEmployee) => {
    setSelectedEmployee(emp);
    // Save name for next time
    AsyncStorage.setItem(STORAGE_KEY, emp.name);
    setSavedName(emp.name);
    setImportStep('preview');
  };

  const confirmImport = async () => {
    if (!selectedEmployee) return;
    setImportStep('saving');

    try {
      const calendarId = calId ?? await getWritableCalendarId();
      if (!calendarId) {
        Alert.alert('Errore', 'Nessun calendario scrivibile');
        setImportStep('idle');
        return;
      }
      if (!calId) setCalId(calendarId);

      const saved = await replaceShiftsForRange({
        calendarId,
        shifts: selectedEmployee.shifts.map(shift => ({
          date: shift.date,
          type: shift.type,
          startTime: shift.start,
          endTime: shift.end,
        })),
      });

      setImportStep('done');
      setTimeout(() => {
        setImportModalVisible(false);
        setImportStep('idle');
        fetchCalendar(true);
        Alert.alert('Importazione completata', `${saved} turni salvati nel calendario`);
      }, 800);
    } catch (e) {
      console.error(e);
      Alert.alert('Errore', 'Errore durante il salvataggio');
      setImportStep('idle');
    }
  };

  const weekDays = getWeekDays(currentWeekStart);
  const monthLabel = currentWeekStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const selectedEvents = eventsData[selectedDay] || [];
  const workEvent = selectedEvents.find(e => e.title.includes('Lavoro'));
  const restEvent = selectedEvents.find(e => e.title.includes('Riposo'));
  const stats = dailyStats[selectedDay];
  const s = useMemo(() => makeStyles(colors), [colors]);

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split('-');
    const dt = new Date(+y, +m - 1, +d);
    const dayName = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][dt.getDay()];
    return `${dayName} ${d}/${m}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
        {/* Page Header */}
        <View style={s.pageHeader}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={s.pageTitle}>Gestione Turni</Text>
              <Text style={s.pageSub}>{monthLabel.toUpperCase()}</Text>
            </View>
            <TouchableOpacity style={[s.importBtn, { backgroundColor: colors.primary }]} onPress={() => setEditMenuOpen(true)}>
              <MaterialIcons name="edit-calendar" size={20} color="#fff" />
              <Text style={s.importBtnText}>Modifica Turni</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Week strip + contenuto animato */}
        <Animated.View style={{ transform: [{ translateX: weekSlideX }] }}>
        <View style={s.weekRow} {...panResponder.panHandlers}>
          <TouchableOpacity onPress={() => setCurrentWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })} style={s.navBtn}>
            <Text style={s.navArrow}>◀</Text>
          </TouchableOpacity>
          {weekDays.map(day => {
            const isSelected = day.iso === selectedDay;
            const dotColor = markedDates[day.iso];
            return (
              <TouchableOpacity key={day.iso} style={s.dayChipWrap} onPress={() => setSelectedDay(day.iso)}>
                <View style={[s.dayChip, isSelected && s.dayChipSelected]}>
                  <Text style={[s.dayChipName, isSelected && s.dayChipNameSel]}>{day.dayName}</Text>
                  <Text style={[s.dayChipNum, isSelected && s.dayChipNumSel]}>{day.dayNum}</Text>
                </View>
                {dotColor && <View style={[s.dot, { backgroundColor: isSelected ? '#fff' : dotColor }]} />}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={() => setCurrentWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })} style={s.navBtn}>
            <Text style={s.navArrow}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Main Shift Card */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={s.mainCard}>
            {stats && (
              <View style={s.weatherBadge}>
                <Text style={s.weatherIcon}>{stats.weatherIcon}</Text>
                <View>
                  <Text style={s.weatherPlace}>Meteo locale</Text>
                  <Text style={s.weatherText}>{stats.weatherText}</Text>
                </View>
              </View>
            )}

            {workEvent ? (
              <>
                <View style={s.shiftTypeRow}>
                  <View style={s.shiftIconBox}><Text style={{ fontSize: 22 }}>✈️</Text></View>
                  <Text style={s.shiftTypeName}>Turno Lavoro</Text>
                </View>
                <View style={s.timeRow}>
                  <Text style={{ fontSize: 18, marginRight: 6 }}>🕒</Text>
                  <Text style={s.timeText}>
                    {new Date(workEvent.startDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} — {new Date(workEvent.endDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {stats?.flightCount > 0 && (
                  <View style={s.flightBadge}>
                    <Text style={s.flightBadgeText}>✈️ {stats.flightCount} voli nel turno</Text>
                  </View>
                )}
              </>
            ) : restEvent ? (
              <View style={s.restRow}>
                <Text style={{ fontSize: 32, marginRight: 12 }}>🌴</Text>
                <Text style={s.restText}>Giorno di Riposo</Text>
              </View>
            ) : (
              <Text style={s.emptyText}>Nessun turno per{'\n'}{selectedDay.split('-').reverse().join('/')}</Text>
            )}
          </View>
        )}
        </Animated.View>
      </ScrollView>

      {/* ─── Edit Menu Modal ─── */}
      <Modal visible={editMenuOpen} transparent animationType="fade" onRequestClose={() => setEditMenuOpen(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setEditMenuOpen(false)} />
          <View style={[s.editMenuContent, { backgroundColor: colors.isDark || colors.card === 'transparent' ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={[s.modalTitle, { color: colors.text, marginBottom: 16 }]}>Modifica Turni</Text>
            <TouchableOpacity style={[s.editMenuOption, { backgroundColor: colors.primaryLight }]} onPress={() => { setEditMenuOpen(false); startImport(); }}>
              <MaterialIcons name="picture-as-pdf" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[s.editMenuLabel, { color: colors.text }]}>Importa da PDF</Text>
                <Text style={[s.editMenuSub, { color: colors.textSub }]}>Carica il foglio turni aziendale</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSub} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.editMenuOption, { backgroundColor: colors.primaryLight }]} onPress={openManualEntry}>
              <MaterialIcons name="edit" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[s.editMenuLabel, { color: colors.text }]}>Aggiungi manualmente</Text>
                <Text style={[s.editMenuSub, { color: colors.textSub }]}>Seleziona giorno e orario</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSub} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Manual Entry Modal ─── */}
      <Modal visible={manualModalOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setManualModalOpen(false)}>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={Keyboard.dismiss} />
          <View style={s.modalScrollContent}>
            <View style={[s.manualModalContent, { backgroundColor: colors.isDark || colors.card === 'transparent' ? '#1E293B' : '#FFFFFF' }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Aggiungi Turno</Text>
              <TouchableOpacity onPress={() => setManualModalOpen(false)}>
                <MaterialIcons name="close" size={24} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            {/* Data */}
            <Text style={[s.manualLabel, { color: colors.textSub }]}>DATA</Text>
            <TextInput
              style={[s.manualInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
              value={manualDate.split('-').reverse().join('/')}
              editable={false}
            />
            <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
              Seleziona un giorno dal calendario per cambiare la data
            </Text>

            {/* Tipo */}
            <Text style={[s.manualLabel, { color: colors.textSub }]}>TIPO</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {([SHIFT_TITLE_WORK, SHIFT_TITLE_REST] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.manualTypeBtn, { borderColor: colors.border }, manualType === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setManualType(t)}
                >
                  <Text style={{ color: manualType === t ? '#fff' : colors.text, fontWeight: '700' }}>{t === SHIFT_TITLE_WORK ? `✈️ ${SHIFT_TITLE_WORK}` : `🌴 ${SHIFT_TITLE_REST}`}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Orari (solo lavoro) */}
            {manualType === SHIFT_TITLE_WORK && (
              <>
                <Text style={[s.manualLabel, { color: colors.textSub }]}>ORARIO INIZIO</Text>
                <View style={s.manualTimeRow}>
                  <TextInput
                    style={[s.manualInput, s.manualTimeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                    placeholder="HH"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={manualStartH}
                    onChangeText={v => setManualStartH(sanitizeTimePart(v))}
                    selectTextOnFocus
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => manualStartMRef.current?.focus()}
                  />
                  <TextInput
                    ref={manualStartMRef}
                    style={[s.manualInput, s.manualTimeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                    placeholder="MM"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={manualStartM}
                    onChangeText={v => setManualStartM(sanitizeTimePart(v))}
                    selectTextOnFocus
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => manualEndHRef.current?.focus()}
                  />
                </View>
                <Text style={[s.manualLabel, { color: colors.textSub }]}>ORARIO FINE</Text>
                <View style={s.manualTimeRow}>
                  <TextInput
                    ref={manualEndHRef}
                    style={[s.manualInput, s.manualTimeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                    placeholder="HH"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={manualEndH}
                    onChangeText={v => setManualEndH(sanitizeTimePart(v))}
                    selectTextOnFocus
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => manualEndMRef.current?.focus()}
                  />
                  <TextInput
                    ref={manualEndMRef}
                    style={[s.manualInput, s.manualTimeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                    placeholder="MM"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={manualEndM}
                    onChangeText={v => setManualEndM(sanitizeTimePart(v))}
                    selectTextOnFocus
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              </>
            )}

            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]} onPress={saveManualShift}>
              <Text style={s.primaryBtnText}>Salva Turno</Text>
            </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Hidden WebView for PDF extraction */}
      {pdfHtml && (
        <WebView
          originWhitelist={['*']}
          source={{ html: pdfHtml }}
          onMessage={onWebViewMessage}
          style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }}
          javaScriptEnabled
        />
      )}

      {/* ─── Import Modal ─── */}
      <Modal visible={importModalVisible} transparent animationType="slide" onRequestClose={() => {
        if (importStep !== 'saving') { setImportModalVisible(false); setImportStep('idle'); }
      }}>
        <View style={s.modalOverlay}>
          <View style={s.modalBg} />
          <View style={[s.modalContent, { backgroundColor: colors.isDark || colors.card === 'transparent' ? '#1E293B' : '#FFFFFF' }]}>
            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Importa Turni</Text>
              {importStep !== 'saving' && (
                <TouchableOpacity onPress={() => { setImportModalVisible(false); setImportStep('idle'); }}>
                  <MaterialIcons name="close" size={24} color={colors.textSub} />
                </TouchableOpacity>
              )}
            </View>

            {/* Step: Extracting */}
            {importStep === 'extracting' && (
              <View style={s.centerBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[s.stepText, { color: colors.textSub }]}>Estrazione testo dal PDF...</Text>
              </View>
            )}

            {/* Step: Pick name */}
            {importStep === 'pickName' && parsedSchedule && (
              <>
                <Text style={[s.stepLabel, { color: colors.textSub }]}>
                  Seleziona il tuo nome ({parsedSchedule.employees.length} trovati)
                </Text>
                <FlatList
                  data={parsedSchedule.employees}
                  keyExtractor={(_, i) => String(i)}
                  style={{ maxHeight: 400 }}
                  nestedScrollEnabled
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[s.nameRow, { borderColor: colors.border }]}
                      onPress={() => selectEmployee(item)}
                    >
                      <Text style={[s.nameText, { color: colors.text }]}>{item.name}</Text>
                      <MaterialIcons name="chevron-right" size={20} color={colors.textSub} />
                    </TouchableOpacity>
                  )}
                />
              </>
            )}

            {/* Step: Preview */}
            {importStep === 'preview' && selectedEmployee && (
              <>
                <Text style={[s.stepLabel, { color: colors.textSub }]}>
                  Turni di {selectedEmployee.name}
                </Text>
                <ScrollView style={{ maxHeight: 350 }}>
                  {selectedEmployee.shifts.map((shift, i) => (
                    <View key={i} style={[s.previewRow, { borderColor: colors.border }]}>
                      <Text style={[s.previewDate, { color: colors.text }]}>{fmtDate(shift.date)}</Text>
                      {shift.type === 'work' ? (
                        <View style={[s.previewPill, { backgroundColor: colors.primaryLight }]}>
                          <Text style={[s.previewPillText, { color: colors.primary }]}>
                            {shift.start} - {shift.end}
                          </Text>
                        </View>
                      ) : (
                        <View style={[s.previewPill, { backgroundColor: '#D1FAE5' }]}>
                          <Text style={[s.previewPillText, { color: '#059669' }]}>Riposo</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[s.secondaryBtn, { borderColor: colors.border }]}
                    onPress={() => setImportStep('pickName')}
                  >
                    <Text style={[s.secondaryBtnText, { color: colors.textSub }]}>Cambia nome</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={confirmImport}
                  >
                    <Text style={s.primaryBtnText}>Salva nel calendario</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step: Saving */}
            {importStep === 'saving' && (
              <View style={s.centerBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[s.stepText, { color: colors.textSub }]}>Salvataggio in corso...</Text>
              </View>
            )}

            {/* Step: Done */}
            {importStep === 'done' && (
              <View style={s.centerBox}>
                <MaterialIcons name="check-circle" size={48} color="#10b981" />
                <Text style={[s.stepText, { color: '#10b981' }]}>Turni importati!</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(c: any) {
  return StyleSheet.create({
    pageHeader: { backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: c.primaryDark },
    pageSub: { fontSize: 11, color: c.textSub, letterSpacing: 1.5, marginTop: 3 },
    importBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    importBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    weekRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: c.border },
    navBtn: { paddingHorizontal: 8, paddingVertical: 6 },
    navArrow: { color: c.textSub, fontSize: 13, fontWeight: 'bold' },
    dayChipWrap: { flex: 1, alignItems: 'center' },
    dayChip: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2, borderRadius: 20, width: 36 },
    dayChipSelected: { backgroundColor: c.primary },
    dayChipName: { fontSize: 10, color: c.textSub, marginBottom: 3 },
    dayChipNameSel: { color: '#fff' },
    dayChipNum: { fontSize: 15, fontWeight: '600', color: c.text },
    dayChipNumSel: { color: '#fff', fontWeight: 'bold' },
    dot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },
    mainCard: {
      backgroundColor: c.card, borderRadius: 14,
      marginHorizontal: 16, marginTop: 16,
      padding: 20,
      shadowColor: '#000', shadowOpacity: c.isDark ? 0 : 0.07, shadowRadius: 10, elevation: c.isDark ? 0 : 4, borderWidth: c.isDark ? 1 : 0, borderColor: c.border,
      minHeight: 160,
    },
    weatherBadge: {
      position: 'absolute', top: 14, right: 14,
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.bg, borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 6, gap: 6,
    },
    weatherIcon: { fontSize: 18 },
    weatherPlace: { fontSize: 10, color: c.textSub, fontWeight: '600' },
    weatherText: { fontSize: 12, color: c.text, fontWeight: '600' },
    shiftTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, marginTop: 6 },
    shiftIconBox: { width: 44, height: 44, backgroundColor: c.primaryLight, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    shiftTypeName: { fontSize: 19, fontWeight: 'bold', color: c.primaryDark },
    timeRow: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: 22, fontWeight: 'bold', color: c.primary },
    flightBadge: { marginTop: 14, backgroundColor: c.primaryLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
    flightBadgeText: { color: c.primary, fontWeight: '700', fontSize: 13 },
    restRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    restText: { fontSize: 20, fontWeight: 'bold', color: '#10b981' },
    emptyText: { textAlign: 'center', color: c.textSub, fontSize: 15, marginTop: 20, lineHeight: 24 },
    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalScrollContent: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 100, maxHeight: '92%' },
    manualModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32, maxHeight: '92%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    centerBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    stepText: { fontSize: 16, fontWeight: '600' },
    stepLabel: { fontSize: 14, marginBottom: 12 },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderRadius: 8, marginBottom: 4 },
    nameText: { fontSize: 15, fontWeight: '500' },
    previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1 },
    previewDate: { fontSize: 14, fontWeight: '600' },
    previewPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
    previewPillText: { fontSize: 13, fontWeight: '700' },
    secondaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
    secondaryBtnText: { fontSize: 14, fontWeight: '600' },
    primaryBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    // Edit menu
    editMenuContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    editMenuOption: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, marginBottom: 10 },
    editMenuLabel: { fontSize: 15, fontWeight: '600' },
    editMenuSub: { fontSize: 12, marginTop: 2 },
    // Manual entry
    manualLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
    manualInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 4 },
    manualTimeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    manualTimeInput: { flex: 1, textAlign: 'center' },
    manualTypeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  });
}
