## 2024-05-24 - Screen Reader Support for Icon-Only Buttons
**Learning:** Icon-only buttons without proper ARIA/accessibility labels are completely invisible to screen readers, leaving visually impaired users unable to understand their function, especially for destructive actions like 'Clear'.
**Action:** Always apply 'accessible={true}', 'accessibilityRole="button"', and a descriptive 'accessibilityLabel' to '<TouchableOpacity>' components that only contain icons.
