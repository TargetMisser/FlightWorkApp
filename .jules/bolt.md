## 2024-04-13 - Missing React.memo for FlatList Items
**Learning:** The React Native FlatList components in this codebase frequently render unmemoized inline items (like `ContactRow`, `PasswordRow`, etc.), causing unnecessary re-renders of the entire list when individual state changes.
**Action:** Always wrap long list item components in `React.memo()` to prevent cascading re-renders and improve FlatList scrolling performance.

## 2025-02-18 - Avoid instantiating Date objects inside array filter iterations
**Learning:** Instantiating `new Date()` within high-frequency loops, such as `Array.prototype.filter`, creates a substantial performance bottleneck in JavaScript/TypeScript environments (like React Native/Hermes). Benchmarking revealed a roughly 6.6x speed reduction when performing date boundary checks by instantiating `new Date(ts * 1000)` on every iteration instead of pre-calculating start/end bounds as primitives outside the loop.
**Action:** When performing timestamp comparisons on arrays, always pre-calculate primitive timestamp boundaries (`startOfDayTs`, `endOfDayTs`) outside the loop and use simple numeric comparisons (`>=`, `<=`) inside the iteration.

## 2025-02-18 - Avoid assuming 24-hour days for date calculations (DST bug)
**Learning:** Hardcoding a day length to 86,400 seconds (`+ 86400`) from midnight to compute the end-of-day boundary creates logical bugs due to Daylight Saving Time (DST). On transition days, a local day may have 23 or 25 hours, leading to incorrect boundaries that exclude or over-include events near the boundaries.
**Action:** When calculating daily bounds for timestamps, always use native `Date` logic (e.g., `setHours(23, 59, 59, 999)`) to properly accommodate the environment's timezone and DST transitions.
