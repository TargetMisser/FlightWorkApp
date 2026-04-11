## 2025-05-14 - Haptic feedback on swipe
**Learning:** Adding haptic feedback to swipeable items provides crucial tactile confirmation for threshold crossing and action completion, significantly enhancing the "feel" of gestures.
**Action:** Use a `useRef` flag (e.g., `hasTriggeredHaptic`) to ensure haptics trigger only once when crossing a threshold during continuous `PanResponder` movements. Trigger a notification success haptic on release if the action is confirmed.
