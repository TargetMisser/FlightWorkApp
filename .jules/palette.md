## 2025-04-19 - Accessible Swipe Actions
**Learning:** Gesture-based interactions (like swiping to pin) are inaccessible to screen reader users.
**Action:** Always implement `accessibilityActions` and `onAccessibilityAction` on swipeable or complex gesture-based components to provide an alternative way to trigger those actions.
