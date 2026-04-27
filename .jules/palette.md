## 2026-04-27 - Added accessibility props to clear notes button in NotepadScreen
**Learning:** Icon-only buttons often lack accessible properties and proper hitSlops making them difficult to interact with on touch screens and completely invisible or undescriptive to screen readers.
**Action:** Add `accessible`, `accessibilityRole`, `accessibilityLabel`, and `hitSlop` to all icon-only `TouchableOpacity` components.
