# Observability

Current state of logging, monitoring, and debugging capabilities in Post Panel.

## Summary

There are currently **no** formal observability mechanisms: no structured logging, no metrics, no tracing, no application-monitoring service (no Sentry, no Prometheus, no OpenTelemetry). All visibility comes from Python `print()` statements (stdout) and browser `console.*` calls.

## Backend Logging

### Source: Python `print()` statements and FastAPI errors

- Errors in request handlers are caught and `print`ed (e.g., exception prints in route handlers).
- FastAPI renders uncaught exceptions as generic 500 responses with the exception text in the body.
- No `logging` module configured; no log levels; no middleware that logs method/path/status.

**Note:** When deployed to Render, stdout/stderr automatically go to Render logs. There is no retention/correlation/alerting.

## Frontend Logging

### Source: `console.log` / `console.error` calls

- Various components log errors to `console.error` on fetch failures (e.g., `client.js`, `AuthContext.jsx`, `Post.jsx`).
- No error-boundary wrapping exists in `main.jsx` (app-level crash = blank page, logged to console only).

## Metrics / Dashboards

None. There is no `/metrics` endpoint, no Prometheus integration, and no Grafana dashboards for this app.

## Caching Observability

- GitHub repo data is cached in-memory (`_github_cache` in `main.py`) with a 1 hour TTL. There is no cache-hit/miss logging.

## Tracing & Correlation IDs

None. Requests are not assigned trace/correlation IDs. Errors cannot be correlated across client/server automatically.

## Health / Readiness

- There is **no dedicated `/health` or `/api/health` endpoint**. The only trivial probe is `GET /` (the `testing()` handler in `main.py:130`), which is an app status response, not a health check.
- No liveness/readiness probes or proper `/health` depth (DB check) configured.

## What Exists Today (Concrete)

| Capability | Status | Evidence |
|------------|--------|----------|
| Request logging | ✖ None | No middleware |
| Structured logging | ✖ None | No logging config |
| Error reporting service | ✖ None | No Sentry/GlitchTip/etc. |
| Metrics endpoint | ✖ None | No /metrics |
| Tracing | ✖ None | Not present |
| Correlation IDs | ✖ None | Not present |
| Health endpoint | ✖ None | No /health or /api/health route |
| Cache observability | ✖ None | No hit/miss counters |
| Frontend error boundary | ✖ None | No boundary in `main.jsx` |
| CI test/log artifacts | ✔ Partial | GitHub Actions run output; no test-report publishing |

## Recommendation Notes (Gaps)

- Add `logging` config + request middleware if observability is needed.
- Wrap the React app in an ErrorBoundary for better UX on uncaught JS errors.
- Consider how the `_github_cache` and DB-fallback behavior would appear in production logs today (they are silent on success).