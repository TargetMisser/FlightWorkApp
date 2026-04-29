# Palette's Journal - Critical UX/Accessibility Learnings

## 2025-05-15 - Enhancing Mobile Gestures with Haptics and ARIA
**Learning:** Swipe gestures for common actions (like pinning) are intuitive for power users but invisible to screen readers and lack physical confirmation. Adding `expo-haptics` provides tactile feedback that makes the gesture feel "mechanical" and satisfying.
**Action:** Always pair continuous gestures with haptic feedback at thresholds and provide `accessibilityActions` so screen reader users can trigger the same logic via their specialized menus.
