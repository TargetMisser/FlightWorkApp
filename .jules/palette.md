## 2024-05-03 - Add ARIA Labels to Password Icon Buttons
**Learning:** Icon-only buttons (like eye icon to show/hide password, edit/delete buttons) in React Native list items lacked proper accessibility roles and labels, making screen reader navigation confusing.
**Action:** Always add `accessibilityLabel`, `accessibilityRole="button"`, and `hitSlop` to `TouchableOpacity` wrapper components for icon buttons. Added translation keys to `src/i18n/translations.ts` to support localization.
