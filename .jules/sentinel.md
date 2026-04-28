## 2024-05-18 - XSS in WebView injectJavaScript
**Vulnerability:** Found `webViewRef.current?.injectJavaScript(jsCode)` with user-supplied data (`base64Json`) via string interpolation in both `src/screens/HomeScreen.tsx` and `src/screens/ShiftScreen.tsx`.
**Learning:** Using `injectJavaScript` to pass data to a WebView can result in Cross-Site Scripting (XSS) if the data contains unescaped special characters that allow an attacker to escape the string context and execute arbitrary JavaScript code.
**Prevention:** Use the `postMessage` pattern (`webViewRef.current?.postMessage(data)`) to securely pass data from React Native to the WebView's JavaScript context. Implement a handshake to ensure the WebView is ready before sending messages.
