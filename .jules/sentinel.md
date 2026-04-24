## 2025-05-18 - XSS in WebView postMessage implementation

**Vulnerability:** Found multiple instances where the application injected JS strings into a hidden WebView or directly executed code from unverified HTML messages, risking Cross-Site Scripting (XSS).
**Learning:** React Native `WebView` requires careful communication using `postMessage` exclusively with verified JSON. Direct `injectJavaScript` or embedding dynamic content in HTML string props can be easily manipulated.
**Prevention:** Avoid `injectJavaScript` altogether for data transfer; set up bi-directional `postMessage` handling securely with event listeners on `window` and `document` inside WebView HTML templates.
