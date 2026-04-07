# FlightWorkApp Copilot Instructions

## Build, test, and lint commands

### Environment
- Node.js 20 (recommended)
- Java 17+
- Android Studio + Android SDK (for Android builds)

### Install dependencies
```bash
npm ci
```

### Run the app
```bash
npm run start
npm run android
npm run ios
npm run web
```

### Typecheck / CI validation
```bash
npm run typecheck
npx expo config --json > /dev/null
```

### Android build
```bash
cd android
./gradlew assembleRelease
```
On Windows:
```powershell
cd android
.\gradlew.bat assembleRelease
```

### Tests and lint
- No dedicated test runner or lint script is currently configured in `package.json`.
- Single-test command is not available in the current repository setup.

## High-level architecture

- **App shell and navigation:** `App.tsx` implements custom tab + overlay navigation (no React Navigation). The root provider chain is `ThemeProvider` -> `AirportProvider`.
- **Entry wiring:** `index.ts` registers both the Expo root component and the Android widget task handler (`registerWidgetTaskHandler`).
- **Airport-centered data flow:** airport selection is persisted in `src/utils/airportSettings.ts` and exposed through `src/context/AirportContext.tsx`; screens consume it via `useAirport()`.
- **Flight pipeline:** `src/utils/fr24api.ts` fetches FlightRadar24 schedules; `FlightScreen` merges schedule data with shift windows from device calendar, computes ops windows, handles pinning, notifications, and pushes widget cache updates.
- **Shift/calendar pipeline:** `HomeScreen` and `CalendarScreen` both write shifts through `src/utils/shiftCalendar.ts`. PDF shift import runs in a hidden WebView via `src/utils/pdfShiftParser.ts` (pdf.js extraction -> structured shift data).
- **Android widget path:** `FlightScreen` writes `widget_data_cache_v1` in AsyncStorage; `src/widgets/widgetTaskHandler.tsx` reads it and renders `ShiftWidget`.
- **Wear OS bridge:** `plugins/withWearDataSender.js` injects and registers Android native Wear module code; JS calls are in `src/modules/WearDataSender.ts` (or direct `NativeModules.WearDataSender` usage in `FlightScreen`).
- **Persistence/security split:** operational state is mostly AsyncStorage-backed; password PIN uses `expo-secure-store` with AsyncStorage fallback for migration (`PasswordScreen`).

## Key conventions

- **Storage keys are versioned and stable.** Follow existing key style (e.g. `aerostaff_*_v1`, `manuals_data_v2`, `pinned_flight_v1`) and avoid renaming keys without migration logic.
- **Shift semantics rely on title matching.** Multiple flows detect shifts by event titles containing `Lavoro` / `Riposo` (calendar screens, notifications, home). If naming changes, update every consumer.
- **Use `airportSettings` helpers, not ad-hoc airport parsing.** Normalize/validate codes with `normalizeAirportCode` and `isValidAirportCode`; build FR24 URLs only through `buildFr24ScheduleUrl`.
- **Departure relevance uses ops windows, not just departure time.** Keep using `getAirlineOps()` overlap logic for check-in/gate windows when filtering “during shift”.
- **Android-specific integrations are always guarded.** Keep `Platform.OS === 'android'` and module availability checks for widget/Wear features.
- **Theme usage pattern is consistent.** Use `useAppTheme()` + `makeStyles(colors)` (memoized) and consume theme tokens instead of introducing isolated color systems.
- **User-facing copy is predominantly Italian.** Keep new UI labels/messages aligned with existing language.
- **From `CLAUDE.md`:** if dual-graph MCP tools are available in-session, prefer symbol-level graph reads (`file::symbol`) and use `graph_continue` only for new/unmapped areas.
