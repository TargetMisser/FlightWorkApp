## 2025-05-15 - Missing Accessible Labels on Icon Buttons
**Learning:** Icon-only buttons used for frequent list actions (like Call, Edit, Delete, Toggle Password) must have `accessibilityLabel` and `accessibilityRole="button"`, otherwise screen readers only announce "button" or remain silent, severely hindering accessibility.
**Action:** Always verify that icon-only `TouchableOpacity` wrappers include descriptive `accessibilityLabel` properties.
