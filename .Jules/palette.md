## 2025-03-05 - [Haptic Feedback for Gestures]
**Learning:** When adding haptics to continuous gestures (like `PanResponder`), it's critical to use a `ref` to ensure the haptic triggers exactly once when crossing a threshold. Otherwise, it triggers on every frame, creating an unpleasant "buzzing" effect.
**Action:** Always use a "hasTriggered" ref gated by the threshold logic in gesture handlers.

## 2025-03-05 - [Micro-UX: Tactile Tabs]
**Learning:** Light haptic impact on segmented control/tab switches makes the digital interface feel more mechanical and responsive, especially when visual transitions are subtle.
**Action:** Add `ImpactFeedbackStyle.Light` to tab-like navigation elements.
