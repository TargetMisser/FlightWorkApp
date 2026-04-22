# Palette's Journal - Critical Learnings Only

## 2025-05-15 - Haptic Feedback in Continuous Gestures
**Learning:** In 'PanResponder' implementations, haptic feedback can easily misfire or trigger repeatedly during a single swipe if not guarded by a state ref.
**Action:** Use a 'useRef' toggle (e.g., 'hasTriggeredHaptic') to ensure the feedback triggers only once when a threshold is crossed during a continuous gesture.

## 2025-05-15 - Accessibility for Swipe Actions
**Learning:** Swipe-based actions (like pinning) are inaccessible to screen reader users.
**Action:** Use 'accessibilityActions' and 'onAccessibilityAction' on the card component to provide an alternative way for assistive technologies to trigger these specific interactions without requiring complex gestures.
