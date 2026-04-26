## 2024-04-13 - Missing React.memo for FlatList Items
**Learning:** The React Native FlatList components in this codebase frequently render unmemoized inline items (like `ContactRow`, `PasswordRow`, etc.), causing unnecessary re-renders of the entire list when individual state changes.
**Action:** Always wrap long list item components in `React.memo()` to prevent cascading re-renders and improve FlatList scrolling performance.

## 2026-04-26 - Missing FlatList Windowing Props
**Learning:** FlatList components in React Native were rendering without windowing props, which can lead to poor performance on long lists due to excessive memory usage and rendering overhead.
**Action:** Always add windowing props (`initialNumToRender`, `windowSize`, `maxToRenderPerBatch`, etc.) to `FlatList` components to optimize memory and rendering performance.
