## 2025-05-15 - Fix insecure password storage
**Vulnerability:** Plaintext user passwords for the 'Password' feature were stored in AsyncStorage, which is unencrypted.
**Learning:** AsyncStorage is meant for non-sensitive data but was used for a sensitive feature. There is a SecureStore limit (2048 bytes), so a hybrid approach is required.
**Prevention:** Use SecureStore for secrets and mask sensitive values when storing large metadata objects in AsyncStorage.
