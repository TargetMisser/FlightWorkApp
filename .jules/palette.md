## 2025-05-15 - Flight Card Haptics and Accessibility
**Learning:** Adding haptic feedback (selection for threshold crossing and success notification for action completion) significantly improves the feel of swipe gestures in React Native. For accessibility, non-pressable interactive cards should use `accessibilityActions` and `onAccessibilityAction` to provide screen reader users with the same functionality as swipe gestures.
**Action:** Use `useRef` to track haptic triggers in continuous gestures and always provide alternative accessibility actions for swipe-based features.
