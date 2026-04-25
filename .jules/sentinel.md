## 2026-04-25 - Cleartext Password Storage in AsyncStorage
**Vulnerability:** Passwords in the PasswordScreen were stored in plain text in `AsyncStorage`, which is unencrypted and accessible via backups or physical device access.
**Learning:** To handle the 2048-byte limit of `SecureStore` on Android while securing sensitive data, a hybrid storage pattern is required.
**Prevention:** Migrate the legacy unencrypted data to the secure store (`SecureStore`) using row-specific dynamic keys (e.g., `aerostaff_pwd_${id}`), and immediately overwrite the `AsyncStorage` values with masked strings (e.g., `***`) to prevent sensitive data from lingering in plain text.
