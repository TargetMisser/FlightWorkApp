## 2024-05-24 - Accessible Icon Buttons
**Learning:** Screen readers cannot infer the purpose of icon-only buttons without text content, making actions like "Delete note" inaccessible to visually impaired users. In this app, many utility buttons (like the trash icon in Notepad) relied solely on visual metaphors.
**Action:** Always add `accessible={true}`, `accessibilityRole="button"`, and a descriptive `accessibilityLabel` to `<TouchableOpacity>` components that only contain an icon, using existing translation keys when possible.
