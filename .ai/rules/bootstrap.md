---
paths:
  - bootstrap/app.php
---

# Bootstrap

## Trust the Caddy proxy, or the app thinks every request is insecure
Production runs behind Caddy, which terminates TLS and forwards plain HTTP to the container on :8080. `bootstrap/app.php` must keep its `->trustProxies()` call: without it Laravel discards `X-Forwarded-Proto` and treats every request as insecure. Three things break at once - `asset()` emits `http://` onto an HTTPS page, so the browser blocks the Vite bundle as mixed content; the session cookie never earns its `Secure` flag; and `$request->ip()` returns Caddy's container IP for every visitor, silently collapsing Fortify's per-IP login throttling into one global bucket.

`URL::forceHttps()` in AppServiceProvider masks only the URL symptom, and only when `APP_ENV` is exactly `production`. Working links are not proof the proxy is trusted - check `$request->ip()`.

`at: '*'` is safe only while compose.prod.yaml publishes no host ports (`expose` only), so nothing but Caddy can reach 8080. The paired `trustHosts(at: ['juanplaza.dev'])` is not optional: trusting `X-Forwarded-Host` without pinning the Host header invites poisoned password-reset links. Both `trustHosts` and Octane's `OCTANE_HTTPS` are no-ops under the test runner and in local, so cover this with forwarded-header tests instead - see tests/Feature/TrustedProxyTest.php.

The pin also rejects the container's own healthcheck, which reaches Octane over loopback as Host `127.0.0.1:8080`: `/up` answers 400, the container never goes healthy and the deploy fails while the app is serving fine. That is why the Dockerfile HEALTHCHECK sends `-H 'Host: juanplaza.dev'`. Editing the trusted host list means editing that line - see .ai/rules/workflows.md.
