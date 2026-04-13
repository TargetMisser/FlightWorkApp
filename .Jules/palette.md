## 2026-04-13 - Haptic Feedback and Accessibility Polish
**Learning:** Adding haptic feedback at gesture thresholds provides clear physical confirmation and delight. Accessibility for swipeable cards requires 'accessibilityActions' instead of just 'accessibilityRole="button"' to be truly functional for screen reader users.
**Action:** Use 'useRef' to debounce haptic impacts in continuous gestures. Always combine visual info into a concise 'accessibilityLabel' and provide 'accessibilityActions' for custom interactions.
