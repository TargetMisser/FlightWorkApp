# Flight Operational Times — Design Spec

## Goal
Show check-in and gate opening/closing times on departure flight cards in FlightScreen, calculated from scheduled departure time using per-airline policy tables.

## Scope
- **Departures tab only** — arrivals tab unchanged
- Applies to all departure cards (not just shift flights)
- Single file change: `src/screens/FlightScreen.tsx`

## Data Model

New constant `AIRLINE_OPS` maps airline name keywords to 4 offsets (minutes before departure):

```typescript
type AirlineOps = {
  checkInOpen: number;   // minutes before departure
  checkInClose: number;
  gateOpen: number;
  gateClose: number;
};
```

### Policy Table

| Airline keyword | checkInOpen | checkInClose | gateOpen | gateClose |
|----------------|-------------|--------------|----------|-----------|
| easyjet        | 120         | 40           | 30       | 20        |
| wizz           | 180         | 40           | 30       | 15        |
| ryanair        | 150         | 40           | 30       | 20        |
| aer lingus     | 150         | 40           | 30       | 20        |
| british airways| 180         | 45           | 45       | 20        |
| sas / scandinavian | 120    | 40           | 30       | 20        |
| flydubai       | 180         | 60           | 40       | 20        |
| default        | 120         | 40           | 30       | 20        |

## Logic

```
function getAirlineOps(airlineName: string): AirlineOps
```
Lowercases the airline name and checks for keyword matches against AIRLINE_OPS. Returns default if no match.

Times are computed as:
```
checkInOpenTime  = departureTimestamp - (checkInOpen  * 60)  → formatted HH:MM
checkInCloseTime = departureTimestamp - (checkInClose * 60)
gateOpenTime     = departureTimestamp - (gateOpen     * 60)
gateCloseTime    = departureTimestamp - (gateClose    * 60)
```

If `ts` (departure timestamp) is undefined, the times row is not rendered.

## UI

Layout A (always visible compact row) added to each departure card:
- Thin top border separating it from the main card content
- 4 equal columns: Check-in apre | Check-in chiude | Gate apre | Gate chiude
- Each column: label (9px uppercase), time (11px bold), sublabel (9px "apre"/"chiude")
- Colors: apre → `c.primary` (blue), chiude → `#EF4444` (red), gate apre → `#F59E0B` (amber)
- Only rendered when `activeTab === 'departures'` and `ts` is defined

## Files Changed

| File | Change |
|------|--------|
| `src/screens/FlightScreen.tsx` | Add `AIRLINE_OPS` constant, `getAirlineOps()` function, ops times row in `renderFlight`, new styles in `makeStyles` |
