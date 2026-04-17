## 2025-04-16 - App Bar and Drawer icon buttons lacked ARIA labels
**Learning:** The custom App Bar and DrawerMenu had icon-only buttons for back, menu, and close, which were missing accessibilityLabel properties, making them hard to use for screen reader users.
**Action:** Add accessibilityLabel along with accessible={true} and accessibilityRole="button" for all icon-only buttons to ensure they are screen-reader accessible.
