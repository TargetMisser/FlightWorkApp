
## 2024-05-24 - Migrate plain text passwords to SecureStore
**Vulnerability:** Passwords in the password manager were stored in plain text in AsyncStorage.
**Learning:** AsyncStorage has a 2048-byte limit on Android, but plain text secrets are vulnerable. Hybrid storage allows managing lists in AsyncStorage with actual secrets stored individually in SecureStore.
**Prevention:** When storing sensitive data, use a hybrid approach to circumvent length limits while encrypting secrets.
