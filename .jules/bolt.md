## 2024-04-19 - Fix React.memo and list rendering
**Learning:** Inline callback functions and missing useCallback defeat React.memo's shallow comparison in list rendering, leading to unnecessary re-renders of all list items.
**Action:** Always wrap callback props for list items in useCallback and pass item IDs instead of using inline arrow functions in renderItem. Also add windowing props to FlatList for large lists.
