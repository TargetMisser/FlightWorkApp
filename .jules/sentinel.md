## 2024-05-20 - WebView XSS Prevention
**Vulnerability:** String interpolation used in `injectJavaScript` to pass data to a WebView, allowing potential Cross-Site Scripting (XSS).
**Learning:** Even with stringified JSON, `injectJavaScript` executes the result directly in the context of the page, potentially allowing attackers to execute arbitrary JavaScript if the input contains malicious escape sequences.
**Prevention:** Use `webViewRef.current.postMessage(data)` and listen for the `message` event inside the WebView (`window.addEventListener('message', ...)`).
