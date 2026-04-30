## 2024-05-01 - XSS in WebView
**Vulnerability:** Use of `injectJavaScript` to pass user-provided base64 images to WebView in `HomeScreen.tsx` and `ShiftScreen.tsx` introduces XSS risk.
**Learning:** React Native developers often use `injectJavaScript` with string interpolation for passing data, which can execute arbitrary JS if the string isn't sanitized perfectly. The memory correctly points out we should use `postMessage` instead.
**Prevention:** Avoid `injectJavaScript` for data transfer. Use `postMessage` from React Native to WebView, and set up a `message` listener inside the WebView's HTML string.
