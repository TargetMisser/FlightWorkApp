## 2025-05-14 - Interactive Card Accessibility
**Learning:** For interactive elements like swipeable cards that lack a standard 'onPress', 'accessibilityRole="button"' can be misleading. Using 'accessibilityActions' provides a clearer experience for screen reader users by exposing custom interactions (like Pin/Unpin) as menu options.
**Action:** Use 'accessibilityActions' and 'onAccessibilityAction' for non-standard gestures, and ensure a descriptive 'accessibilityLabel' summarizes the component's state.

## 2025-05-14 - Haptic Feedback in Gestures
**Learning:** Triggering haptic feedback continuously during a 'PanResponder' gesture creates a jittery experience. Using a 'useRef' toggle ensures feedback only occurs exactly once when a threshold is crossed.
**Action:** Implement a 'hasTriggeredHaptic' ref to guard haptic calls in continuous interaction loops.
