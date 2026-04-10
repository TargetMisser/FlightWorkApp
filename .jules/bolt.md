## 2024-05-14 - Initialize
**Learning:** To improve React Native performance, avoid instantiating `Date` objects or performing deep object property access inside high-frequency loops (e.g., `Array.prototype.filter`). Pre-calculate boundary timestamps and extract nested properties into flat arrays outside the loop, relying on primitive numeric comparisons.
**Action:** Extract deep array accesses and Date constructions outside of filters and array manipulation.
