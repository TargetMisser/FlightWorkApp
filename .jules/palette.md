## 2024-04-19 - Accessibility roles and labels on icon buttons
**Learning:** Found several generic icon-only `<TouchableOpacity>` buttons that are missing `accessibilityLabel` and `accessibilityRole`. This is a classic accessibility issue in React Native, leading to screen readers announcing "button" without context, or worse, just "clickable". For example, the `clear` button in NotepadScreen has no label.
**Action:** Add `accessible={true}`, `accessibilityRole="button"`, and `accessibilityLabel` to icon-only buttons to make them screen-reader friendly.
