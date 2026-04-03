# Flight Operational Times Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact 4-column row to each departure flight card showing check-in open/close and gate open/close times, calculated from the scheduled departure time using a per-airline policy table.

**Architecture:** Single file change to `src/screens/FlightScreen.tsx`. Add a module-level `AIRLINE_OPS` lookup table and `getAirlineOps()` helper, then render an ops times row inside `renderFlight` when `activeTab === 'departures'` and a departure timestamp exists.

**Tech Stack:** React Native, existing FlightScreen patterns (`makeStyles`, `useAppTheme`, `useCallback`)

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `src/screens/FlightScreen.tsx` | Add `AIRLINE_OPS` + `getAirlineOps()`, ops row in `renderFlight`, new styles in `makeStyles` |

---

### Task 1: Add AIRLINE_OPS table and getAirlineOps() helper

**Files:**
- Modify: `src/screens/FlightScreen.tsx`

- [ ] **Step 1: Add AirlineOps type and AIRLINE_OPS constant**

In `src/screens/FlightScreen.tsx`, find the existing `airlineColors` block (around line 31):

```typescript
const airlineColors: Record<string, string> = {
  'wizz': '#C6006E', 'easyjet': '#FF6600', ...
};
function getAirlineColor(name: string) { ... }
```

Insert the following **after** `getAirlineColor` (after line ~38):

```typescript
type AirlineOps = { checkInOpen: number; checkInClose: number; gateOpen: number; gateClose: number };

const DEFAULT_OPS: AirlineOps = { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 20 };

const AIRLINE_OPS: Array<{ key: string; ops: AirlineOps }> = [
  { key: 'easyjet',           ops: { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'wizz',              ops: { checkInOpen: 180, checkInClose: 40, gateOpen: 30, gateClose: 15 } },
  { key: 'ryanair',           ops: { checkInOpen: 150, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'aer lingus',        ops: { checkInOpen: 150, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'british airways',   ops: { checkInOpen: 180, checkInClose: 45, gateOpen: 45, gateClose: 20 } },
  { key: 'sas',               ops: { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'scandinavian',      ops: { checkInOpen: 120, checkInClose: 40, gateOpen: 30, gateClose: 20 } },
  { key: 'flydubai',          ops: { checkInOpen: 180, checkInClose: 60, gateOpen: 40, gateClose: 20 } },
];

function getAirlineOps(name: string): AirlineOps {
  const lower = name.toLowerCase();
  return AIRLINE_OPS.find(({ key }) => lower.includes(key))?.ops ?? DEFAULT_OPS;
}
```

- [ ] **Step 2: Add ops row inside renderFlight**

In `renderFlight` (around line 223), find the existing return block. The card currently ends with `</View>` closing the `<View style={s.card}>`. The full card structure is:

```tsx
return (
  <View style={[s.card, duringShift && s.cardShift]}>
    {duringShift && <View style={s.shiftBanner}>...</View>}
    <View style={s.cardRow}>
      ...
    </View>
  </View>
);
```

Replace the return with:

```tsx
const ops = activeTab === 'departures' && ts ? getAirlineOps(airline) : null;
const fmt = (offsetMin: number) =>
  ts ? new Date((ts - offsetMin * 60) * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';

return (
  <View style={[s.card, duringShift && s.cardShift]}>
    {duringShift && <View style={s.shiftBanner}><Text style={s.shiftBannerText}>⭐ DURANTE IL TUO TURNO</Text></View>}
    <View style={s.cardRow}>
      <AirlineLogo iataCode={iataCode} airlineName={airline} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={s.airlineName}>{airline}</Text>
        <Text style={s.flightNum}>{flightNumber}</Text>
        <Text style={s.route}>{activeTab === 'arrivals' ? 'Da: ' : 'Per: '}<Text style={s.routeDest}>{originDest}</Text></Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.time}>{time}</Text>
        <View style={[s.statusPill, { backgroundColor: statusColor + '22' }]}>
          <Text style={[s.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>
    </View>
    {ops && (
      <View style={s.opsRow}>
        <View style={s.opsCell}>
          <Text style={s.opsLabel}>Check-in</Text>
          <Text style={[s.opsTime, { color: '#2563EB' }]}>{fmt(ops.checkInOpen)}</Text>
          <Text style={s.opsSub}>apre</Text>
        </View>
        <View style={s.opsDivider} />
        <View style={s.opsCell}>
          <Text style={s.opsLabel}>Check-in</Text>
          <Text style={[s.opsTime, { color: '#EF4444' }]}>{fmt(ops.checkInClose)}</Text>
          <Text style={s.opsSub}>chiude</Text>
        </View>
        <View style={s.opsDivider} />
        <View style={s.opsCell}>
          <Text style={s.opsLabel}>Gate</Text>
          <Text style={[s.opsTime, { color: '#F59E0B' }]}>{fmt(ops.gateOpen)}</Text>
          <Text style={s.opsSub}>apre</Text>
        </View>
        <View style={s.opsDivider} />
        <View style={s.opsCell}>
          <Text style={s.opsLabel}>Gate</Text>
          <Text style={[s.opsTime, { color: '#EF4444' }]}>{fmt(ops.gateClose)}</Text>
          <Text style={s.opsSub}>chiude</Text>
        </View>
      </View>
    )}
  </View>
);
```

Note: the `ops` and `fmt` variables must be placed **inside** `renderFlight`, just before the `return` statement.

- [ ] **Step 3: Add ops styles to makeStyles**

In `makeStyles(c: any)` at the bottom of the file, add these entries inside `StyleSheet.create({...})` alongside the existing styles:

```typescript
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

- [ ] **Step 4: Commit**

```bash
git add src/screens/FlightScreen.tsx
git commit -m "feat: show check-in and gate times on departure flight cards"
```

---

## Self-Review

**Spec coverage:**
- ✅ Departures tab only — `ops` computed only when `activeTab === 'departures'`
- ✅ All 4 times shown — checkInOpen, checkInClose, gateOpen, gateClose
- ✅ Per-airline policy table — `AIRLINE_OPS` with all 7 airlines + default
- ✅ Calculated from departure timestamp — `ts - offsetMin * 60`
- ✅ Layout A (always visible compact row) — `opsRow` with 4 `opsCell` columns
- ✅ Colors: apre=blue, chiude=red, gate apre=amber — applied inline on `opsTime`
- ✅ Themed background — `c.cardSecondary` + `c.border`
- ✅ Single file change — only `FlightScreen.tsx`

**Placeholder scan:** None found.

**Type consistency:** `AirlineOps` defined once, used in `AIRLINE_OPS`, `DEFAULT_OPS`, and `getAirlineOps()` return type. `ops` variable typed as `AirlineOps | null`. `fmt` is a local arrow function inside `renderFlight`. All consistent.
