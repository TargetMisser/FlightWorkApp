## 2025-05-14 - Haptics and Accessibility for Swipeable Cards
**Learning:** Swipe gestures are non-discoverable and inaccessible for screen reader users. Adding haptic feedback makes the gesture feel "physical" and deliberate, while `accessibilityActions` provide a semantic way to perform the same action without swiping.
**Action:** Always pair custom gestures with `accessibilityActions` and `Haptics` to ensure the interface is both delightful and accessible.
