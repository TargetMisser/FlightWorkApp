## 2025-03-01 - Add accessibility labels to icon-only buttons
**Learning:** React Native's TouchableOpacity does not automatically infer its purpose for screen readers when it only contains an icon. This makes icon-only buttons invisible or confusing for visually impaired users relying on VoiceOver/TalkBack.
**Action:** Always add accessible={true}, accessibilityRole="button", and a descriptive accessibilityLabel to icon-only TouchableOpacity or Pressable components.
