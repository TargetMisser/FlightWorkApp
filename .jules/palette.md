## 2025-02-18 - Missing Accessibility on Icon-Only Buttons
**Learning:** Icon-only buttons (using `TouchableOpacity` and `MaterialIcons`) in React Native often lack screen reader support by default. Specifically, the "delete" and "save" icon buttons in `src/screens/NotepadScreen.tsx` lacked `accessibilityLabel` attributes.
**Action:** Always wrap `MaterialIcons` with a `TouchableOpacity` (or similar) that includes `accessible={true}`, `accessibilityRole="button"`, and a localized `accessibilityLabel={t('key')}` using the i18n system to ensure screen readers can announce the action.
