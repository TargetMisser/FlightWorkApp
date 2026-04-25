## 2025-05-14 - Haptic & Accessibility for Swipe Gestures
**Learning:** Swipe gestures are delightfull but inherently inaccessible to screen reader users. Adding haptic feedback (Medium impact on threshold, Success on completion) provides tactile confirmation for sighted users.
**Action:** Always pair swipe-to-action gestures with `accessibilityActions` and `onAccessibilityAction` to ensure screen reader users can trigger the same functionality via the accessibility menu. Use `ViewProps` to safely pass accessibility attributes to underlying views.
