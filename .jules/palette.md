## 2025-05-14 - Flight Card Accessibility & Interaction
**Learning:** Swipe-based actions are common in mobile UX but are completely inaccessible to screen reader users unless mapped to `accessibilityActions`.
**Action:** When implementing gestures like swipe-to-action, always include `accessibilityActions` and `onAccessibilityAction` to ensure functional parity for all users.
