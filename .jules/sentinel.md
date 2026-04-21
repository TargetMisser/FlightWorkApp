## 2024-04-21 - Secure Password Storage
**Vulnerability:** Plain text user passwords were being stored in AsyncStorage, exposing them on rooted/jailbroken devices.
**Learning:** SecureStore on Android has a 2048-byte limit, so we can't store a large JSON array of passwords in it. The project uses a hybrid storage pattern.
**Prevention:** Use hybrid storage pattern: lists of metadata are stored in AsyncStorage with secrets masked, and the actual secrets are stored individually in SecureStore using row-specific dynamic keys.
