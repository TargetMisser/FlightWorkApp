## 2024-04-14 - Missing ARIA labels on icon-only buttons
**Learning:** Discovered that icon-only `TouchableOpacity` buttons in `NotepadScreen.tsx` lacked proper accessibility labels and roles, making them unreadable to screen readers. This is a common pattern across React Native apps that needs consistent addressing.
**Action:** Always apply `accessible={true}`, `accessibilityRole="button"`, and a descriptive `accessibilityLabel` using `t(...)` translations to icon-only wrapper components (`TouchableOpacity`, `Pressable`, etc.).
