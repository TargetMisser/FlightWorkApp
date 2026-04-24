## 2024-04-13 - Missing React.memo for FlatList Items
**Learning:** The React Native FlatList components in this codebase frequently render unmemoized inline items (like `ContactRow`, `PasswordRow`, etc.), causing unnecessary re-renders of the entire list when individual state changes.
**Action:** Always wrap long list item components in `React.memo()` to prevent cascading re-renders and improve FlatList scrolling performance.

## 2024-04-14 - Add windowing props to FlatList
**Learning:** Unoptimized FlatList instances in React Native without windowing props render too many items simultaneously, causing high memory usage and poor scrolling performance on long lists.
**Action:** Always include initialNumToRender, maxToRenderPerBatch, windowSize, and removeClippedSubviews={true} when using FlatList to constrain memory footprint.
