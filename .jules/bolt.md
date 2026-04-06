## 2024-05-18 - Pre-calculate Loop Boundaries for Date Comparisons

**Learning:** Instantiating `Date` objects inside loops is computationally expensive (approx 5x slower) compared to primitive numeric operations. In cases where loop values (e.g., flight timestamps) are being compared to a fixed interval (e.g., "today"), `Date` properties can be pre-calculated outside the loop into raw timestamp bounds.

**Action:** Before filtering or mapping over large arrays with date checks, pre-calculate the start and end boundary constraints as numeric timestamps, and perform a simple O(1) mathematical comparison (`>=` and `<`) on the items.
