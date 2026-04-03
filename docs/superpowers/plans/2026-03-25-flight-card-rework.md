# Flight Card Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework FlightScreen flight cards to B2 layout (colored airline header + compact body), and set Departures as default tab.

**Architecture:** Single file edit (`src/screens/FlightScreen.tsx`). Replace `AirlineLogo` component with inline `LogoPill`, rewrite `renderFlight` with two-section card, swap old card styles for new ones. No new files.

**Tech Stack:** React Native, TypeScript, `StyleSheet.create`, `Image`, existing `getAirlineColor`/`getAirlineOps` helpers.

---

### Task 1: Set Departures as default tab

**Files:**
- Modify: `src/screens/FlightScreen.tsx:153`

- [ ] **Step 1: Make the change**

In `src/screens/FlightScreen.tsx` at line 153, change:
```typescript
const [activeTab, setActiveTab] = useState<'arrivals' | 'departures'>('arrivals');
```
to:
```typescript
const [activeTab, setActiveTab] = useState<'arrivals' | 'departures'>('departures');
```

- [ ] **Step 2: Verify**

Open the app in Expo Go. Navigate to the Voli screen. Confirm the "🛫 Partenze" tab is selected by default when the screen loads.

- [ ] **Step 3: Commit**

```bash
git add src/screens/FlightScreen.tsx
git commit -m "feat: set Departures as default tab in FlightScreen"
```

---

### Task 2: Replace AirlineLogo with LogoPill + add new styles to makeStyles

**Files:**
- Modify: `src/screens/FlightScreen.tsx:61-83` (replace component + logoStyles)
- Modify: `src/screens/FlightScreen.tsx:392-434` (add new styles to makeStyles)

- [ ] **Step 1: Replace AirlineLogo component and logoStyles**

Remove lines 61–83 entirely (the `function AirlineLogo` block and `const logoStyles = StyleSheet.create(...)`) and replace with:

```typescript
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
```

- [ ] **Step 2: Add new card styles to makeStyles**

Inside the `makeStyles` function (at the end of the `StyleSheet.create({...})` object, before the closing `})`), add these new entries after the existing `opsSub` line:

```typescript
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerFlightNum: { color: '#fff', fontWeight: '900', fontSize: 15, lineHeight: 18 },
    headerAirlineName: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
    headerTime: { color: '#fff', fontWeight: '900', fontSize: 18, lineHeight: 20, textAlign: 'right' },
    headerDest: { color: 'rgba(255,255,255,0.8)', fontSize: 10, textAlign: 'right' },
    cardBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 14, backgroundColor: c.card },
    bodyInfo: { flex: 1, fontSize: 9, color: c.textSub },
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/FlightScreen.tsx
git commit -m "feat: add LogoPill component and new card styles"
```

---

### Task 3: Rewrite renderFlight with B2 layout + remove old styles

**Files:**
- Modify: `src/screens/FlightScreen.tsx:260-325` (replace renderFlight body)
- Modify: `src/screens/FlightScreen.tsx:411-432` (remove old card styles from makeStyles)

- [ ] **Step 1: Replace renderFlight body**

Replace lines 279–324 (the `return (` block inside `renderFlight`) with the following. Keep the variable declarations above (`flightNumber`, `airline`, `iataCode`, `statusText`, `raw`, `statusColor`, `originDest`, `ts`, `time`, `duringShift`, `color`, `ops`, `fmt`) unchanged.

```typescript
    return (
      <View style={[s.card, duringShift && s.cardShift]}>
        {duringShift && <View style={s.shiftBanner}><Text style={s.shiftBannerText}>⭐ DURANTE IL TUO TURNO</Text></View>}
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
            <Text style={s.bodyInfo}>
              {`🖥 CI ${fmt(ops.checkInOpen)}–${fmt(ops.checkInClose)} · 🚪 Gate ${fmt(ops.gateOpen)}–${fmt(ops.gateClose)}`}
            </Text>
          ) : (
            <Text style={s.bodyInfo}>{`Da: ${originDest}`}</Text>
          )}
          <View style={[s.statusPill, { backgroundColor: statusColor + '22' }]}>
            <Text style={[s.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>
      </View>
    );
```

- [ ] **Step 2: Remove old card styles from makeStyles**

In the `makeStyles` function, remove these entries entirely:

```typescript
    cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    airlineName: { fontSize: 12, color: c.textSub, marginBottom: 1 },
    flightNum: { fontSize: 17, fontWeight: 'bold', color: c.primaryDark },
    route: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    routeDest: { color: c.text, fontWeight: '600' },
    time: { fontSize: 20, fontWeight: 'bold', color: c.primary },
    opsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: c.cardSecondary,
    },
    opsCell: { flex: 1, alignItems: 'center', gap: 2 },
    opsDivider: { width: 1, height: 28, backgroundColor: c.border },
    opsLabel: { fontSize: 9, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
    opsTime: { fontSize: 13, fontWeight: '700' },
    opsSub: { fontSize: 9, color: c.textMuted },
```

Keep these existing entries untouched:
- `card`, `cardShift`, `shiftBanner`, `shiftBannerText`, `statusPill`, `statusText`
- All page/nav styles (`pageHeader`, `notifBtn`, `notifBtnActive`, `notifBadge`, `notifBadgeTxt`, `pageTitle`, `pageSub`, `controlsRow`, `segment`, `segBtn`, `segBtnActive`, `segBtnText`, `segBtnTextActive`)

- [ ] **Step 3: Verify in Expo**

Open app → Voli screen. Check:
- [ ] Departures tab active by default
- [ ] Each departure card shows a colored header (airline brand color) with white logo pill, flight number, airline name, time, and city
- [ ] Body row shows `🖥 CI HH:MM–HH:MM · 🚪 Gate HH:MM–HH:MM` on the left and status pill on the right
- [ ] Arrivals tab: each card shows colored header (same layout), body shows `Da: [city]` + status pill
- [ ] Shift banner (amber) renders above the header for shift flights
- [ ] Dark mode / weather mode — header stays colored, body uses `c.card` background

- [ ] **Step 4: Commit**

```bash
git add src/screens/FlightScreen.tsx
git commit -m "feat: rework flight cards to B2 layout with colored airline header"
```
