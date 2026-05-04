## 2024-05-04 - ARIA labels for Icon-Only Buttons
**Learning:** React Native `TouchableOpacity` components containing only icons need explicit `accessibilityRole="button"`, `accessibilityLabel`, and `accessible` attributes so that screen readers can correctly identify and announce their purpose. I noticed this issue with the call/edit/delete buttons in `PhonebookScreen.tsx` and the reveal/edit/delete buttons in `PasswordScreen.tsx` and the delete button in `NotepadScreen.tsx`.
**Action:** Add these attributes to icon-only buttons across the codebase to ensure accessibility compliance.
