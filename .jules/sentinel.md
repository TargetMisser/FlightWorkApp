## 2024-06-03 - XSS Vulnerability in WebView InjectJavaScript

**Vulnerability:** User data (base64 encoded images) was concatenated into string templates and injected into a WebView using `injectJavaScript()`.
**Learning:** This approach poses a critical Cross-Site Scripting (XSS) vulnerability, as an attacker controlling the injected string could execute arbitrary JavaScript within the WebView's context.
**Prevention:** Avoid injecting stringified data using `injectJavaScript()`. Instead, establish a secure communication channel using `window.ReactNativeWebView.postMessage()` and corresponding message event listeners within the WebView. Implementing a deterministic handshake (e.g. sending a 'READY' message from the WebView before sending data) prevents race conditions and ensures safe data transfer.
