## 2025-02-14 - Unencrypted Storage of Sensitive Credentials in Password Manager

**Vulnerability:** The application implements a "Password Manager" feature (`PasswordScreen.tsx`), but stores the raw user credentials (usernames and passwords) in plain text using `AsyncStorage` under the key `aerostaff_passwords_v1`. It only uses `SecureStore` to store an optional 4-digit PIN for unlocking the screen, not for the credentials themselves.

**Learning:** `AsyncStorage` is not secure and stores data unencrypted on the device. While `expo-secure-store` has a 2048-byte limit on Android, storing sensitive user credentials directly in `AsyncStorage` is a critical security vulnerability. The hybrid storage pattern (metadata in AsyncStorage, secrets in SecureStore) was either forgotten or intentionally skipped for simplicity.

**Prevention:** Always use `SecureStore` for sensitive user data (passwords, tokens, API keys). If dealing with lists that exceed SecureStore size limits, implement a hybrid approach where public metadata is in `AsyncStorage` but the actual sensitive values (passwords) are securely encrypted or stored in individual `SecureStore` keys.
