## 2025-04-23 - Added missing ARIA attributes to Phonebook screen buttons
**Learning:** Found that the Phonebook screen uses icon-only `TouchableOpacity` buttons for "call", "edit", and "delete" actions that are missing `accessibilityLabel` and `accessibilityRole`. Without these, screen readers just say "button" without explaining what the button does.
**Action:** Always add `accessible={true}`, `accessibilityRole="button"`, and a translated `accessibilityLabel` to icon-only interactive components.
