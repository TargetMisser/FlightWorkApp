## 2024-05-24 - React Native List Filtering Memoization
**Learning:** React Native flat list filtering should always be memoized. If an expensive filter runs on every render (e.g. `const currentData = array.filter(...)`), any unrelated state update (like opening a modal or updating a boolean flag `notifsEnabled`) will trigger a full recalculation and drop frames on the JS thread.
**Action:** When working with long arrays of data fed into `FlatList` in React Native, ensure derived data filtering is wrapped in a `useMemo` hook with strict dependencies.
