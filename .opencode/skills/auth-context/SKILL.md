---
name: auth-context
description: Use when the user asks about authentication, authorization, login, GitHub OAuth, JWT tokens, sessions, token refresh, cookies, or protected routes in the post-panel codebase. Triggers on "login", "logout", "OAuth", "GitHub sign in", "JWT", "token", "session", "refresh", "cookie", "auth", "ProtectedRoute". Open exactly the named files below instead of exploring the repo broadly.
---

# Auth Context — Specific Files

Read the source files in the order shown. `codebase-context/AUTH.md` and `codebase-context/FLOWS.md` are verified snapshots; the source is authoritative.

## Backend

| What | File | Notes |
|------|------|-------|
| Token + user logic | `backend-fastapi/auth.py` | `create_access_token` (~12), `create_refresh_token` (~22), `decode_token` (~32), `verify_credentials` (~59), `get_user_from_request` (~65), `refresh_access_token` (~93), `require_user` (~109) |
| Auth routes | `backend-fastapi/main.py` | `login` (~140), `get_me` (~161), `logout` (~184), `refresh` (~191), `github_login` (~206), `github_callback` (~219) |
| User model | `backend-fastapi/app/models.py` (class `User`, ~line 29) | `github_id` unique |
| Env secrets | `backend-fastapi/config.py` | JWT_SECRET, ADMIN_PASSWORD, ADMIN_GITHUB_IDS defaults (unsafe in prod) |

## Frontend

| What | File | Notes |
|------|------|-------|
| Auth state | `client/src/context/AuthContext.jsx` | `checkAuth` (~30), OAuth token parsing from URL params (~62), `login` (~91), `logout` (~112) |
| HTTP client / token attach | `client/src/api/client.js` | `refreshToken` (~12), `request` (~33) with 401 retry |
| Login page | `client/src/pages/Login.jsx` | GitHub OAuth link + admin login link |
| Route guard | `client/src/components/ProtectedRoute.jsx` | gates `/create`, `/post/:id/edit`, `/admin/post/:id/edit` |
| User display | `client/src/components/ProfileMenu.jsx` | avatar + signout |

## Token storage (dual — be careful changing)

- localStorage keys: `session_token`, `refresh_token`, `admin_token` (written via `client/src/api/client.js` token helpers / `AuthContext.jsx`).
- HTTP-only cookies: `session` and `refresh_token` (set in `main.py` `set_session_cookie`/`set_refresh_cookie`, ~108/~119). Cookie `secure`/`samesite` behavior is controlled by `APP_ENV`.
- Order of auth resolution in `get_user_from_request`: session cookie → Authorization Bearer → refresh cookie → fallback admin user if `verify_credentials` matches env `ADMIN_PASSWORD`.

## Key gotchas

1. **OAuth redirect tokens:** `github_callback` returns tokens via URL query params (`token`, `refresh`, `user`); parsed in `AuthContext.checkAuth`. Cleared client-side but transiently present in the URL.
2. **Cookie vs Bearer:** cookies are set on the same-origin backend; the frontend mostly uses the Authorization header from localStorage.
3. **Admin fallback user:** `auth.py` synthesizes an admin user when `verify_credentials(ADMIN_PASSWORD)` matches — no DB row required.
4. **Token expiry defaults:** access 15 min (`JWT_ACCESS_EXPIRY_MINUTES`), refresh 30 days (`JWT_REFRESH_EXPIRY_DAYS`).
5. **Auth tests:** `backend-fastapi/tests/test_auth.py`, `test_auth_me.py`; `client/src/tests/api/client.test.js`, `client/src/tests/context/AuthContext.test.jsx`.