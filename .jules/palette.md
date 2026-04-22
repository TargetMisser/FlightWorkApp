## 2024-04-22 - Missing ARIA labels on icon-only buttons
**Learning:** React Native icon-only buttons (`TouchableOpacity` wrapping a `MaterialIcons`) often lack context for screen readers, leading to poor accessibility.
**Action:** Always add `accessible={true}`, `accessibilityRole="button"`, and a descriptive `accessibilityLabel` (localized via `t()`) to all icon-only interactive elements.
