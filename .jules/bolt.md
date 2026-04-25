## 2024-05-18 - React Native Date Instantiation in Array Filters
**Learning:** Instantiating `Date` objects inside high-frequency loops (like `Array.prototype.filter`) on large arrays in React Native significantly degrades performance because of garbage collection.
**Action:** Always pre-calculate day boundaries as Unix timestamps outside the loop and use simple numeric comparisons (e.g., `ts >= startTs && ts < endTs`) to filter time-series data.
