# Authentication & Authorization

This document reverse-engineers the complete authentication and authorization system in Post Panel.

## Overview

Post Panel uses a dual authentication system:
1. **GitHub OAuth** for primary user authentication
2. **Credential-based login** for admin access
3. **JWT tokens** for session management
4. **HTTP-only cookies + localStorage** for token storage

## Authentication Methods

### 1. GitHub OAuth (Primary)

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
10. Backend sets HTTP-only cookies
11. Backend redirects to frontend with tokens in URL
12. Frontend parses tokens from URL
13. Frontend stores tokens in localStorage
14. Frontend updates auth state

**Implementation:**
- **Backend:** `github_login()` and `github_callback()` in `backend-fastapi/main.py:206-315`
- **Frontend:** `AuthContext.jsx` useEffect on mount

**GitHub Scopes:**
- `user:email` - Access to user email

**Token Exchange:**
```python
# Backend exchanges code for access token
token_res = await client.post(
    "https://github.com/login/oauth/access_token",
    json={
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
    },
    headers={"Accept": "application/json"},
)
```

### 2. Credential-Based Login (Admin)

**Flow:**
1. User navigates to `/admin`
2. User enters GitHub ID and password
3. Frontend sends POST to `/api/admin/login`
4. Backend verifies password against `ADMIN_PASSWORD`
5. Backend verifies GitHub ID in `ADMIN_GITHUB_IDS`
6. Backend creates JWT tokens
7. Backend sets HTTP-only cookies
8. Backend returns user data and access token

**Implementation:**
- **Backend:** `admin_login()` in `backend-fastapi/main.py:349-382`
- **Frontend:** `AuthContext.login()` in `client/src/context/AuthContext.jsx:91-110`

**Credentials:**
- **Password:** `ADMIN_PASSWORD` environment variable (default: `admin123`)
- **GitHub IDs:** `ADMIN_GITHUB_IDS` environment variable (comma-separated)

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
- `JWT_SECRET`: Secret key for signing (default: `dev-secret-change-me`)
- `JWT_ALGORITHM`: Signing algorithm (default: `HS256`)
- `JWT_ACCESS_EXPIRY_MINUTES`: Access token lifetime (default: 15 minutes)
- `JWT_REFRESH_EXPIRY_DAYS`: Refresh token lifetime (default: 30 days)

### Token Storage

**Backend (HTTP-only cookies):**
```python
# Access token cookie
response.set_cookie(
    key="session",
    value=token,
    httponly=True,
    secure=APP_ENV == "prod",
    samesite="none" if APP_ENV == "prod" else "lax",
    max_age=JWT_ACCESS_EXPIRY_MINUTES * 60,
    path="/",
)

# Refresh token cookie
response.set_cookie(
    key="refresh_token",
    value=token,
    httponly=True,
    secure=APP_ENV == "prod",
    samesite="none" if APP_ENV == "prod" else "lax",
    max_age=JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60,
    path="/",
)
```

**Frontend (localStorage):**
```javascript
// Access token
localStorage.setItem("session_token", token)

// Refresh token
localStorage.setItem("refresh_token", token)

// Admin token (alternative)
localStorage.setItem("admin_token", token)
```

### Token Validation

**Backend:** `auth.py:65-90`
```python
def get_user_from_request(request: Request, db: Optional[Session]) -> Optional[User]:
    # 1. Check cookie
    token = request.cookies.get("session")
    
    # 2. Check Authorization header
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    # 3. Decode and validate
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    
    # 4. Look up user
    user_id = int(payload.get("sub", 0))
    user = db.query(User).filter(User.id == user_id).first()
    
    # 5. Fallback for hardcoded admin
    if not user and payload.get("username") == "admin":
        return ADMIN_USER
    
    return user
```

**Frontend:** `api/client.js:33-76`
```javascript
export const request = async (path, options = {}) => {
  const token = getToken()
  
  // Add token to headers
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  
  // Make request
  const res = await fetch(`${API_BASE}${path}`, { ... })
  
  // Handle 401 - refresh and retry
  if (res.status === 401 && !path.includes("/auth/")) {
    await refreshToken()
    // Retry original request
  }
}
```

## Token Refresh Flow

### Backend Refresh

**Endpoint:** `POST /api/auth/refresh`
**Implementation:** `backend-fastapi/main.py:191-204`

1. Read refresh token from `refresh_token` cookie
2. Validate refresh token (decode, check type)
3. Look up user in database
4. Create new access token
5. Set new `session` cookie
6. Return success response

### Frontend Refresh

**Implementation:** `api/client.js:12-31`

1. On 401 response, call `refreshToken()`
2. Send POST to `/api/auth/refresh` with current token
3. If successful, update `session_token` in localStorage
4. Retry original request with new token

**Single-flight refresh:**
```javascript
let isRefreshing = false
let refreshPromise = null

if (res.status === 401) {
  if (!isRefreshing) {
    isRefreshing = true
    refreshPromise = refreshToken().finally(() => {
      isRefreshing = false
      refreshPromise = null
    })
  }
  await refreshPromise
  // Retry request
}
```

## Authorization System

### Role-Based Access Control

**Roles:**
1. **Anonymous:** Unauthenticated user
2. **User:** Authenticated GitHub user
3. **Admin:** User with GitHub ID in `ADMIN_GITHUB_IDS`

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

# Check admin
if user.github_id not in ADMIN_GITHUB_IDS:
    return JSONResponse(status_code=403, content={"error": "Admin access required"})
```

**Frontend:**
```jsx
// Protected route component
<ProtectedRoute>
  <CreatePost />
</ProtectedRoute>

// ProtectedRoute checks:
// - admin_token exists, OR
// - session_token exists and user is authenticated
```

## Authentication Flows

### Signup Flow (GitHub OAuth)

```
User clicks "Sign in with GitHub"
  ↓
Frontend: window.location = `${API_BASE}/auth/github`
  ↓
Backend: Redirect to GitHub OAuth
  ↓
GitHub: User authorizes
  ↓
Backend: /api/auth/github/callback
  ↓
Backend: Exchange code for access token
  ↓
Backend: Fetch user profile from GitHub API
  ↓
Backend: Create/Update User in database
  ↓
Backend: Create JWT tokens
  ↓
Backend: Set HTTP-only cookies
  ↓
Backend: Redirect to FRONTEND_URL?token=...&refresh=...&user=...
  ↓
Frontend: Parse tokens from URL
  ↓
Frontend: Store in localStorage
  ↓
Frontend: Update AuthContext state
  ↓
Frontend: Clear URL parameters
```

### Signin Flow (Admin)

```
User navigates to /admin
  ↓
User enters GitHub ID and password
  ↓
Frontend: POST /api/admin/login
  ↓
Backend: Verify password
  ↓
Backend: Verify GitHub ID in ADMIN_GITHUB_IDS
  ↓
Backend: Look up user in database
  ↓
Backend: Create JWT tokens
  ↓
Backend: Set HTTP-only cookies
  ↓
Backend: Return user data and access token
  ↓
Frontend: Store token in localStorage
  ↓
Frontend: Update AuthContext state
  ↓
Frontend: Redirect to /admin/dashboard
```

### Signout Flow

```
User clicks "Sign out"
  ↓
Frontend: AuthContext.logout()
  ↓
Frontend: POST /api/auth/logout
  ↓
Backend: Delete session cookies
  ↓
Frontend: Clear localStorage
  ↓
Frontend: Set user to null
  ↓
Frontend: Redirect to home
```

### Session Restoration Flow

```
Frontend mounts
  ↓
AuthContext useEffect runs
  ↓
Check URL for OAuth tokens
  ↓
If tokens present:
  Parse and store tokens
  Clear URL parameters
  Set user state
Else:
  Call checkAuth()
    ↓
  GET /api/auth/me
    ↓
  If valid user:
    Set user state
  Else:
    Clear auth state
```

## Protected Routes

### Frontend Protection

**Component:** `client/src/components/ProtectedRoute.jsx`

**Logic:**
1. Check if `admin_token` exists in localStorage
2. If not, check if `session_token` exists
3. If neither, redirect to `/login`
4. If token exists, render children

**Usage:**
```jsx
<Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
<Route path="/post/:id/edit" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
```

### Backend Protection

**Dependency:** `require_user()` in `auth.py:109-113`

**Logic:**
1. Extract user from request (cookie or header)
2. If no user, raise HTTPException 401
3. Return user object

**Usage:**
```python
@app.post('/api/posts')
async def createPost(body: CreatePostRequest, request: Request, db: Session = Depends(get_db)):
    user = require_user(request, db)  # Raises 401 if not authenticated
    # ... create post
```

## Ownership Verification

### Post Ownership

**Backend:** `main.py:887-904`
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

**Backend:** `main.py:861-871`
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
- `ADMIN_PASSWORD`: Password for admin login (e.g., `"admin123"`)

**Check:** `user.github_id in ADMIN_GITHUB_IDS`

### Admin Endpoints

All admin endpoints verify:
1. User is authenticated
2. User's GitHub ID is in `ADMIN_GITHUB_IDS`

**Implementation:**
```python
@app.get("/api/admin/dashboard")
def admin_dashboard(request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)
    if not user or not hasattr(user, "github_id") or user.github_id not in ADMIN_GITHUB_IDS:
        return JSONResponse(status_code=403, content={"error": "Admin access required"})
    # ... return dashboard data
```

## Security Considerations

### Token Security

**HTTP-only cookies:**
- Prevent XSS attacks from stealing tokens
- Cannot be accessed via JavaScript
- Sent automatically with requests

**Secure flag:**
- Enabled in production (`APP_ENV == "prod"`)
- Prevents HTTP transmission

**SameSite:**
- `none` in production (cross-origin)
- `lax` in development

### Potential Vulnerabilities

1. **Tokens in URL:** OAuth flow returns tokens in URL query parameters
   - **Mitigation:** Frontend removes tokens from URL immediately
   - **Risk:** Tokens may be logged in browser history or server logs

2. **localStorage:** Tokens stored in localStorage
   - **Risk:** XSS attacks can access localStorage
   - **Mitigation:** HTTP-only cookies as primary storage

3. **Hardcoded credentials:** Default admin password in config
   - **Risk:** Default credentials in production
   - **Mitigation:** Environment variable override

4. **JWT secret:** Default secret in config
   - **Risk:** predictable tokens
   - **Mitigation:** Environment variable override

### Recommendations

1. Use secure, random JWT secret in production
2. Use strong admin password in production
3. Consider implementing CSRF protection
4. Add rate limiting to auth endpoints
5. Implement token rotation for refresh tokens
6. Add audit logging for auth events

## Session Management

### Session Lifecycle

1. **Creation:** On login (GitHub OAuth or admin credentials)
2. **Validation:** On each request (cookie/header check)
3. **Refresh:** On 401 response (frontend) or explicit refresh
4. **Expiration:** After JWT expiry (15 min access, 30 days refresh)
5. **Destruction:** On logout (cookie deletion)

### Session Storage

**Backend:**
- No server-side session storage
- Stateless JWT validation
- Database lookup for user data

**Frontend:**
- `session_token` in localStorage (access token)
- `refresh_token` in localStorage (refresh token)
- `admin_token` in localStorage (admin alternative)
- `user` in localStorage (cached user data)

## Testing Authentication

### Backend Tests

**Location:** `backend-fastapi/tests/`

**Fixtures:**
- `auth_headers`: Valid authentication headers
- `other_auth_headers`: Headers for different user
- `create_test_user`: Factory for test users
- `create_test_post`: Factory for test posts

**Test Cases:**
- `test_auth.py`: Login/logout flows
- `test_auth_me.py`: Token validation
- `test_posts.py`: Ownership verification

### Frontend Tests

**Location:** `client/src/tests/`

**Test Cases:**
- `AuthContext.test.jsx`: OAuth callback parsing, token storage
- `client.test.js`: Token refresh logic