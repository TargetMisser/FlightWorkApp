## 2026-04-15 - Missing ARIA labels on Icon-only buttons
**Learning:** Icon-only buttons without an explicit ARIA label are not announced correctly by screen readers, rendering them inaccessible. This is a common pattern in the React Native codebase where visual icons (like 'delete-outline') are heavily used without text.
**Action:** Always apply `accessible={true}`, `accessibilityRole="button"`, and a descriptive `accessibilityLabel` to `<TouchableOpacity>` wrappers surrounding icon-only components.
