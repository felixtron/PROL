## 2024-05-28 - Open Redirect Vulnerability via Backslash
**Vulnerability:** Open redirect in `callbackUrl` validation during sign-in and sign-up.
**Learning:** Checking for `.startsWith("/") && !.startsWith("//")` is insufficient for preventing open redirects because browsers often normalize backslashes. A URL like `/\evil.example` passes the check but resolves to `http://evil.example`.
**Prevention:** Always check and reject `/\` alongside `//` when validating relative paths, or use a robust URL parsing library to validate that the hostname matches the expected origin before redirecting.
