## 2026-04-08 - Haptic feedback for continuous gestures
**Learning:** When implementing haptic feedback with 'expo-haptics' in continuous gestures (like 'PanResponder'), use a 'useRef' toggle (e.g., 'hasTriggeredHaptic') to ensure the feedback triggers only once when a threshold is crossed.
**Action:** Always include a reset of the haptic trigger ref in both completion ('onPanResponderRelease') and cancellation ('onPanResponderTerminate') handlers.
