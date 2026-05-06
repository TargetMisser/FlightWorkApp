## 2026-05-18 - FlatList Performance

**Learning:** When using React.memo on list items, inline functions inside renderItem will break memoization.
**Action:** Always extract renderItem into a useCallback hook, and ensure child components invoke the callback with their data instead of relying on closures in renderItem. Also, add windowSize={5} to FlatLists to reduce memory usage.
