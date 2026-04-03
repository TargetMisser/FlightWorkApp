# Pin Flight — Design Spec

## Overview

Allow the user to pin a single flight from FlightScreen. The pinned flight appears prominently on HomeScreen and receives detailed operational notifications at each phase (check-in, gate, departure).

## Behavior

- **One pinned flight at a time.** Pinning a new flight replaces the previous one.
- **Auto-removal:** The pin is cleared automatically when the flight is completed (departed or landed). On app open / data refresh, check if the pinned flight's timestamp is in the past and clear it.
- **Persistence:** Pinned flight stored in AsyncStorage under a dedicated key (e.g. `pinned_flight_v1`). Stored data: the full flight item object from the FR24 API response, plus a `pinnedAt` timestamp.

## Interaction — FlightScreen

### Swipe to pin

- Swipe left on a flight card reveals a gold PIN action button (background `#F59E0B`, 📌 icon + "PIN" label).
- Tapping the action pins the flight and shows a brief toast/alert confirmation.
- If a flight is already pinned, swiping on it reveals an "UNPIN" button instead.
- Swiping on a different flight while one is already pinned replaces the old pin.
- Works on both arrivals and departures tabs.

### Implementation approach

Use React Native's built-in `Animated` + `PanResponder` (already used in HomeScreen) to implement swipe-to-reveal on each flight card in `renderFlight`. No additional dependencies needed. The swipe gesture translates the card left to reveal the PIN/UNPIN action underneath.

## HomeScreen — Pinned Flight Card

### Position

Top of the scroll content, immediately below the weather section, above the shift/calendar section.

### Appearance

- Card with gradient background (`linear-gradient(135deg, #1E3A8A, #2563EB)`)
- Gold border (2px, `#F59E0B`)
- Badge "📌 PINNATO" in gold pill, top-right corner
- Content:
  - Flight number + destination (e.g. "U2 4521 → LGW")
  - Airline name
  - Operational times: Check-in open/close, Gate open/close, Departure (computed from `getAirlineOps`)
  - Flight status with color indicator
- Tap on card navigates to FlightScreen (or no-op, keep it simple)
- When no flight is pinned, the card is not rendered (no empty state).

### Data loading

On HomeScreen mount (or refresh), read `pinned_flight_v1` from AsyncStorage. If found and the flight timestamp is still in the future, display the card. Otherwise clear the stale pin.

## Notifications

### Pinned flight notifications

When a flight is pinned, schedule notifications for each operational phase (departures only, using `getAirlineOps` offsets):

| Phase | Trigger time | Title | Body |
|-------|-------------|-------|------|
| Check-in open | `dep - checkInOpen min` | 📌 Check-in aperto — {flight} | Check-in aperto per il volo delle {time} → {dest} |
| Gate open | `dep - gateOpen min` | 📌 Gate aperto — {flight} | Gate aperto per il volo delle {time} → {dest} |
| Gate close | `dep - gateClose min` | 📌 Chiusura gate — {flight} | Gate in chiusura per il volo delle {time} → {dest} |
| Departure | `dep - 10 min` | 📌 Partenza tra 10 min — {flight} | {airline} → {dest} · partenza alle {time} |

For pinned arrivals, schedule a single notification: "📌 Arrivo tra 15 min — {flight}".

### Storage

Pinned notification IDs stored separately (e.g. `pinned_notif_ids_v1`) so they can be cancelled independently when unpinning without affecting shift notifications.

### Lifecycle

- **On pin:** Cancel any existing pinned notifications, schedule new ones for the pinned flight.
- **On unpin:** Cancel pinned notifications.
- **On replace:** Cancel old, schedule new.
- **On auto-clear (flight completed):** Cancel pinned notifications.

## Data flow

```
User swipes flight card
  → save flight to AsyncStorage
  → schedule pinned notifications
  → update local state (for immediate UI feedback in FlightScreen)

HomeScreen mounts / refreshes
  → read pinned flight from AsyncStorage
  → validate it's still in the future
  → render card or clear stale pin

Flight completes (detected on refresh)
  → clear AsyncStorage
  → cancel pinned notifications
```

## Files to modify

- `src/screens/FlightScreen.tsx` — add swipe-to-pin on flight cards, pin/unpin logic, pinned notification scheduling
- `src/screens/HomeScreen.tsx` — add pinned flight card at top
- No new files needed; pin logic lives inline in the screens.

## Out of scope

- Live flight tracking / real-time status updates (we use cached FR24 data)
- Multiple pinned flights
- Pin history
