## 2024-04-18 - Icon-Only Button Accessibility
**Learning:** React Native's `<TouchableOpacity>` components wrapping icons (like MaterialIcons) do not have inherent screen-reader descriptions, making them entirely opaque to visually impaired users unless explicitly annotated.
**Action:** When adding or reviewing icon-only buttons, always apply `accessible`, `accessibilityRole="button"`, and a localized `accessibilityLabel` to the wrapper component to ensure screen-reader compatibility.
