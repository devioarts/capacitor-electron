# Content Security Policy (CSP)

Electron does not apply a CSP automatically — without configuration the renderer has full access to `eval`, inline scripts, and arbitrary external origins. This plugin injects CSP via `session.defaultSession.webRequest.onHeadersReceived` before any window loads.

---

## Default behaviour

If `csp` is not set in `capacitor.config.ts`, the plugin picks an environment-appropriate default:

**Dev** (`app.isPackaged === false`):
```
default-src 'self' 'unsafe-inline' http://localhost:* ws://localhost:*;
script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:*
```

**Prod** (`app.isPackaged === true`):
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self' data:;
connect-src 'self'
```

---

## Configuration

Set `csp` under `plugins.Electron` in `capacitor.config.ts`.

### Disable CSP entirely

```typescript
plugins: {
  Electron: {
    csp: false,
  },
},
```

> Not recommended for production.

### Custom CSP as a string

```typescript
plugins: {
  Electron: {
    csp: "default-src 'self'; script-src 'self'; connect-src 'self' https://api.example.com",
  },
},
```

### Custom CSP as a directives object

```typescript
plugins: {
  Electron: {
    csp: {
      'default-src': "'self'",
      'script-src':  "'self'",
      'style-src':   ["'self'", "'unsafe-inline'"],
      'img-src':     ["'self'", 'data:', 'https://cdn.example.com'],
      'connect-src': ["'self'", 'https://api.example.com'],
      'font-src':    ["'self'", 'data:'],
    },
  },
},
```

`string[]` values for a directive are joined with spaces.

---

## Common scenarios

### Web Workers

Capacitor web plugins may use Web Workers. If you see a console error about a blocked worker, add `worker-src`:

```typescript
csp: {
  'default-src': "'self'",
  'script-src':  "'self'",
  'worker-src':  ["'self'", 'blob:'],
},
```

### Loading images from an external CDN

```typescript
csp: {
  'default-src': "'self'",
  'script-src':  "'self'",
  'img-src':     ["'self'", 'data:', 'https://cdn.example.com'],
},
```

### Connecting to a REST API

```typescript
csp: {
  'default-src': "'self'",
  'script-src':  "'self'",
  'connect-src': ["'self'", 'https://api.example.com'],
},
```

### Google Fonts

```typescript
csp: {
  'default-src': "'self'",
  'script-src':  "'self'",
  'style-src':   ["'self'", 'https://fonts.googleapis.com'],
  'font-src':    ["'self'", 'https://fonts.gstatic.com'],
},
```

---

## Notes

- CSP is applied via HTTP response headers, not a `<meta>` tag — this works reliably even with dynamically loaded content.
- In dev mode the default CSP intentionally allows `unsafe-eval` and `unsafe-inline` because Vite HMR requires them.
- If you are unsure what to block, open DevTools (Console + Network) and watch for CSP violations — the browser logs them to the console.
- `session.defaultSession` applies to all windows in the app. If you need per-window CSP, use a named session (`session.fromPartition('...')`).
