# Pin Flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user swipe-left on a flight card to pin it, showing it on HomeScreen and receiving step-by-step operational notifications.

**Architecture:** Pin state stored in AsyncStorage (`pinned_flight_v1`). FlightScreen adds swipe-to-reveal via Animated+PanResponder on each card. HomeScreen reads the pin on mount and renders a gold-bordered card at the top. Pinned notification IDs stored separately (`pinned_notif_ids_v1`) so they can be cancelled independently.

**Tech Stack:** React Native (Animated, PanResponder), AsyncStorage, expo-notifications, existing `getAirlineOps`/`getAirlineColor` utils.

---

### Task 1: Pin/Unpin Storage & Notification Helpers (FlightScreen)

**Files:**
- Modify: `src/screens/FlightScreen.tsx:13-14` (add constants)
- Modify: `src/screens/FlightScreen.tsx` (add helper functions after existing notification helpers)

- [ ] **Step 1: Add storage constants and pinned state**

At the top of `FlightScreen.tsx`, after the existing `NOTIF_ENABLED_KEY` constant (line 14), add:

```tsx
const PINNED_FLIGHT_KEY = 'pinned_flight_v1';
const PINNED_NOTIF_IDS_KEY = 'pinned_notif_ids_v1';
```

Inside the `FlightScreen` component, after the existing state declarations (around line 124), add:

```tsx
const [pinnedFlightId, setPinnedFlightId] = useState<string | null>(null);
```

- [ ] **Step 2: Load pinned flight ID on mount**

Inside the existing `fetchAll` function, after `setRefreshing(false)` in the `finally` block (around line 172), this won't work cleanly. Instead, add a separate `useEffect` after the existing ones (after line 175):

```tsx
useEffect(() => {
  AsyncStorage.getItem(PINNED_FLIGHT_KEY).then(raw => {
    if (!raw) return;
    try {
      const pinned = JSON.parse(raw);
      const id = pinned.flight?.identification?.id;
      if (id) setPinnedFlightId(id);
    } catch {}
  });
}, []);
```

- [ ] **Step 3: Add schedulePinnedNotifications helper**

After the existing `scheduleShiftNotifications` function (around line 110), add:

```tsx
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
```

- [ ] **Step 4: Add pinFlight and unpinFlight handlers**

Inside the `FlightScreen` component, after the `toggleNotifications` callback (around line 213), add:

```tsx
const pinFlight = useCallback(async (item: any) => {
  const id = item.flight?.identification?.id;
  if (!id) return;
  const tab = activeTab;
  await AsyncStorage.setItem(PINNED_FLIGHT_KEY, JSON.stringify({ ...item, _pinTab: tab, _pinnedAt: Date.now() }));
  setPinnedFlightId(id);
  await schedulePinnedNotifications(item, tab);
  Alert.alert('Volo pinnato', `${item.flight?.identification?.number?.default || 'Volo'} è ora il tuo volo pinnato.`);
}, [activeTab]);

const unpinFlight = useCallback(async () => {
  await AsyncStorage.removeItem(PINNED_FLIGHT_KEY);
  await cancelPinnedNotifications();
  setPinnedFlightId(null);
}, []);
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/FlightScreen.tsx
git commit -m "feat(pin): add pin/unpin storage and notification helpers"
```

---

### Task 2: Swipe-to-Pin on Flight Cards (FlightScreen)

**Files:**
- Modify: `src/screens/FlightScreen.tsx` (import `Animated`, `PanResponder`; wrap card in swipeable)

- [ ] **Step 1: Add Animated to imports**

Update the React Native import at line 2-5 to include `Animated` and `PanResponder` (if not already imported — `Animated` is not currently imported in FlightScreen):

```tsx
import {
  View, Text, StyleSheet, ActivityIndicator,
  FlatList, TouchableOpacity, RefreshControl, Image, Alert,
  Animated, PanResponder,
} from 'react-native';
```

- [ ] **Step 2: Create SwipeableFlightCard wrapper component**

Before the `FlightScreen` component (after the `LogoPill` component), add a new component that wraps a flight card with swipe-to-reveal:

```tsx
const SWIPE_THRESHOLD = -60;
const PIN_ACTION_WIDTH = 80;

function SwipeableFlightCard({
  children,
  isPinned,
  onPin,
  onUnpin,
}: {
  children: React.ReactNode;
  isPinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
}) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const isOpen = React.useRef(false);

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -PIN_ACTION_WIDTH));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, { toValue: -PIN_ACTION_WIDTH, useNativeDriver: true }).start();
          isOpen.current = true;
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          isOpen.current = false;
        }
      },
    })
  ).current;

  const close = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    isOpen.current = false;
  };

  return (
    <View style={{ position: 'relative', marginBottom: 10 }}>
      {/* Action behind the card */}
      <TouchableOpacity
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: PIN_ACTION_WIDTH, borderRadius: 14,
          backgroundColor: isPinned ? '#EF4444' : '#F59E0B',
          justifyContent: 'center', alignItems: 'center',
        }}
        onPress={() => {
          if (isPinned) onUnpin(); else onPin();
          close();
        }}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 20 }}>{isPinned ? '📌' : '📌'}</Text>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>
          {isPinned ? 'UNPIN' : 'PIN'}
        </Text>
      </TouchableOpacity>

      {/* Sliding card */}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}
```

- [ ] **Step 3: Wrap the flight card in SwipeableFlightCard**

In `renderFlight`, replace the return statement. Change the current return (line 249-293):

From:
```tsx
    return (
      <View style={[s.card, duringShift && s.cardShift]}>
        {duringShift && ...}
        ...
      </View>
    );
```

To:
```tsx
    const flightId = item.flight?.identification?.id;
    const isPinned = flightId === pinnedFlightId;

    return (
      <SwipeableFlightCard
        isPinned={isPinned}
        onPin={() => pinFlight(item)}
        onUnpin={unpinFlight}
      >
        <View style={[s.card, duringShift && s.cardShift, isPinned && s.cardPinned, { marginBottom: 0 }]}>
          {duringShift && <View style={s.shiftBanner}><Text style={s.shiftBannerText}>DURANTE IL TUO TURNO</Text></View>}
          {isPinned && <View style={s.pinBanner}><Text style={s.pinBannerText}>📌 PINNATO</Text></View>}
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
                    <Text style={s.opsTime}>{fmt(ops.gateOpen)} – {fmt(ops.gateClose)}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={s.bodyInfo}>{`Da: ${originDest}`}</Text>
            )}
            <View style={[s.statusPill, { backgroundColor: statusColor + '22' }]}>
              <Text style={[s.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>
        </View>
      </SwipeableFlightCard>
    );
```

- [ ] **Step 4: Update renderFlight dependencies**

The `useCallback` dependency array for `renderFlight` needs `pinnedFlightId`, `pinFlight`, and `unpinFlight`:

```tsx
  }, [activeTab, userShift, s, pinnedFlightId, pinFlight, unpinFlight]);
```

- [ ] **Step 5: Add pin styles**

In the `makeStyles` function, add after `shiftBannerText` (line 379):

```tsx
    cardPinned: { borderWidth: 2, borderColor: '#F59E0B' },
    pinBanner: { backgroundColor: '#F59E0B', paddingVertical: 5, paddingHorizontal: 12 },
    pinBannerText: { color: '#fff', fontWeight: 'bold', fontSize: 11, letterSpacing: 0.5 },
```

- [ ] **Step 6: Remove marginBottom from card style**

The `SwipeableFlightCard` now handles `marginBottom: 10`, so the original card style should not double it. However, since `s.card` is also used for the card's visual styling, the cleanest approach is to override it inline as shown in Step 3 (`{ marginBottom: 0 }`).

- [ ] **Step 7: Commit**

```bash
git add src/screens/FlightScreen.tsx
git commit -m "feat(pin): add swipe-to-pin interaction on flight cards"
```

---

### Task 3: Pinned Flight Card on HomeScreen

**Files:**
- Modify: `src/screens/HomeScreen.tsx` (add pinned flight card, imports, state)

- [ ] **Step 1: Add imports**

Add to the existing imports in HomeScreen:

```tsx
import { getAirlineOps, getAirlineColor } from '../utils/airlineOps';
```

Also add the constant:

```tsx
const PINNED_FLIGHT_KEY = 'pinned_flight_v1';
```

- [ ] **Step 2: Add pinned flight state and loading**

Inside the `HomeScreen` component, after the existing state declarations, add:

```tsx
const [pinnedFlight, setPinnedFlight] = useState<any>(null);
```

Add a `useEffect` to load the pinned flight (near the other `useEffect` hooks):

```tsx
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
      // Auto-clear if flight is in the past
      if (ts && ts < Date.now() / 1000) {
        await AsyncStorage.removeItem(PINNED_FLIGHT_KEY);
        setPinnedFlight(null);
      } else {
        setPinnedFlight(pinned);
      }
    } catch { setPinnedFlight(null); }
  };
  loadPinned();

  // Re-check when screen comes back into focus
  const interval = setInterval(loadPinned, 30000);
  return () => clearInterval(interval);
}, []);
```

- [ ] **Step 3: Add the PinnedFlightCard component**

Before the `HomeScreen` component, add:

```tsx
function PinnedFlightCard({ item, colors }: { item: any; colors: any }) {
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
  const depTime = ts ? new Date(ts * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'N/A';

  const ops = getAirlineOps(airline);
  const fmt = (offsetMin: number) =>
    ts ? new Date((ts - offsetMin * 60) * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <View style={{
      marginHorizontal: 16, marginTop: 12,
      borderRadius: 14, borderWidth: 2, borderColor: '#F59E0B',
      overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    }}>
      {/* Gold banner */}
      <View style={{ backgroundColor: '#F59E0B', paddingVertical: 5, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11, letterSpacing: 0.5 }}>📌 VOLO PINNATO</Text>
        <Text style={{ color: '#fff', fontSize: 10 }}>{tab === 'arrivals' ? 'ARRIVO' : 'PARTENZA'}</Text>
      </View>

      {/* Header with airline color */}
      <View style={{
        backgroundColor: airlineColor,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 10, paddingHorizontal: 14,
      }}>
        <View>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{flightNumber}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>{airline}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>{depTime}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>→ {dest}</Text>
        </View>
      </View>

      {/* Body with ops times (departures) or origin (arrivals) */}
      <View style={{ backgroundColor: colors.card, padding: 12 }}>
        {tab === 'departures' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
              <MaterialIcons name="desktop-windows" size={16} color={colors.primary} />
              <View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSub }}>Check-in</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primaryDark }}>{fmt(ops.checkInOpen)} – {fmt(ops.checkInClose)}</Text>
              </View>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
              <MaterialIcons name="meeting-room" size={16} color={colors.primary} />
              <View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSub }}>Gate</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primaryDark }}>{fmt(ops.gateOpen)} – {fmt(ops.gateClose)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 12, color: colors.textSub }}>
            Da: {item.flight?.airport?.origin?.name || item.flight?.airport?.origin?.code?.iata || 'N/A'}
          </Text>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <View style={{ backgroundColor: statusColor + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor }}>{statusText}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Render the pinned card in the JSX**

In the HomeScreen's return JSX, after the closing `</View>` of the top row (weather + date, around line 362), add:

```tsx
      {/* Pinned flight */}
      {pinnedFlight && <PinnedFlightCard item={pinnedFlight} colors={colors} />}
```

- [ ] **Step 5: Add MaterialIcons import if not present**

Check that `MaterialIcons` is already imported (it is — line 12 of HomeScreen). No action needed.

- [ ] **Step 6: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat(pin): show pinned flight card on HomeScreen"
```

---

### Task 4: Auto-Clear Expired Pin

**Files:**
- Modify: `src/screens/FlightScreen.tsx` (clear stale pin on data refresh)

- [ ] **Step 1: Add auto-clear in fetchAll**

Inside the `fetchAll` function, after `setDepartures(fetchedDepartures)` (line 141), add:

```tsx
      // Auto-clear expired pinned flight
      const pinnedRaw = await AsyncStorage.getItem(PINNED_FLIGHT_KEY);
      if (pinnedRaw) {
        try {
          const pinned = JSON.parse(pinnedRaw);
          const pinTab = pinned._pinTab || 'departures';
          const pinTs = pinTab === 'arrivals'
            ? pinned.flight?.time?.scheduled?.arrival
            : pinned.flight?.time?.scheduled?.departure;
          if (pinTs && pinTs < Date.now() / 1000) {
            await AsyncStorage.removeItem(PINNED_FLIGHT_KEY);
            await cancelPinnedNotifications();
            setPinnedFlightId(null);
          }
        } catch {}
      }
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/FlightScreen.tsx
git commit -m "feat(pin): auto-clear expired pinned flight on refresh"
```

---

### Task 5: Manual Testing & Verification

- [ ] **Step 1: Start the dev server**

```bash
npx expo start
```

- [ ] **Step 2: Test swipe-to-pin**

1. Open FlightScreen
2. Swipe left on any flight card — gold PIN button should appear
3. Tap PIN — alert should confirm the flight is pinned
4. The card should show a gold "📌 PINNATO" banner
5. Swipe on the same card — red UNPIN button should appear
6. Swipe on a different card and pin it — the previous pin should be replaced

- [ ] **Step 3: Test HomeScreen card**

1. Pin a flight from FlightScreen
2. Navigate to HomeScreen
3. A gold-bordered card with flight details should appear below the weather section
4. If departure, check-in and gate times should be shown

- [ ] **Step 4: Test auto-clear**

1. Pin a flight that has already departed
2. Pull-to-refresh on FlightScreen
3. The pin should be automatically cleared

- [ ] **Step 5: Test notifications**

1. Pin a departure flight
2. Check that notification permissions are granted
3. Verify scheduled notifications cover: check-in open, gate open, gate close, departure -10 min
4. Unpin and verify notifications are cancelled

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(pin): complete pin flight feature"
```
