## 2026-04-27 - XSS in React Native WebView

**Vulnerability:** React Native WebViews `injectJavaScript` was using unsafe string interpolation with base64 images that could lead to XSS attacks or syntax errors if the string contained single or double quotes unescaped correctly.

**Learning:** Passing user-supplied strings directly into `injectJavaScript` using template interpolation exposes a risk for Script Injection/XSS in WebViews.

**Prevention:** To avoid this, prefer establishing a two-way communication channel using `postMessage` (from WebView to React Native) and `webViewRef.current?.postMessage` (from React Native to WebView). Ensure the HTML snippet adds `message` listeners for both `window` and `document`, and uses a `READY` message handshake to confirm the engine is ready.
