## 2025-05-18 - [Insecure JavaScript Injection via String Interpolation in WebViews]
**Vulnerability:** Found a pattern in `src/screens/ShiftScreen.tsx` where string interpolation (`'${base64Json}'`) and manual quote replacement (`.replace(/'/g, "\\'")`) were used to pass a JSON payload directly into a `WebView`'s `injectJavaScript` function.
**Learning:** This approach creates an XSS / JS Injection vulnerability if the payload contains unescaped quotes or malicious executable sequences.
**Prevention:** To prevent this, always rely on `JSON.stringify()` to safely escape values before interpolating them into JavaScript code (e.g., `window.runTesseract(${JSON.stringify(base64Json)});`) rather than using manual text replacement and raw string interpolation.
