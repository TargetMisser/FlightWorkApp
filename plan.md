1. **Optimize `currentData` filtering in `src/screens/FlightScreen.tsx`**
   - Remove the `isSameDay` utility function.
   - Pre-calculate `startOfDayTs` and `endOfDayTs` (in seconds) from `selectedDate` outside the `filter` loop.
   - Inside `.filter()`, use primitive numeric comparisons (`ts >= startOfDayTs && ts < endOfDayTs`) instead of `new Date(ts * 1000)`.
   - Add comments explaining the optimization.

2. **Add `React.memo` to `SwipeableFlightCard` in `src/screens/FlightScreen.tsx`**
   - Wrap `SwipeableFlightCard` with `React.memo`.
   - Add `initialNumToRender={10}`, `windowSize={5}`, and `maxToRenderPerBatch={10}` to the `FlatList` in `src/screens/FlightScreen.tsx` (around line 802).
   - This improves performance of rendering long lists by optimizing rendering windows and memory usage.

3. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
   - Run typecheck and ensure the app still compiles correctly.
   - Run tests if available.

4. **Submit PR**
   - Title: "⚡ Bolt: [performance improvement] Optimize date filtering in FlightScreen"
   - Description format matching memory requirements.
