## 2025-05-22 - Flight Card Accessibility & Haptics
**Learning:** Swipe-based interactions (like pinning a flight) are invisible to screen readers. Adding `accessibilityActions` allows these users to discover and trigger the same functionality via the system accessibility menu. Combining this with haptic feedback (Impact for threshold, Notification for success) creates a "tactile" UI that feels more responsive.
**Action:** Always provide `accessibilityActions` for any custom gestures and use `expo-haptics` to confirm action triggers.
