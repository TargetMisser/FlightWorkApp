## 2024-05-24 - Avoid Storing Passwords in Plaintext
**Vulnerability:** User passwords were stored in plaintext in `AsyncStorage`, putting sensitive user data at risk.
**Learning:** React Native's `AsyncStorage` is unencrypted and should not be used to store secrets. `SecureStore` is the correct approach. However, `SecureStore` on Android has a strict 2048-byte limit. Thus, to store a list of passwords without hitting the limit on the aggregate JSON blob, each password must be stored as an individual string entry using a dynamic key.
**Prevention:** Store lists of sensitive data in `AsyncStorage` with secrets masked (e.g., `password: '***'`) and save the actual secrets separately in `SecureStore` using deterministic, row-specific keys.
