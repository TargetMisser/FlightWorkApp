## 2024-04-29 - Cross-Site Scripting (XSS) risk via injectJavaScript
**Vulnerability:** React Native WebViews used `injectJavaScript` with dynamically stringified data (e.g. `JSON.stringify(base64List)`) that could be intercepted or manipulated, leading to potential Cross-Site Scripting (XSS) in the WebView context.
**Learning:** Even when the data being injected is ostensibly secure (like base64 image strings), directly injecting it into a JavaScript string for evaluation within `injectJavaScript` carries XSS risks.
**Prevention:** Use `webViewRef.current.postMessage` to pass data safely across the React Native and WebView boundary. Implement `message` event listeners in the WebView to handle the incoming data instead of dynamically constructing script strings.
