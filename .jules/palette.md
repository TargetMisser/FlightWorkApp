## 2025-04-23 - Flight Card Tactile and Accessible Interaction
**Learning:** Adding haptic feedback to swipe gestures and descriptive accessibility labels significantly improves the "feel" and usability of non-button interactive elements for all users. Using `useRef` for haptic toggles in `PanResponder` is essential to prevent vibration flooding.
**Action:** Always implement haptics for threshold crossings in gestures and use `accessibilityActions` for screen reader users on swipeable cards.
