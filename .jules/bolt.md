## 2025-02-12 - Date Object Instantiation in React Native Loops
**Learning:** Instantiating `new Date()` and calling date getter methods (`getFullYear`, `getMonth`, etc.) inside a high-frequency loop like `Array.prototype.filter` on a large dataset creates noticeable performance degradation on the React Native JS thread.
**Action:** When calculating "same day" boundaries for item filtering, compute the start-of-day and end-of-day timestamps *once* outside the loop. Then, convert the filter check into a simple primitive integer comparison (e.g. `ts >= startTs && ts <= endTs`).
