# Security

This document identifies security-sensitive implementation areas in the Post Panel application, and records the state of a security review/remediation pass. See `AUTH.md` for the full authentication/authorization design.

> **Important:** No secrets, credentials, or sensitive values are documented here. Only security-relevant implementation areas are described.

## Fixed in the last security pass

The following were identified and fixed. Kept here so the reasoning isn't lost.

1. **Hardcoded backdoor login (critical).** `POST /api/auth/login` accepted `{"userid": "admin", "password": "12345"}` unconditionally in every environment and minted a token for user id `1` — a full account-takeover backdoor for whichever real user happened to have DB id 1. **Fix:** the endpoint and the `verify_credentials`/`ADMIN_USER` backdoor path in `auth.py` were removed entirely. GitHub OAuth is the only login method now.
2. **Admin login not identity-bound (critical).** `POST /api/admin/login` used to accept any client-supplied `github_id` + the shared `ADMIN_PASSWORD`, with no proof the caller controlled that account. **Fix:** the target user is now derived from the caller's own authenticated session (`get_user_from_request`); the password is a second factor on an already-proven identity, not the whole authentication. Also rate-limited (5 attempts / 5 min / IP).
3. **CSRF (high).** No CSRF protection existed. **Fix:** a double-submit `csrf_token` cookie + `X-CSRF-Token` header, enforced by a middleware (`csrf_protect` in `main.py`) for any non-safe-method request that carries a `session` cookie. Bearer-token-only requests (API clients, tests) are exempt by design.
4. **Stored XSS via unsanitized HTML (high).** `description` was rendered via `dangerouslySetInnerHTML` with no sanitization anywhere in the pipeline (backend markdown→HTML conversion didn't sanitize either). **Fix:** `bleach.clean()` with a tag/attribute/protocol allowlist (`sanitize_html()` in `main.py`) is applied server-side to `description` on every write path (`createPost`, `updatePost`, `admin_update_post`, AI generation). `DOMPurify.sanitize()` was also added client-side in `Post.jsx` immediately before the `dangerouslySetInnerHTML` call, as defense-in-depth.
5. **Tokens in the OAuth redirect URL (high).** Tokens and user JSON were appended to the post-login redirect query string, leaking into browser history/server logs/referrers. **Fix:** the redirect now carries no query data; cookies set in the same response are the only thing that establishes the session, and the frontend calls `GET /api/auth/me` to pick up the user.
6. **Tokens in `localStorage` (high).** Access/refresh/admin tokens were stored in `localStorage`, readable by any injected script. **Fix:** removed entirely. `client/src/api/client.js`, `AuthContext.jsx`, `posts.js`, `AdminLogin.jsx`, `AdminDashboard.jsx`, and `ProtectedRoute.jsx` now rely solely on httponly cookies (`credentials: "include"`); `Authorization: Bearer` is still accepted server-side as a fallback for non-browser clients/tests only.
7. **Duplicated admin authorization checks (medium).** The `user.github_id not in ADMIN_GITHUB_IDS` check was repeated inline across ~7 routes. **Fix:** centralized into `is_admin_user()` / `require_admin()` in `main.py`, used by every `/api/admin/*` route and the other two admin-adjacent checks (`/auth/me`'s `is_admin` field, comment moderation).
8. **Verbose debug logging (medium).** `print()` calls logged usernames/github_ids/admin-check outcomes on every admin-related request. **Fix:** removed.
9. **Unvalidated Cloudinary media confirmation (medium).** `POST /api/posts/{id}/media/confirm` stored a client-supplied `secureUrl`/`cloudinaryPublicId` with no server-side validation. **Fix:** the endpoint now requires `secureUrl` to start with `https://res.cloudinary.com/{CLOUDINARY_CLOUD_NAME}/`, `resourceType` to be `image`/`video`, and `cloudinaryPublicId` to be scoped under `posts/{post_id}`.
10. **Accidental HTTPS→HTTP downgrade (low).** The same endpoint used to store `secureUrl.replace("https://", "http://")` into `cloudinary_url`. **Fix:** stores the secure URL as-is.
11. **Raw exception strings returned to clients (low).** `/api/github/generate` returned `f"Failed to generate content: {str(e)}"` verbatim. **Fix:** returns a generic message; the real exception is logged server-side via `logger.warning`.
12. **No rate limiting (low/medium).** **Fix:** a simple in-memory per-IP fixed-window limiter (`check_rate_limit()` in `main.py`) applied to `/api/admin/login` (5/5min) and `/api/github/generate` (10/hour). Note: per-process only — not sufficient on its own across multiple backend instances.
13. **Mass-assignment hardening (defense-in-depth, was already low-risk).** `postHandler.update_post` now explicitly excludes `id`/`user_id` and only sets attributes that exist on the `Post` model, rather than blindly `setattr`-ing every dict key.

## Security-Sensitive Areas (current state)

### 1. Authentication
**Location:** `backend-fastapi/auth.py`, `backend-fastapi/main.py` (OAuth routes)
- JWT-based (HS256), httponly cookies as primary transport, Bearer header as a fallback for non-browser clients.
- GitHub OAuth is the only login method (no password-based user login).
- **Still true:** a compromised `JWT_SECRET` = complete auth bypass. `JWT_SECRET`/`ADMIN_PASSWORD` still default to weak dev values; a startup warning fires if either default is detected with `APP_ENV=prod`, but nothing blocks it from actually running that way. Set both explicitly in real deployments.

### 2. Admin Authentication
**Location:** `backend-fastapi/main.py` (`admin_check`, `admin_login`, `require_admin`)
- Two-factor-like: real GitHub-authenticated session (`github_id in ADMIN_GITHUB_IDS`) + `ADMIN_PASSWORD`, identity always derived server-side from the session — never trusts a client-supplied `github_id`.
- Rate-limited (5/5min/IP).

### 3. Token/Session Handling
- Access token: 15-minute expiry. Refresh token: 30-day expiry. Both httponly cookies; `csrf_token` is a readable, non-httponly cookie used only for the CSRF double-submit check.
- No server-side revocation list — compromise of `JWT_SECRET` is still the nuclear option (rotate it; all tokens become invalid).

### 4. Authorization
- Post ownership: `post.user_id != user.id` → 403 (checked per-route, consistent).
- Admin: centralized via `is_admin_user()`/`require_admin()`.
- GitHub repo ownership verified via GitHub API when creating/updating a post with a `github` URL.

### 5. CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
`CORS_ORIGINS` must be a real allowlist (never `*`) in prod since `allow_credentials=True` — this is the operator's responsibility via the `CORS_ORIGINS` env var, not something the code can enforce.

### 6. CSRF
Double-submit `csrf_token` cookie + `X-CSRF-Token` header, enforced by `csrf_protect` middleware in `main.py` for any non-safe-method request carrying a `session` cookie.

### 7. XSS / Content Rendering
- `description` is sanitized server-side (`sanitize_html()`, bleach allowlist) on every write path, and again client-side (`DOMPurify.sanitize()`) in `client/src/pages/Post.jsx` immediately before `dangerouslySetInnerHTML`.
- Markdown-rendered content from `react-markdown` remains separately safe by default (only the raw-HTML branch needed sanitization).

### 8. SQL Injection
SQLAlchemy ORM used throughout; the only raw `text()` calls are static DDL strings in the startup migration block with no user input interpolated. Low risk, unchanged.

### 9. Secrets Management
Environment variables containing secrets: `JWT_SECRET`, `GITHUB_CLIENT_SECRET_POST_PANEL`, `GITHUB_TOKEN`, `GEMINI_API_KEY_POST_PANEL`, `ADMIN_PASSWORD`, `DATABASE_URL`. `.env` files are gitignored (verified not tracked in git). Defaults still exist for local dev (`JWT_SECRET=dev-secret-change-me`, `ADMIN_PASSWORD=admin123`) — a startup warning fires in `APP_ENV=prod` if either is left at its default.

### 10. Rate Limiting
In-memory per-IP limiter on `/api/admin/login` and `/api/github/generate`. Per-process only; a multi-instance deployment needs a shared limiter (e.g. Redis-backed) to be robust.

### 11. File Uploads (Media)
Cloudinary-backed image/video uploads, signed server-side (`_generate_cloudinary_signature`). `POST /api/posts/{id}/media/confirm` now validates the reported URL/resource-type/public-id shape before trusting it.

### 12. Error Messages
Exception details are no longer echoed back to clients (e.g. `/api/github/generate`); logged server-side instead.

## Security Checklist

### Authentication
- [x] Password-based backdoor login removed
- [x] Admin login bound to an authenticated session, not client-supplied identity
- [ ] Strong `JWT_SECRET`/`ADMIN_PASSWORD` in production (env-var responsibility; warned at startup, not enforced)
- [x] Login rate limiting (admin login, AI generation)
- [ ] Token revocation capability (still none — rotate `JWT_SECRET` to invalidate everything)

### Authorization
- [x] Centralized admin permission checks
- [ ] Admin GitHub ID allowlist review (operator responsibility)
- [x] Ownership checks consistent across routes

### Data Protection
- [x] Tokens removed from URL and from client-side storage (cookies only)
- [x] XSS sanitization for rich text content (server + client)
- [x] CSRF protection
- [ ] GitHub tokens encrypted at rest (still stored plaintext in `user.github_token`)

### Configuration
- [ ] Change default admin password (operator responsibility; warned at startup)
- [ ] Change default JWT secret (operator responsibility; warned at startup)
- [ ] Review `CORS_ORIGINS` for production (operator responsibility)
- [ ] Secret rotation strategy

### Infrastructure
- [x] Basic rate limiting (in-memory, per-process)
- [ ] Rate limiting behind a shared store for multi-instance deployments
- [ ] Error logging/alerting beyond stdout
- [ ] Dependency vulnerability scanning
- [ ] HTTPS enforcement (external platform provides)

## Security-Relevant Code References

1. `backend-fastapi/auth.py` — token issuance/validation, no backdoor path
2. `backend-fastapi/main.py` (`admin_login`, `require_admin`, `is_admin_user`) — identity-bound admin auth
3. `backend-fastapi/main.py` (`csrf_protect` middleware) — CSRF enforcement
4. `backend-fastapi/main.py` (`sanitize_html`, `ALLOWED_HTML_*`) — XSS sanitization
5. `client/src/pages/Post.jsx` — `DOMPurify.sanitize()` before `dangerouslySetInnerHTML`
6. `backend-fastapi/main.py` (`check_rate_limit`) — rate limiting
7. `backend-fastapi/main.py` (`confirm_media_upload`) — Cloudinary URL/type/id validation
8. `backend-fastapi/config.py:18,29` — default secrets (still present for dev convenience; warned at startup in prod)

## Security-Sensitive Actions for Developers

**When modifying authentication:**
- Never log JWT tokens.
- Never add a password-comparison fallback that doesn't derive its target identity from an already-validated session/token — that's exactly the class of bug that was fixed here.
- Use `require_user()` for protected routes.

**When modifying post rendering:**
- Any new way to render user-controlled HTML must go through `sanitize_html()` (backend) — don't rely on client-side sanitization alone.

**When adding new environment variables:**
- Use the `_POST_PANEL` suffix convention for GitHub-related vars.
- Never log values.
- Add to deployment platform configuration.

**When modifying admin functionality:**
- Use `require_admin()` / `is_admin_user()` — don't re-inline the `github_id in ADMIN_GITHUB_IDS` check.
- Never derive the target admin identity from client-supplied input; always derive it from the authenticated session.

**When adding a new state-changing (POST/PUT/DELETE) endpoint:**
- It's automatically covered by the CSRF middleware for cookie-authenticated calls — no per-route work needed, but frontend calls to it must go through `client.js`'s `request()` (or otherwise attach `X-CSRF-Token` from the `csrf_token` cookie) to succeed from the browser.

## Incident Response Notes

**If JWT secret is compromised:**
1. Rotate `JWT_SECRET` immediately.
2. All tokens become invalid (users must re-login).
3. Review logs for suspicious activity.

**If GitHub secret is compromised:**
1. Revoke GitHub OAuth app token.
2. Create new GitHub OAuth app.
3. Update environment variables.

**If database credentials compromised:**
1. Rotate database password.
2. Consider data breach notification.
3. Audit user data access.

**If `ADMIN_PASSWORD` is suspected to have leaked:**
1. Rotate `ADMIN_PASSWORD` immediately (this alone doesn't help an attacker who already compromised an actual admin's GitHub account — review `ADMIN_GITHUB_IDS` too).
2. Review admin-action-adjacent data (post/user/feedback deletions) for anything unexpected.
