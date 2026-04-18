## 2025-05-14 - Haptic feedback for swipe gestures
**Learning:** Continuous gestures in React Native (PanResponder) need a ref toggle to avoid repeated haptic triggers when a threshold is crossed.
**Action:** Use a `useRef` boolean (e.g., `hasTriggeredHaptic`) to ensure haptic feedback only fires once per threshold crossing in `onPanResponderMove`.

## 2025-05-14 - Localized Accessibility Labels
**Learning:** Hardcoded accessibility labels prevent users of other languages from understanding the UI.
**Action:** Always use the `t()` function from `useLanguage()` for `accessibilityLabel` props.
