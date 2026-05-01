## 2024-04-13 - Missing React.memo for FlatList Items
**Learning:** The React Native FlatList components in this codebase frequently render unmemoized inline items (like `ContactRow`, `PasswordRow`, etc.), causing unnecessary re-renders of the entire list when individual state changes.
**Action:** Always wrap long list item components in `React.memo()` to prevent cascading re-renders and improve FlatList scrolling performance.

## 2024-04-14 - FlatList windowing props defaults
**Learning:** In React Native, `removeClippedSubviews` is already optimized by default (`true` on Android, `false` on iOS). Manually setting it to `Platform.OS === 'android'` adds no value. Additionally, `initialNumToRender` and `maxToRenderPerBatch` already default to `10`.
**Action:** When optimizing FlatList, focus on tweaking `windowSize` (e.g., reducing it to `5`) which has a real impact on memory footprint, and avoid explicitly repeating default properties.
