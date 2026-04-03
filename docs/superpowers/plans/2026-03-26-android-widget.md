# Android Widget — Shift Flights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4x4 Android home screen widget showing today's shift flights with CI/Gate times.

**Architecture:** `react-native-android-widget` provides JSX-based widget rendering via Expo config plugin. A background task handler reads the device calendar for today's shift, fetches FlightRadar24 departures, filters by allowed airlines and shift window, and renders a scrollable flight list. Reuses `src/utils/airlineOps.ts` for shared constants.

**Tech Stack:** react-native-android-widget, expo-calendar, FlightRadar24 API, Expo config plugin

---

### Task 1: Install library and configure project

**Files:**
- Modify: `app.json`
- Modify: `index.ts`

- [ ] **Step 1: Install react-native-android-widget**

```bash
npm install react-native-android-widget
```

- [ ] **Step 2: Create placeholder widget preview image**

```bash
cd "C:\Users\turni\Documents\Progetti Antigravity\FlightWorkApp"
cp assets/icon.png assets/widget-preview.png
```

- [ ] **Step 3: Add widget config plugin to `app.json`**

In `app.json`, add the `react-native-android-widget` entry to the `plugins` array, after the existing `expo-notifications` entry:

```json
[
  "react-native-android-widget",
  {
    "widgets": [
      {
        "name": "ShiftFlights",
        "label": "Turno Voli",
        "minWidth": "250dp",
        "minHeight": "250dp",
        "targetCellWidth": 4,
        "targetCellHeight": 4,
        "description": "Voli del turno corrente con orari CI e Gate",
        "previewImage": "./assets/widget-preview.png",
        "updatePeriodMillis": 1800000,
        "resizeMode": "horizontal|vertical"
      }
    ]
  }
]
```

The full `plugins` array should be:

```json
"plugins": [
  [
    "expo-notifications",
    {
      "icon": "./assets/icon.png",
      "color": "#2563EB",
      "defaultChannel": "voli"
    }
  ],
  [
    "react-native-android-widget",
    {
      "widgets": [
        {
          "name": "ShiftFlights",
          "label": "Turno Voli",
          "minWidth": "250dp",
          "minHeight": "250dp",
          "targetCellWidth": 4,
          "targetCellHeight": 4,
          "description": "Voli del turno corrente con orari CI e Gate",
          "previewImage": "./assets/widget-preview.png",
          "updatePeriodMillis": 1800000,
          "resizeMode": "horizontal|vertical"
        }
      ]
    }
  ]
]
```

- [ ] **Step 4: Register widget task handler in `index.ts`**

Replace `index.ts` content with:

```typescript
import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

registerRootComponent(App);
registerWidgetTaskHandler(widgetTaskHandler);
```

- [ ] **Step 5: Commit**

```bash
git add app.json index.ts assets/widget-preview.png package.json package-lock.json
git commit -m "feat: install react-native-android-widget and configure ShiftFlights widget"
```

---

### Task 2: Create widget task handler (data fetching)

**Files:**
- Create: `src/widgets/widgetTaskHandler.ts`

- [ ] **Step 1: Create `src/widgets/widgetTaskHandler.ts`**

```typescript
import React from 'react';
import * as Calendar from 'expo-calendar';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getAirlineOps, getAirlineColor, ALLOWED_AIRLINES } from '../utils/airlineOps';
import { ShiftWidget } from './ShiftWidget';

// ─── Types ──────────────────────────────────────────────────────────────────────
export type WidgetFlight = {
  flightNumber: string;
  destinationIata: string;
  departureTime: string;
  ciOpen: string;
  ciClose: string;
  gateOpen: string;
  gateClose: string;
  airlineColor: string;
  departureTs: number;
};

export type WidgetData =
  | { state: 'work'; shiftLabel: string; flights: WidgetFlight[]; updatedAt: string }
  | { state: 'work_empty'; shiftLabel: string; updatedAt: string }
  | { state: 'rest' }
  | { state: 'no_shift' }
  | { state: 'error' };

// ─── Helpers ────────────────────────────────────────────────────────────────────
function fmtTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function fmtOffset(depTs: number, offsetMin: number): string {
  return fmtTime(depTs - offsetMin * 60);
}

function nowHHMM(): string {
  return new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

// ─── Fetch shift from device calendar ───────────────────────────────────────────
async function fetchTodayShift(): Promise<
  | { type: 'work'; start: Date; end: Date }
  | { type: 'rest' }
  | null
> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return null;

  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const cal = cals.find(c => c.allowsModifications && c.isPrimary) || cals.find(c => c.allowsModifications);
  if (!cal) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const events = await Calendar.getEventsAsync([cal.id], today, todayEnd);
  const shift = events.find(e => e.title.includes('Lavoro') || e.title.includes('Riposo'));
  if (!shift) return null;

  if (shift.title.includes('Riposo')) return { type: 'rest' };
  return { type: 'work', start: new Date(shift.startDate), end: new Date(shift.endDate) };
}

// ─── Fetch departures from FlightRadar24 ────────────────────────────────────────
async function fetchDepartures(): Promise<any[]> {
  const res = await fetch(
    'https://api.flightradar24.com/common/v1/airport.json?code=psa&plugin[]=schedule&page=1&limit=100',
    { headers: { 'User-Agent': 'Mozilla/5.0' } },
  );
  const json = await res.json();
  const data: any[] = json.result?.response?.airport?.pluginData?.schedule?.departures?.data || [];
  return data.filter(item =>
    ALLOWED_AIRLINES.some(k => (item.flight?.airline?.name || '').toLowerCase().includes(k)),
  );
}

// ─── Build widget data ──────────────────────────────────────────────────────────
async function buildWidgetData(): Promise<WidgetData> {
  const shift = await fetchTodayShift();
  if (shift === null) return { state: 'no_shift' };
  if (shift.type === 'rest') return { state: 'rest' };

  const shiftStartTs = shift.start.getTime() / 1000;
  const shiftEndTs = shift.end.getTime() / 1000;
  const shiftLabel = `${fmtTime(shiftStartTs)} – ${fmtTime(shiftEndTs)}`;

  const allDepartures = await fetchDepartures();

  const flights: WidgetFlight[] = allDepartures
    .filter(item => {
      const ts: number | undefined = item.flight?.time?.scheduled?.departure;
      return ts != null && ts >= shiftStartTs && ts <= shiftEndTs;
    })
    .map(item => {
      const ts: number = item.flight.time.scheduled.departure;
      const airline: string = item.flight?.airline?.name || 'Sconosciuta';
      const ops = getAirlineOps(airline);
      return {
        flightNumber: item.flight?.identification?.number?.default || 'N/A',
        destinationIata: item.flight?.airport?.destination?.code?.iata || '???',
        departureTs: ts,
        departureTime: fmtTime(ts),
        ciOpen: fmtOffset(ts, ops.checkInOpen),
        ciClose: fmtOffset(ts, ops.checkInClose),
        gateOpen: fmtOffset(ts, ops.gateOpen),
        gateClose: fmtOffset(ts, ops.gateClose),
        airlineColor: getAirlineColor(airline),
      };
    })
    .sort((a, b) => a.departureTs - b.departureTs);

  if (flights.length === 0) {
    return { state: 'work_empty', shiftLabel, updatedAt: nowHHMM() };
  }

  return { state: 'work', shiftLabel, flights, updatedAt: nowHHMM() };
}

// ─── Task handler ───────────────────────────────────────────────────────────────
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      let data: WidgetData;
      try {
        data = await buildWidgetData();
      } catch {
        data = { state: 'error' };
      }
      props.renderWidget(<ShiftWidget data={data} />);
      break;
    }

    case 'WIDGET_CLICK': {
      if (props.clickAction === 'REFRESH') {
        let data: WidgetData;
        try {
          data = await buildWidgetData();
        } catch {
          data = { state: 'error' };
        }
        props.renderWidget(<ShiftWidget data={data} />);
      }
      break;
    }

    case 'WIDGET_DELETED':
    default:
      break;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/widgets/widgetTaskHandler.ts
git commit -m "feat: add widget task handler with calendar and flight data fetching"
```

---

### Task 3: Create widget JSX component (UI)

**Files:**
- Create: `src/widgets/ShiftWidget.tsx`

- [ ] **Step 1: Create `src/widgets/ShiftWidget.tsx`**

```tsx
import React from 'react';
import { FlexWidget, TextWidget, ListWidget } from 'react-native-android-widget';
import type { WidgetData, WidgetFlight } from './widgetTaskHandler';

const BG = '#0F172A';
const HEADER_BG = '#1E293B';
const TEXT = '#F1F5F9';
const MUTED = '#94A3B8';
const ORANGE = '#F59E0B';
const BLUE = '#3B82F6';

function FlightRow({ flight, index }: { flight: WidgetFlight; index: number }) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: index % 2 === 0 ? '#1E293B' : '#162032',
        flexDirection: 'column',
      }}
      clickAction="OPEN_APP"
    >
      {/* Flight number + destination + departure */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text={flight.flightNumber}
            style={{ fontSize: 14, fontWeight: 'bold', color: TEXT }}
          />
          <TextWidget
            text={`  ${flight.destinationIata}`}
            style={{ fontSize: 12, color: MUTED }}
          />
        </FlexWidget>
        <TextWidget
          text={flight.departureTime}
          style={{ fontSize: 14, fontWeight: 'bold', color: TEXT }}
        />
      </FlexWidget>
      {/* CI + Gate times */}
      <FlexWidget
        style={{ width: 'match_parent', flexDirection: 'row', marginTop: 2 }}
      >
        <TextWidget
          text={`CI ${flight.ciOpen}-${flight.ciClose}`}
          style={{ fontSize: 11, color: ORANGE, fontWeight: 'bold' }}
        />
        <TextWidget
          text={`   Gate ${flight.gateOpen}-${flight.gateClose}`}
          style={{ fontSize: 11, color: BLUE, fontWeight: 'bold' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function ShiftWidget({ data }: { data: WidgetData }) {
  // ── Rest day ──
  if (data.state === 'rest') {
    return (
      <FlexWidget
        style={{
          height: 'match_parent', width: 'match_parent',
          backgroundColor: BG, borderRadius: 20,
          justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget text="🌴" style={{ fontSize: 40 }} />
        <TextWidget
          text="Giorno di Riposo"
          style={{ fontSize: 18, fontWeight: 'bold', color: TEXT, marginTop: 8 }}
        />
      </FlexWidget>
    );
  }

  // ── No shift ──
  if (data.state === 'no_shift') {
    return (
      <FlexWidget
        style={{
          height: 'match_parent', width: 'match_parent',
          backgroundColor: BG, borderRadius: 20,
          justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="Nessun turno oggi"
          style={{ fontSize: 16, color: MUTED }}
        />
      </FlexWidget>
    );
  }

  // ── Error ──
  if (data.state === 'error') {
    return (
      <FlexWidget
        style={{
          height: 'match_parent', width: 'match_parent',
          backgroundColor: BG, borderRadius: 20,
          justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
        }}
        clickAction="REFRESH"
      >
        <TextWidget
          text="Aggiornamento fallito"
          style={{ fontSize: 14, color: '#EF4444' }}
        />
        <TextWidget
          text="Tocca per riprovare"
          style={{ fontSize: 12, color: MUTED, marginTop: 4 }}
        />
      </FlexWidget>
    );
  }

  // ── Work shift, no flights ──
  if (data.state === 'work_empty') {
    return (
      <FlexWidget
        style={{
          height: 'match_parent', width: 'match_parent',
          backgroundColor: BG, borderRadius: 20,
          flexDirection: 'column', overflow: 'hidden',
        }}
        clickAction="OPEN_APP"
      >
        <FlexWidget
          style={{
            width: 'match_parent', backgroundColor: HEADER_BG,
            paddingVertical: 10, paddingHorizontal: 14,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
          }}
        >
          <TextWidget
            text={`✈  Turno Lavoro  ${data.shiftLabel}`}
            style={{ fontSize: 14, fontWeight: 'bold', color: TEXT }}
          />
        </FlexWidget>
        <FlexWidget
          style={{ flex: 1, width: 'match_parent', justifyContent: 'center', alignItems: 'center' }}
        >
          <TextWidget text="Nessuna partenza" style={{ fontSize: 14, color: MUTED }} />
        </FlexWidget>
        <FlexWidget
          style={{
            width: 'match_parent', backgroundColor: HEADER_BG,
            paddingVertical: 6, paddingHorizontal: 14,
            borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
          }}
        >
          <TextWidget
            text={`Ultimo aggiornamento: ${data.updatedAt}`}
            style={{ fontSize: 10, color: MUTED }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── Work shift with flights ──
  return (
    <FlexWidget
      style={{
        height: 'match_parent', width: 'match_parent',
        backgroundColor: BG, borderRadius: 20,
        flexDirection: 'column', overflow: 'hidden',
      }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          width: 'match_parent', backgroundColor: HEADER_BG,
          paddingVertical: 10, paddingHorizontal: 14,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={`✈  Turno Lavoro  ${data.shiftLabel}`}
          style={{ fontSize: 14, fontWeight: 'bold', color: TEXT }}
        />
      </FlexWidget>

      {/* Scrollable flight list */}
      <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
        {data.flights.map((flight, i) => (
          <FlightRow key={`${flight.flightNumber}-${i}`} flight={flight} index={i} />
        ))}
      </ListWidget>

      {/* Footer */}
      <FlexWidget
        style={{
          width: 'match_parent', backgroundColor: HEADER_BG,
          paddingVertical: 6, paddingHorizontal: 14,
          borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={`Ultimo aggiornamento: ${data.updatedAt}`}
          style={{ fontSize: 10, color: MUTED }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/widgets/ShiftWidget.tsx
git commit -m "feat: create ShiftWidget component with all visual states"
```

---

### Task 4: Build and verify

- [ ] **Step 1: Rebuild native project**

```bash
npx expo prebuild --clean
npx expo run:android
```

Or for EAS:

```bash
eas build --profile development --platform android
```

- [ ] **Step 2: Add widget to home screen**

1. Long-press Android home screen
2. Select "Widgets"
3. Find "FlightWorkApp" > "Turno Voli"
4. Drag 4x4 widget to home screen
5. Widget should fetch and render immediately

- [ ] **Step 3: Verify all states**

| State | Trigger | Expected |
|---|---|---|
| Work + flights | Lavoro event today during flight hours | Header + scrollable flight list + footer |
| Work + empty | Lavoro event at 02:00-04:00 (no flights) | Header + "Nessuna partenza" + footer |
| Rest | Riposo event today | Palm + "Giorno di Riposo" |
| No shift | No shift event today | "Nessun turno oggi" |
| Error | Airplane mode | "Aggiornamento fallito" + "Tocca per riprovare" |

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: widget adjustments after testing"
```
