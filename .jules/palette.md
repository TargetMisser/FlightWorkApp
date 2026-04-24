## 2025-05-15 - [Swipeable Card Accessibility & Haptics]
**Learning:** When adding accessibility to non-pressable but interactive cards (like `SwipeableFlightCard`), use `accessibilityActions` and `onAccessibilityAction` instead of `accessibilityRole="button"` if no direct `onPress` is present. Also, for haptic feedback in continuous gestures, use a `useRef` toggle to ensure it triggers only once when a threshold is crossed.
**Action:** Always check for `accessibilityActions` when implementing swipe-to-act patterns and use `useRef` to guard haptic triggers in `PanResponder`.
