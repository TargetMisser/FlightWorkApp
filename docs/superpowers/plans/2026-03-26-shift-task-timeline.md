# Shift Task Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bottom sheet with a visual timeline of departure flights during the current shift, triggered from "Dettagli Task" in HomeScreen.

**Architecture:** New `ShiftTimeline.tsx` component renders a Modal bottom sheet. It fetches departures from FlightRadar24, filters by shift time range, and renders a vertical timeline with colored bars for check-in/gate windows. HomeScreen passes shift start/end and controls visibility.

**Tech Stack:** React Native Animated, Modal, ScrollView, fetch API, expo-calendar (shift data already available in HomeScreen)

---

### Task 1: Extract shared airline constants to a shared module

**Files:**
- Create: `src/utils/airlineOps.ts`
- Modify: `src/screens/FlightScreen.tsx:31-59`

- [ ] **Step 1: Create `src/utils/airlineOps.ts`**

```typescript
export type AirlineOps = {
  checkInOpen: number;
  checkInClose: number;
  gateOpen: number;
  gateClose: number;
};

export const DEFAULT_OPS: AirlineOps = { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 20 };

export const AIRLINE_OPS: Array<{ key: string; ops: AirlineOps }> = [
  { key: 'easyjet',         ops: { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'wizz',            ops: { checkInOpen: 180, checkInClose: 40, gateOpen: 30, gateClose: 15 } },
  { key: 'ryanair',         ops: { checkInOpen: 150, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'aer lingus',      ops: { checkInOpen: 150, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'british airways', ops: { checkInOpen: 180, checkInClose: 45, gateOpen: 45, gateClose: 20 } },
  { key: 'sas',             ops: { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'scandinavian',    ops: { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'flydubai',        ops: { checkInOpen: 180, checkInClose: 60, gateOpen: 40, gateClose: 20 } },
];

export function getAirlineOps(name: string): AirlineOps {
  const lower = name.toLowerCase();
  return AIRLINE_OPS.find(({ key }) => lower.includes(key))?.ops ?? DEFAULT_OPS;
}

export const AIRLINE_COLORS: Record<string, string> = {
  'wizz': '#C6006E', 'easyjet': '#FF6600', 'aer lingus': '#006E44',
  'british airways': '#075AAA', 'sas': '#003E7E', 'scandinavian': '#003E7E', 'flydubai': '#CC1E42',
};

export function getAirlineColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [k, c] of Object.entries(AIRLINE_COLORS)) if (lower.includes(k)) return c;
  return '#2563EB';
}

export const ALLOWED_AIRLINES = ['wizz', 'aer lingus', 'easyjet', 'british airways', 'sas', 'scandinavian', 'flydubai'];
```

- [ ] **Step 2: Update FlightScreen.tsx imports**

Replace lines 31-59 (the local `airlineColors`, `getAirlineColor`, `AirlineOps`, `DEFAULT_OPS`, `AIRLINE_OPS`, `getAirlineOps` definitions) with:

```typescript
import { getAirlineOps, getAirlineColor, ALLOWED_AIRLINES } from '../utils/airlineOps';
```

Also update the `allowed` constant inside `fetchAll` (line 166):

```typescript
const filter = (data: any[]) => data.filter(i => ALLOWED_AIRLINES.some(k => (i.flight?.airline?.name || '').toLowerCase().includes(k)));
```

- [ ] **Step 3: Verify FlightScreen still works**

Run the app, navigate to the Voli tab, confirm flights load and display correctly.

- [ ] **Step 4: Commit**

```bash
git add src/utils/airlineOps.ts src/screens/FlightScreen.tsx
git commit -m "refactor: extract airline ops and colors to shared module"
```

---

### Task 2: Create ShiftTimeline component — fetch + timeline rendering

**Files:**
- Create: `src/components/ShiftTimeline.tsx`

- [ ] **Step 1: Create `src/components/ShiftTimeline.tsx`**

```typescript
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { getAirlineOps, getAirlineColor, ALLOWED_AIRLINES } from '../utils/airlineOps';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_H = Dimensions.get('window').height;
const CI_COLOR = '#F59E0B';
const GATE_COLOR = '#3B82F6';

type Props = {
  visible: boolean;
  onClose: () => void;
  shiftStart: Date;
  shiftEnd: Date;
};

type Flight = {
  id: string;
  flightNumber: string;
  airlineName: string;
  airlineIata: string;
  destination: string;
  departureTs: number; // Unix seconds
  status: string;
  statusColor: string;
  ops: { checkInOpen: number; checkInClose: number; gateOpen: number; gateClose: number };
};

function parseFlight(item: any): Flight | null {
  const f = item.flight;
  if (!f) return null;
  const ts = f.time?.scheduled?.departure;
  if (!ts) return null;
  const airlineName = f.airline?.name || 'Sconosciuta';
  return {
    id: f.identification?.id || `${ts}`,
    flightNumber: f.identification?.number?.default || 'N/A',
    airlineName,
    airlineIata: f.airline?.code?.iata || '',
    destination: f.airport?.destination?.code?.iata || f.airport?.destination?.name || '???',
    departureTs: ts,
    status: f.status?.text || 'Scheduled',
    statusColor: f.status?.generic?.status?.color || 'gray',
    ops: getAirlineOps(airlineName),
  };
}

export default function ShiftTimeline({ visible, onClose, shiftStart, shiftEnd }: Props) {
  const { colors } = useAppTheme();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const startSec = shiftStart.getTime() / 1000;
  const endSec = shiftEnd.getTime() / 1000;
  const totalSec = endSec - startSec;

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        'https://api.flightradar24.com/common/v1/airport.json?code=psa&plugin[]=schedule&page=1&limit=100',
        { headers: { 'User-Agent': 'Mozilla/5.0' } },
      );
      const json = await res.json();
      const raw: any[] = json.result?.response?.airport?.pluginData?.schedule?.departures?.data || [];
      const filtered = raw
        .filter(i => ALLOWED_AIRLINES.some(k => (i.flight?.airline?.name || '').toLowerCase().includes(k)))
        .map(parseFlight)
        .filter((f): f is Flight => f !== null && f.departureTs >= startSec && f.departureTs <= endSec)
        .sort((a, b) => a.departureTs - b.departureTs);
      setFlights(filtered);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [startSec, endSec]);

  useEffect(() => {
    if (visible) fetchFlights();
  }, [visible, fetchFlights]);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Posizione verticale: percentuale nel turno
  const yPercent = (ts: number) => ((ts - startSec) / totalSec) * 100;

  // Tacche ogni 30 minuti
  const ticks = useMemo(() => {
    const result: { label: string; pct: number }[] = [];
    const first = new Date(shiftStart);
    first.setMinutes(Math.ceil(first.getMinutes() / 30) * 30, 0, 0);
    let t = first.getTime() / 1000;
    while (t <= endSec) {
      if (t >= startSec) {
        result.push({
          label: new Date(t * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          pct: yPercent(t),
        });
      }
      t += 30 * 60;
    }
    return result;
  }, [startSec, endSec]);

  const nowSec = Date.now() / 1000;
  const showNowLine = nowSec >= startSec && nowSec <= endSec;

  const fmtTime = (ts: number) => new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  const TIMELINE_HEIGHT = Math.max(500, flights.length * 90);

  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: colors.isDark ? colors.bg : colors.card }]}>
          {/* Handle */}
          <View style={s.handleRow}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: colors.primaryDark }]}>
                Voli nel Turno
              </Text>
              <Text style={[s.subtitle, { color: colors.textSub }]}>
                {fmtTime(startSec)} – {fmtTime(endSec)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <MaterialIcons name="close" size={22} color={colors.textSub} />
            </TouchableOpacity>
          </View>

          {/* Legenda */}
          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: CI_COLOR }]} />
              <Text style={[s.legendText, { color: colors.textSub }]}>Check-in</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: GATE_COLOR }]} />
              <Text style={[s.legendText, { color: colors.textSub }]}>Gate</Text>
            </View>
          </View>

          {/* Content */}
          {loading ? (
            <View style={s.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : error ? (
            <View style={s.center}>
              <Text style={{ color: colors.textSub, fontSize: 14, marginBottom: 12 }}>Errore nel caricamento</Text>
              <TouchableOpacity onPress={fetchFlights} style={[s.retryBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Riprova</Text>
              </TouchableOpacity>
            </View>
          ) : flights.length === 0 ? (
            <View style={s.center}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>✈️</Text>
              <Text style={{ color: colors.textSub, fontSize: 14 }}>Nessuna partenza nel turno</Text>
            </View>
          ) : (
            <ScrollView style={s.scrollArea} showsVerticalScrollIndicator={false}>
              <View style={{ height: TIMELINE_HEIGHT, marginLeft: 54, marginRight: 16, position: 'relative' }}>
                {/* Asse verticale */}
                <View style={[s.axis, { backgroundColor: colors.border }]} />

                {/* Tacche orarie */}
                {ticks.map((tick, i) => (
                  <View key={i} style={[s.tickRow, { top: `${tick.pct}%` }]}>
                    <Text style={[s.tickLabel, { color: colors.textMuted }]}>{tick.label}</Text>
                    <View style={[s.tickLine, { backgroundColor: colors.border }]} />
                  </View>
                ))}

                {/* Linea "adesso" */}
                {showNowLine && (
                  <View style={[s.nowLine, { top: `${yPercent(nowSec)}%` }]}>
                    <Text style={s.nowLabel}>ORA</Text>
                    <View style={s.nowDash} />
                  </View>
                )}

                {/* Voli */}
                {flights.map(flight => {
                  const depPct = yPercent(flight.departureTs);
                  const ciOpenTs = flight.departureTs - flight.ops.checkInOpen * 60;
                  const ciCloseTs = flight.departureTs - flight.ops.checkInClose * 60;
                  const gateOpenTs = flight.departureTs - flight.ops.gateOpen * 60;
                  const gateCloseTs = flight.departureTs - flight.ops.gateClose * 60;

                  // Barre: posizione relativa alla riga
                  const barWidth = (startTs: number, endTs: number) => {
                    const dur = endTs - startTs;
                    return `${Math.min(100, (dur / (180 * 60)) * 100)}%`;
                  };

                  const expanded = expandedId === flight.id;
                  const airlineColor = getAirlineColor(flight.airlineName);

                  return (
                    <View key={flight.id} style={[s.flightRow, { top: `${depPct}%` }]}>
                      <TouchableOpacity onPress={() => toggleExpand(flight.id)} activeOpacity={0.7}>
                        {/* Label */}
                        <Text style={[s.flightLabel, { color: colors.text }]} numberOfLines={1}>
                          {flight.flightNumber} · {flight.destination}
                        </Text>

                        {/* Barre */}
                        <View style={s.barsRow}>
                          <View style={[s.bar, { backgroundColor: CI_COLOR, width: barWidth(ciOpenTs, ciCloseTs) }]}>
                            <Text style={s.barText}>CI</Text>
                          </View>
                          <View style={[s.bar, { backgroundColor: GATE_COLOR, width: barWidth(gateOpenTs, gateCloseTs) }]}>
                            <Text style={s.barText}>Gate</Text>
                          </View>
                        </View>

                        {/* Pallino sulla timeline */}
                        <View style={[s.dot, { backgroundColor: airlineColor, borderColor: colors.isDark ? colors.bg : colors.card }]} />
                      </TouchableOpacity>

                      {/* Card espansa */}
                      {expanded && (
                        <View style={[s.expandedCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : colors.cardSecondary, borderColor: colors.border }]}>
                          <Text style={[s.expandedTitle, { color: airlineColor }]}>{flight.airlineName}</Text>
                          <View style={s.expandedRow}>
                            <Text style={[s.expandedLabel, { color: colors.textMuted }]}>Partenza</Text>
                            <Text style={[s.expandedValue, { color: colors.text }]}>{fmtTime(flight.departureTs)}</Text>
                          </View>
                          <View style={s.expandedRow}>
                            <Text style={[s.expandedLabel, { color: colors.textMuted }]}>CI Open / Close</Text>
                            <Text style={[s.expandedValue, { color: CI_COLOR }]}>{fmtTime(ciOpenTs)} – {fmtTime(ciCloseTs)}</Text>
                          </View>
                          <View style={s.expandedRow}>
                            <Text style={[s.expandedLabel, { color: colors.textMuted }]}>Gate Open / Close</Text>
                            <Text style={[s.expandedValue, { color: GATE_COLOR }]}>{fmtTime(gateOpenTs)} – {fmtTime(gateCloseTs)}</Text>
                          </View>
                          <View style={s.expandedRow}>
                            <Text style={[s.expandedLabel, { color: colors.textMuted }]}>Stato</Text>
                            <Text style={[s.expandedValue, { color: flight.statusColor === 'green' ? '#22C55E' : flight.statusColor === 'red' ? '#EF4444' : colors.text }]}>
                              {flight.status}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: any) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      height: SCREEN_H * 0.8, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    },
    handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
    handle: { width: 36, height: 4, borderRadius: 2 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
    title: { fontSize: 18, fontWeight: '800' },
    subtitle: { fontSize: 12, marginTop: 2 },
    closeBtn: { padding: 8, borderRadius: 20 },
    legend: { flexDirection: 'row', gap: 16, paddingHorizontal: 20, paddingBottom: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 11, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    scrollArea: { flex: 1, paddingTop: 8 },
    axis: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, borderRadius: 1 },
    tickRow: { position: 'absolute', left: -50, right: 0, flexDirection: 'row', alignItems: 'center' },
    tickLabel: { fontSize: 9, fontWeight: '700', width: 38, textAlign: 'right', marginRight: 8 },
    tickLine: { flex: 1, height: 1, opacity: 0.4 },
    nowLine: { position: 'absolute', left: -50, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    nowLabel: { fontSize: 8, fontWeight: '900', color: '#EF4444', width: 38, textAlign: 'right', marginRight: 8 },
    nowDash: { flex: 1, height: 2, backgroundColor: '#EF4444', opacity: 0.7 },
    flightRow: { position: 'absolute', left: 10, right: 0, transform: [{ translateY: -10 }] },
    flightLabel: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
    barsRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
    bar: { height: 20, borderRadius: 4, justifyContent: 'center', paddingHorizontal: 6, minWidth: 40 },
    barText: { fontSize: 9, fontWeight: '800', color: '#fff' },
    dot: { position: 'absolute', left: -14, top: 4, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
    expandedCard: { borderRadius: 10, padding: 12, marginTop: 4, borderWidth: 1 },
    expandedTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
    expandedRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    expandedLabel: { fontSize: 11, fontWeight: '600' },
    expandedValue: { fontSize: 11, fontWeight: '700' },
  });
}
```

- [ ] **Step 2: Verify file compiles**

Save and check for hot-reload errors in the Expo console.

- [ ] **Step 3: Commit**

```bash
git add src/components/ShiftTimeline.tsx
git commit -m "feat: add ShiftTimeline bottom sheet component with visual timeline"
```

---

### Task 3: Wire up "Dettagli Task" button in HomeScreen

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Add state and import**

At the top of HomeScreen.tsx, add import:

```typescript
import ShiftTimeline from '../components/ShiftTimeline';
```

Inside the component, add state:

```typescript
const [timelineVisible, setTimelineVisible] = useState(false);
```

- [ ] **Step 2: Add onPress to "Dettagli Task" button**

Find the existing button (around line 396):

```typescript
<TouchableOpacity style={s.detailBtn}>
  <Text style={s.detailBtnText}>Dettagli Task</Text>
  <MaterialIcons name="arrow-forward" size={16} color={colors.primaryDark} />
</TouchableOpacity>
```

Replace with:

```typescript
<TouchableOpacity style={s.detailBtn} onPress={() => setTimelineVisible(true)}>
  <Text style={s.detailBtnText}>Dettagli Task</Text>
  <MaterialIcons name="arrow-forward" size={16} color={colors.primaryDark} />
</TouchableOpacity>
```

- [ ] **Step 3: Render ShiftTimeline component**

Before the closing `</ScrollView>` at the end of the JSX, add:

```typescript
{shiftEvent && isWork && (
  <ShiftTimeline
    visible={timelineVisible}
    onClose={() => setTimelineVisible(false)}
    shiftStart={new Date(shiftEvent.startDate)}
    shiftEnd={new Date(shiftEvent.endDate)}
  />
)}
```

- [ ] **Step 4: Test end-to-end**

1. Open the app, go to Home
2. On a day with a "Lavoro" shift, tap "Dettagli Task"
3. Bottom sheet opens with timeline
4. Flights during shift show with CI/gate bars
5. Tap a flight → details expand
6. Tap again → collapses
7. Close the sheet

- [ ] **Step 5: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: wire Dettagli Task button to ShiftTimeline bottom sheet"
```
