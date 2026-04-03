# Flight Card Rework — Design Spec

## Goal
Rework the flight cards in FlightScreen to be visually recognizable by airline, and set Departures as the default tab.

## Changes

### 1. Default tab
Change `useState<'arrivals' | 'departures'>('arrivals')` → `('departures')`.

### 2. Card layout — B2

Replace the current card structure (AirlineLogo box + separate opsRow) with a two-section card:

#### Header (colored, airline gradient)
- Background: `linear-gradient` using airline brand color (same colors as `airlineColors` map)
- **Left side:** logo pill (white semi-opaque bg, 52×32px, rounded) showing airline logo image from avs.io or initials fallback in brand color — then flight number (bold white, 15px) + airline name (white 80% opacity, 10px)
- **Right side:** scheduled time (bold white, 18px) + destination or origin city (white 80% opacity, 10px)

#### Body (card background)
- **Departures:** `🖥 CI HH:MM–HH:MM · 🚪 Gate HH:MM–HH:MM` (9–10px, textSub color) + status pill aligned right
- **Arrivals:** `Da: [origin city name or IATA]` (10px, textSub) + status pill aligned right
- Single-row layout, padding 8–10px horizontal

#### Shift banner
Unchanged: `⭐ DURANTE IL TUO TURNO` amber banner rendered **above** the header when `duringShift` is true.

### 3. Removed
- Old `AirlineLogo` component (replaced by inline logo pill in header)
- Separate `opsRow` / `opsCell` / `opsDivider` / `opsLabel` / `opsTime` / `opsSub` styles (ops info now inline in body)
- Old card styles: `cardRow`, `airlineName`, `flightNum`, `route`, `routeDest`, `time`, `statusPill`, `statusText`

### 4. Kept
- `AIRLINE_OPS` table and `getAirlineOps()` function (used to compute CI/gate times for body)
- `airlineColors` map and `getAirlineColor()` (used for header gradient)
- `logoStyles` static StyleSheet → replaced by inline styles in header
- Status color logic (`raw === 'green' ? '#10b981' : ...`)

## Files Changed
| File | Change |
|------|--------|
| `src/screens/FlightScreen.tsx` | Default tab state, reworked `renderFlight`, updated `makeStyles` |

## New Styles Needed
- `cardHeader`: flexDirection row, justifyContent space-between, alignItems center, padding 10/14px
- `headerLogoPill`: width 52, height 32, borderRadius 8, backgroundColor rgba(255,255,255,0.9), justifyContent/alignItems center, overflow hidden
- `headerLogoImg`: width 44, height 26, resizeMode contain
- `headerLeft`: flexDirection row, alignItems center, gap 10
- `headerFlightNum`: color #fff, fontWeight 900, fontSize 15
- `headerAirlineName`: color rgba(255,255,255,0.8), fontSize 10
- `headerTime`: color #fff, fontWeight 900, fontSize 18
- `headerDest`: color rgba(255,255,255,0.8), fontSize 10, textAlign right
- `cardBody`: flexDirection row, alignItems center, padding 8/14px, backgroundColor c.card
- `bodyInfo`: flex 1, fontSize 10, color c.textSub
- `statusPill`: paddingHorizontal 8, paddingVertical 3, borderRadius 20
- `statusText`: fontSize 10, fontWeight 700
