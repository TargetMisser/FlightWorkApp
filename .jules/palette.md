## 2024-05-16 - Add Accessible Props to Icon-Only Touchables

**Learning:** When using React Native `<TouchableOpacity>` for icon-only buttons, screen readers cannot interpret their function, and small touch targets reduce usability.
**Action:** Always include `accessible={true}`, `accessibilityRole="button"`, a descriptive `accessibilityLabel` using `t()`, and a `hitSlop` prop to enlarge the touchable area for better usability and screen reader support.
