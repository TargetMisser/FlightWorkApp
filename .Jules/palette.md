## 2025-05-15 - Haptic feedback for continuous gestures
**Learning:** When implementing haptic feedback with 'expo-haptics' in continuous gestures (like 'PanResponder'), use a 'useRef' toggle (e.g., 'hasTriggeredHaptic') to ensure the feedback triggers only once when a threshold is crossed.
**Action:** Always use a guard ref when triggering haptics during move events to avoid "vibration spam".
