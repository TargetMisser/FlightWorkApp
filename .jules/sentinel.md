## 2024-05-24 - Fix Insecure Password Storage
**Vulnerability:** Passwords were saved in plain text directly to AsyncStorage, exposing sensitive user data to anyone with physical device access or backup extraction capabilities.
**Learning:** Storing lists of sensitive items requires a hybrid approach due to SecureStore's 2048-byte limit on Android. The entire array cannot fit in one secure key.
**Prevention:** Use a hybrid storage pattern: store metadata arrays in AsyncStorage with secrets masked (e.g., '***'), and store the actual secrets individually in SecureStore using row-specific dynamic keys (e.g., `aerostaff_pwd_${id}`).
