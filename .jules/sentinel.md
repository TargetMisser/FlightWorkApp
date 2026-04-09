## 2025-04-09 - [WebView XSS Injection Risk]
**Vulnerability:** A base64 image array was serialized to JSON and then subjected to manual quote replacement (`replace(/'/g, "\\'")`) before being interpolated into a template string passed to `injectJavaScript`.
**Learning:** Manual string replacement is a flawed approach to escaping JSON for injection into JavaScript contexts. If single quotes, double quotes, or backslashes are mishandled, it breaks the JavaScript syntax or opens the door for code injection.
**Prevention:** To safely interpolate complex data types into `injectJavaScript` templates, directly use `JSON.stringify` on the variables inside the template string block, ensuring the runtime parses it as a perfectly valid, robust literal string.
