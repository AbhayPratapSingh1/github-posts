# Authentication & Authorization

This document reverse-engineers the complete authentication and authorization system in Post Panel.

## Overview

Post Panel uses:
1. **GitHub OAuth** for the only user login method
2. **JWT tokens** for session management, carried exclusively in HTTP-only cookies
3. **A password step** (`ADMIN_PASSWORD`) as a second factor on top of an already-authenticated admin GitHub session
4. **A double-submit CSRF token** for cookie-authenticated, state-changing requests

There is no password-based user login and no client-side (localStorage) token storage — both were removed as security fixes (see "Security Considerations" below).

## Authentication Methods

### 1. GitHub OAuth (the only login method)

**Flow:**
1. User clicks "Sign in with GitHub" on Login page
2. Frontend redirects to `${API_BASE}/auth/github`
3. Backend redirects to GitHub OAuth authorization URL
4. User authorizes application on GitHub
5. GitHub redirects back to `${BACKEND_URL}/api/auth/github/callback`
6. Backend exchanges code for access token
7. Backend fetches user profile from GitHub API
8. Backend creates/updates user in database
9. Backend creates JWT tokens
10. Backend sets HTTP-only `session`/`refresh_token` cookies and a readable `csrf_token` cookie
11. Backend redirects to `${FRONTEND_URL}${returnTo}` — **no tokens or user data in the URL**
12. Frontend calls `GET /api/auth/me` (cookie-authenticated) to pick up the signed-in user

**Implementation:**
- **Backend:** `github_login()` and `github_callback()` in `backend-fastapi/main.py`
- **Frontend:** `AuthContext.jsx` `checkAuth()`, called once on mount

**GitHub Scopes:**
- `user:email` - Access to user email

### 2. Admin login (second factor, not a separate identity)

**Flow:**
1. User is already signed in via GitHub OAuth (has a valid `session` cookie).
2. User navigates to `/admin`; frontend calls `GET /api/admin/check` (cookie-authenticated) to confirm their GitHub id is in `ADMIN_GITHUB_IDS`.
3. If confirmed, the frontend shows a password prompt and POSTs `{ password }` to `/api/admin/login` (cookie-authenticated, no `github_id` in the body).
4. Backend re-derives the user from the session cookie itself (`get_user_from_request`), checks `is_admin_user(user)`, and only then checks `body.password == ADMIN_PASSWORD`.
5. Backend re-issues session/refresh/csrf cookies.

This means `ADMIN_PASSWORD` can never be used to authenticate as an arbitrary `github_id` supplied by the client — the target account is always the one already proven via the GitHub session. `/api/admin/login` is also rate-limited (5 attempts / 5 minutes per IP).

**Implementation:**
- **Backend:** `admin_check()` and `admin_login()` in `backend-fastapi/main.py`
- **Frontend:** `client/src/pages/AdminLogin.jsx`

**Credentials:**
- **Password:** `ADMIN_PASSWORD` environment variable (default `admin123` — **must** be overridden in prod; a startup warning is logged if it isn't)
- **GitHub IDs:** `ADMIN_GITHUB_IDS` environment variable (comma-separated)

Note: every `/api/admin/*` resource endpoint (dashboard, delete post/user/feedback, etc.) independently re-checks `github_id in ADMIN_GITHUB_IDS` via the shared `require_admin()`/`is_admin_user()` helpers in `main.py` — the password step is a UX gate on `/admin`, not something the other admin endpoints depend on.

## Token System

### JWT Structure

**Access Token:**
```json
{
  "sub": "user_id",
  "username": "github_username",
  "type": "access",
  "exp": "timestamp"
}
```

**Refresh Token:**
```json
{
  "sub": "user_id",
  "username": "github_username",
  "type": "refresh",
  "exp": "timestamp"
}
```

### Token Configuration

**Backend:** `backend-fastapi/config.py`
- `JWT_SECRET`: Secret key for signing (default: `dev-secret-change-me` — a startup warning is logged if this default is used in prod)
- `JWT_ALGORITHM`: Signing algorithm (default: `HS256`)
- `JWT_ACCESS_EXPIRY_MINUTES`: Access token lifetime (default: 15 minutes)
- `JWT_REFRESH_EXPIRY_DAYS`: Refresh token lifetime (default: 30 days)

### Token Storage

**Backend (HTTP-only cookies — the only place tokens live):**
```python
response.set_cookie(
    key="session",
    value=token,
    httponly=True,
    secure=APP_ENV == "prod",
    samesite="none" if APP_ENV == "prod" else "lax",
    max_age=JWT_ACCESS_EXPIRY_MINUTES * 60,
    path="/",
)
response.set_cookie(
    key="refresh_token",
    value=token,
    httponly=True,
    secure=APP_ENV == "prod",
    samesite="none" if APP_ENV == "prod" else "lax",
    max_age=JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60,
    path="/",
)
# Non-httponly, readable by frontend JS to echo back as a CSRF header:
response.set_cookie(key="csrf_token", value=generate_csrf_token(), httponly=False, ...)
```

There is no frontend localStorage token storage. `client/src/api/client.js`'s `request()` always sends `credentials: "include"` and reads `csrf_token` from `document.cookie` to attach an `X-CSRF-Token` header on non-GET requests. A `Bearer <access token>` `Authorization` header is still accepted by the backend (`get_user_from_request` checks it as a fallback after the cookie) for non-browser API clients and tests — this path is exempt from CSRF checks since a cross-site page can't set a custom header on the victim's behalf.

### Token Validation

**Backend:** `auth.py` `get_user_from_request()`
```python
def get_user_from_request(request: Request, db: Optional[Session]) -> Optional[User]:
    # 1. Check cookie
    token = request.cookies.get("session")

    # 2. Check Authorization header (Bearer) as a fallback
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    # 3. Decode and validate
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None

    # 4. Look up the real user in the DB
    user_id = int(payload.get("sub", 0))
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        return user

    # 5. Fallback: a lightweight _SimpleUser for a GitHub id not yet in the DB
    return _SimpleUser(id=user_id, username=payload.get("username", ""))
```
There is no hardcoded admin fallback — that was a backdoor (see "Security Considerations") and has been removed.

## Token Refresh Flow

**Endpoint:** `POST /api/auth/refresh`

1. Read refresh token from `refresh_token` cookie
2. Validate refresh token (decode, check type, look up the real DB user — no fallback identity)
3. Create new access token, re-set `session` and `csrf_token` cookies
4. Return success response

**Frontend (`api/client.js`):** on a 401 from any non-`/auth/*` request, calls `POST /auth/refresh` (cookie-based, single-flight) and retries the original request once.

## CSRF Protection

A `csrf_protect` Starlette middleware in `main.py` rejects any non-safe-method request (`POST`/`PUT`/`DELETE`/`PATCH`) that carries a `session` cookie but no matching `X-CSRF-Token` header (double-submit pattern: the header must equal the `csrf_token` cookie value). Requests authenticated purely via `Authorization: Bearer` (no `session` cookie) are unaffected, since CSRF requires ambient browser-supplied credentials.

## Authorization System

### Role-Based Access Control

**Roles:**
1. **Anonymous:** Unauthenticated user
2. **User:** Authenticated GitHub user
3. **Admin:** User with GitHub ID in `ADMIN_GITHUB_IDS`, verified via `is_admin_user()` / `require_admin()` in `main.py`

### Permission Matrix

| Resource | Anonymous | User | Admin |
|----------|-----------|------|-------|
| View posts | ✓ | ✓ | ✓ |
| View post detail | ✓ | ✓ | ✓ |
| View comments | ✓ | ✓ | ✓ |
| Create post | ✗ | ✓ | ✓ |
| Edit own post | ✗ | ✓ | ✓ |
| Delete own post | ✗ | ✓ | ✓ |
| Create comment | ✗ | ✓ | ✓ |
| Admin dashboard | ✗ | ✗ | ✓ |
| Edit any post | ✗ | ✗ | ✓ |
| Delete any post | ✗ | ✗ | ✓ |
| Delete all posts | ✗ | ✗ | ✓ |
| Delete all users | ✗ | ✗ | ✓ |

### Authorization Enforcement

**Backend:**
```python
# Require authentication
user = require_user(request, db)  # Raises 401 if not authenticated

# Check ownership
if post.user_id != user.id:
    return JSONResponse(status_code=403, content={"error": "Not authorized"})

# Check admin (centralized helper, used by every /api/admin/* route)
if not require_admin(request, db):
    return JSONResponse(status_code=403, content={"error": "Admin access required"})
```

**Frontend:**
```jsx
// Protected route component — requires a signed-in user (cookie session)
<ProtectedRoute>
  <CreatePost />
</ProtectedRoute>
```

## Protected Routes

### Frontend Protection

**Component:** `client/src/components/ProtectedRoute.jsx`

**Logic:** redirect to `/login` unless `useAuth().user` is set (i.e. `GET /api/auth/me` returned a user via the cookie session). No localStorage involved.

### Backend Protection

**Dependency:** `require_user()` in `auth.py`

**Logic:**
1. Extract user from request (cookie, or `Authorization: Bearer` fallback)
2. If no user, raise HTTPException 401
3. Return user object

## Ownership Verification

### Post Ownership

```python
@app.delete('/api/posts/{id}')
def deletePost(id, request: Request, db: Session = Depends(get_db)):
    user = require_user(request, db)
    post = postHandler.get_post_raw(id, db)
    if post.user_id != user.id:
        return JSONResponse(status_code=403, content={"error": "Not authorized"})
    postHandler.delete_post(id, db)
```

### GitHub Repository Ownership

```python
if body.github:
    owner, repo = parse_github_url(body.github)
    if owner and repo:
        gh = await fetch_github_repo(owner, repo, user.github_token)
        if gh:
            gh_owner_id = gh.get("owner", {}).get("id")
            if gh_owner_id and user.github_id and gh_owner_id != user.github_id:
                return JSONResponse(status_code=403, content={"error": "You are not the owner"})
```

## Admin System

### Admin Identification

**Configuration:**
- `ADMIN_GITHUB_IDS`: Comma-separated list of GitHub IDs (e.g., `"47173091"`)
- `ADMIN_PASSWORD`: Second-factor password for the `/admin` UI (e.g., `"admin123"` in dev — override in prod)

**Check:** `is_admin_user(user)` → `user.github_id in ADMIN_GITHUB_IDS`, centralized in `main.py` and used by every admin route.

## Security Considerations

### Fixed vulnerabilities (previously present, now removed)

1. **Hardcoded backdoor login:** `POST /api/auth/login` used to accept `{"userid": "admin", "password": "12345"}` unconditionally in every environment, minting a token for user id `1` — a full account-takeover backdoor if any real user had database id 1. **The endpoint has been removed entirely** (GitHub OAuth is the only login path).
2. **Admin login was a shared static password, not identity-bound:** `POST /api/admin/login` used to accept any client-supplied `github_id` + `ADMIN_PASSWORD`, with no proof the caller controlled that GitHub account. **Fixed:** the target user is now always derived from the caller's own authenticated session.
3. **Tokens in the OAuth redirect URL:** tokens and user JSON used to be appended to the post-login redirect URL, leaking into browser history/logs/referrers. **Fixed:** the redirect now carries no sensitive data; the frontend picks up the session via `GET /api/auth/me`.
4. **localStorage token storage:** access/refresh/admin tokens used to be stored in `localStorage`, readable by any injected script. **Fixed:** cookies (httponly) are the only storage; `localStorage` is no longer used for auth.
5. **No CSRF protection:** **Fixed** via the double-submit `csrf_token` cookie + `X-CSRF-Token` header, enforced by middleware for cookie-authenticated mutations.
6. **No rate limiting on login-type endpoints:** **Fixed** with a simple in-memory per-IP limiter on `/api/admin/login` and `/api/github/generate` (see `check_rate_limit()` in `main.py`). Note this limiter is per-process — fine for a single backend instance, not a substitute for a shared limiter behind multiple instances/a load balancer.

### Remaining considerations

- `ADMIN_PASSWORD` and `JWT_SECRET` still ship with weak defaults for local dev convenience; a startup warning fires if either default survives into `APP_ENV=prod`, but nothing prevents actually running with them. Set both explicitly in any real deployment.
- The rate limiter is in-memory and per-process; a horizontally-scaled deployment would need a shared store (e.g. Redis) for it to be effective across instances.

## Session Management

### Session Lifecycle

1. **Creation:** On login (GitHub OAuth), or admin password step (re-issues cookies for the same identity)
2. **Validation:** On each request (cookie, or Bearer header fallback)
3. **Refresh:** On 401 response (frontend) or explicit refresh
4. **Expiration:** After JWT expiry (15 min access, 30 days refresh)
5. **Destruction:** On logout (cookie deletion via `POST /api/auth/logout`)

### Session Storage

**Backend:** No server-side session storage; stateless JWT validation, DB lookup for user data.

**Frontend:** No token storage at all — the browser's cookie jar (httponly `session`/`refresh_token`, readable `csrf_token`) is the only persistence; `user` is kept in React state only, re-fetched via `/api/auth/me` on load.

## Testing Authentication

### Backend Tests

**Location:** `backend-fastapi/tests/`

**Fixtures:**
- `auth_headers`: Valid `Authorization: Bearer` headers
- `other_auth_headers`: Headers for a different user
- `create_test_user`: Factory for test users
- `create_test_post`: Factory for test posts

**Test Cases:**
- `test_auth.py`: Logout
- `test_auth_me.py`: Token validation, refresh
- `test_posts.py`: Ownership verification
- `test_security.py`: Backdoor removal, identity-bound admin login, CSRF enforcement, stored-XSS sanitization

### Frontend Tests

**Location:** `client/src/tests/`

**Test Cases:**
- `AuthContext.test.jsx`: session pickup via `/auth/me`, logout
- `client.test.js`: CSRF header attachment, token refresh retry logic
