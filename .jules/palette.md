## 2025-05-15 - Flight Card Accessibility & Haptics
**Learning:** Swipe-to-action gestures on mobile lack discoverability and feedback for screen reader users and those with tactile preferences.
**Action:** Always implement `accessibilityActions` for gesture-based interactions and use `expo-haptics` (specifically `ImpactFeedbackStyle.Medium` for thresholds and `NotificationFeedbackType.Success` for completion) to provide tactile reinforcement.
