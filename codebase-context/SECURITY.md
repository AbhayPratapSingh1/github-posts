# Security

This document identifies security-sensitive implementation areas in the Post Panel application.

> **Important:** No secrets, credentials, or sensitive values are documented here. Only security-relevant implementation areas are described.

## Security-Sensitive Areas

### 1. Authentication

**Location:** `backend-fastapi/auth.py`

**Implementation:**
- JWT-based authentication (HS256)
- HTTP-only cookies for session storage
- Bearer token support for API clients
- GitHub OAuth integration

**Security considerations:**
- JWT secret must be strong and unique per environment
- HS256 is symmetric (same secret signs and verifies)
- HTTP-only cookies prevent XSS token theft
- Token storage in localStorage is XSS-vulnerable

**What could break:** Compromised JWT secret = complete auth bypass

### 2. Password Handling

**Location:** `backend-fastapi/auth.py:59` (`verify_credentials`)

**Implementation:**
- Hardcoded admin password comparison: `password == "12345"` (line 60)
- `ADMIN_PASSWORD` env variable comparison: `body.password != ADMIN_PASSWORD` (main.py:353)

**Security concerns:**
- Hardcoded default password `12345` in development
- Default `ADMIN_PASSWORD` is `admin123` in production if not overridden
- No password hashing, no rate limiting on login attempts
- Passwords stored in plain text (env vars)

> **CRITICAL:** These defaults MUST be changed in production.

### 3. Token/Session Handling

**Backend location:** `backend-fastapi/auth.py:12-90`
**Frontend location:** `client/src/api/client.js`, `client/src/context/AuthContext.jsx`

**Implementation:**
- Access token: 15-minute expiry (JWT_ACCESS_EXPIRY_MINUTES)
- Refresh token: 30-day expiry (JWT_REFRESH_EXPIRY_DAYS)
- HTTP-only cookies for session
- localStorage for tokens (frontend)
- Tokens also passed in URL query parameters during OAuth

**Security concerns:**
- **Tokens in URL:** OAuth callback returns tokens in URL query parameters (`?token=...&refresh=...&user=...`). These appear in browser history, server logs, and referrer headers.
- **localStorage tokens:** Vulnerable to XSS (any injected script can read them)
- **No token rotation:** Refresh tokens are not rotated on use
- **No revocation:** No mechanism to invalidate tokens server-side before expiry

### 4. Authorization

**Locations:**
- `backend-fastapi/main.py` (route-level checks)
- `client/src/components/ProtectedRoute.jsx` (frontend gating)

**Implementation:**
- Post ownership: `post.user_id != user.id` → 403
- Admin: `user.github_id not in ADMIN_GITHUB_IDS` → 403
- Repository ownership verified via GitHub API

**Security concerns:**
- Authorization logic is duplicated across routes (inconsistent enforcement risk)
- GitHub repo ownership check only happens when API data is available
- Admin check uses a `github_id` allowlist from env vars
- Admin dashboard routes use `hasattr(user, "github_id")` check which could be bypassed by crafted payloads

### 5. CORS Configuration

**Location:** `backend-fastapi/main.py:32-38`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Security concerns:**
- `allow_credentials=True` combined with wildcard origins is dangerous (not used here, but must verify CORS_ORIGINS)
- `allow_methods=["*"]` allows all HTTP methods
- CORS_ORIGINS defaults to `FRONTEND_URL` (localhost in dev)

### 6. Input Validation

**Locations:**
- `backend-fastapi/main.py` (Pydantic models, manual validation)
- `client/src/pages/CreatePost.jsx` (form validation)

**Implementation:**
- Pydantic models for request body validation
- Manual validation for GitHub URLs, comment content

**Security concerns:**
- Post descriptions are rendered with `dangerouslySetInnerHTML` in Post.jsx
- If descriptions contain user-supplied HTML/JS, this is an XSS vector
- Markdown rendering uses react-markdown (sanitizes by default, but Quill HTML may not be)

### 7. XSS Risk (Content Rendering)

**Location:** `client/src/pages/Post.jsx`

**Implementation:**
```javascript
// Auto-detects HTML vs Markdown
if (description.includes("<")) {
  // Renders as raw HTML - XSS risk
  dangerouslySetInnerHTML={{ __html: description }}
} else {
  // React-markdown (sanitized)
}
```

**Security concern:** If the description contains user-supplied HTML with scripts, it renders unsanitized. The backend converts AI-generated Markdown to HTML via `markdown.markdown()` (which does NOT sanitize).

### 8. CSRF

**Implementation:** No CSRF protection detected.

**Risk:** State-changing endpoints (POST/PUT/DELETE) could be triggered via cross-site requests if cookies are sent automatically. However, cookie SameSite is set to `lax` in dev and `none` in prod, which provides partial protection.

### 9. SQL Injection

**Implementation:**
- SQLAlchemy ORM used throughout (parameterized queries by default)
- No raw SQL string concatenation detected (except safe usage in `text()`)

**Current risk:** Low - ORM usage provides protection.

### 10. Secrets Management

**Environment variables containing secrets:**
- `JWT_SECRET`
- `GITHUB_CLIENT_SECRET_POST_PANEL`
- `GITHUB_TOKEN`
- `GEMINI_API_KEY_POST_PANEL`
- `ADMIN_PASSWORD`
- `DATABASE_URL` (contains credentials)

**Security concerns:**
- Defaults in code: `JWT_SECRET=dev-secret-change-me`, `ADMIN_PASSWORD=admin123`
- `.env` files ignored by git (good), but must not be committed
- `GEMINI_API_KEY_POST_PANEL` loaded from shell environment (good for production)
- Secrets in GitHub Actions via repository secrets (good practice)

### 11. Rate Limiting

**Implementation:** No rate limiting detected.

**Vulnerable endpoints:**
- `/api/auth/login` (brute force)
- `/api/admin/login` (brute force)
- `/api/posts` (abuse)
- `/api/github/generate` (API cost abuse)

**Recommendation:** Add rate limiting, especially for auth and admin endpoints.

### 12. File Uploads

**Implementation:** No file upload features detected.

**Current risk:** N/A

### 13. Webhooks

**Implementation:** No webhooks detected.

**Current risk:** N/A

### 14. Error Messages

**Locations:** Various JSON error responses

**Security concerns:**
- Some errors reveal internal details:
  - `github_callback` redirect URLs include error details
  - `generatePostContent` includes raw exception strings: `f"Failed to generate content: {str(e)}"`
  - `getGithubInfo` exposes rate-limit information

## Security Checklist

### Authentication
- [ ] Strong JWT secret in production
- [ ] Password hashing (currently plain text)
- [ ] Login rate limiting
- [ ] Token revocation capability

### Authorization
- [ ] Centralized permission checks (currently per-route)
- [ ] Admin GitHub ID allowlist review
- [ ] Ownership checks consistent across routes

### Data Protection
- [ ] Tokens removed from URL (currently in OAuth callback)
- [ ] XSS sanitization for rich text content
- [ ] CSRF protection
- [ ] GitHub tokens encrypted at rest

### Configuration
- [ ] Change default admin password
- [ ] Change default JWT secret
- [ ] Review CORS_ORIGINS for production
- [ ] Secret rotation strategy

### Infrastructure
- [ ] Rate limiting implementation
- [ ] Error logging/alerting
- [ ] Dependency vulnerability scanning
- [ ] HTTPS enforcement (external platform provides)

## Security-Relevant Code References

### High Priority
1. `backend-fastapi/auth.py:59-60` - Hardcoded admin credentials
2. `backend-fastapi/config.py:18` - Default JWT secret
3. `backend-fastapi/config.py:29` - Default admin password
4. `backend-fastapi/main.py:309` - Tokens in URL
5. `client/src/pages/Post.jsx` - Raw HTML rendering
6. `backend-fastapi/main.py:798-800` - Markdown to HTML (no sanitization)

### Medium Priority
7. `backend-fastapi/main.py:32-38` - CORS configuration
8. `backend-fastapi/main.py:480-529` - Comment content (GET body)
9. `client/src/api/client.js:8-9` - localStorage token access
10. `backend-fastapi/database.py` - DB connection error handling

## Security-Sensitive Actions for Developers

**When modifying authentication:**
- Never log JWT tokens
- Ensure tokens invalidated on logout
- Use `require_user()` for protected routes

**When modifying post rendering:**
- Sanitize all user-generated content
- Avoid `dangerouslySetInnerHTML` with unsanitized content
- Consider a sanitization library (DOMPurify)

**When adding new environment variables:**
- Use the `_POST_PANEL` suffix convention for GitHub-related vars
- Never log values
- Add to deployment platform configuration

**When modifying admin functionality:**
- Always verify `user.github_id in ADMIN_GITHUB_IDS`
- Log admin actions for audit
- Follow the existing authorization pattern

## Incident Response Notes

**If JWT secret is compromised:**
1. Rotate JWT_SECRET immediately
2. All tokens become invalid (users must re-login)
3. Review logs for suspicious activity

**If GitHub secret is compromised:**
1. Revoke GitHub OAuth app token
2. Create new GitHub OAuth app
3. Update environment variables

**If database credentials compromised:**
1. Rotate database password
2. Consider data breach notification
3. Audit user data access