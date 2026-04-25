## 2024-04-24 - Screen Reader Labels for Icon-Only Buttons
**Learning:** The React Native `TouchableOpacity` components in this codebase frequently omit `accessibilityRole="button"` and `accessibilityLabel` when used as icon-only buttons (like the clear and save buttons in `NotepadScreen`).
**Action:** Always verify icon-only buttons have an `accessibilityLabel` using the translation hook (`t()`) and `accessibilityRole="button"` for better screen reader support.

## 2024-04-24 - Disabled States for Actions
**Learning:** Inactive actions (like trying to clear an already empty notepad, or saving an already saved notepad) still accepted touch events, which could confuse screen readers or cause unintended logic.
**Action:** Always add the `disabled` prop to `TouchableOpacity` when the action is no longer relevant, and lower the `opacity` or update styling to provide clear visual feedback to sighted users.
