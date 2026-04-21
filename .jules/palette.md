## 2024-05-15 - React Native Icon-Only Buttons Accessibility
**Learning:** React Native's `<TouchableOpacity>` doesn't automatically act as a button with an implicit accessible name when it only contains an icon. It needs explicit `accessible={true}`, `accessibilityRole="button"`, and a localized `accessibilityLabel`.
**Action:** Always add ARIA-equivalent accessibility props (`accessible={true}`, `accessibilityRole="button"`, `accessibilityLabel="..."`) to icon-only buttons in React Native.
