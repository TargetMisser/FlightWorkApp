## 2024-04-20 - XSS in WebView injectJavaScript
**Vulnerability:** XSS vulnerability through string interpolation in WebView `injectJavaScript`.
**Learning:** Avoid using `injectJavaScript` with string interpolation for data transfer. It can lead to script injection attacks if the data is not properly sanitized.
**Prevention:** Use `webViewRef.current.postMessage(data)` and set up corresponding `message` event listeners in the WebView's JavaScript context for both `window` and `document` (`window.addEventListener('message', ...)` and `document.addEventListener('message', ...)`) to ensure cross-platform compatibility between iOS and Android.
