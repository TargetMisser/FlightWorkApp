## 2024-04-13 - Missing React.memo for FlatList Items
**Learning:** The React Native FlatList components in this codebase frequently render unmemoized inline items (like `ContactRow`, `PasswordRow`, etc.), causing unnecessary re-renders of the entire list when individual state changes.
**Action:** Always wrap long list item components in `React.memo()` to prevent cascading re-renders and improve FlatList scrolling performance.
## 2026-04-15 - React Native FlatList Optimization
**Learning:** Missing windowing props in React Native FlatList causes unnecessary memory consumption and degrades scrolling performance on long lists.
**Action:** Always include initialNumToRender, windowSize, maxToRenderPerBatch, and removeClippedSubviews when implementing FlatList for long lists.
