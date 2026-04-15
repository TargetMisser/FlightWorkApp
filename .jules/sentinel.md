## 2026-04-15 - SecureStore Android Limit Workaround
**Vulnerability:** Android SecureStore fails on strings > 2048 bytes (e.g. large JSON arrays of passwords).
**Learning:** To bypass this safely without losing encryption, lists of metadata can be stored in AsyncStorage with secrets masked as '***', while actual secrets are stored individually in SecureStore via dynamic keys.
**Prevention:** Use the hybrid storage pattern for arrays containing sensitive data.
