# Error Handling

This document explains how errors are handled throughout the Post Panel application.

## Overview

Post Panel uses a combination of approaches for error handling:
- **HTTP status codes** returned by the backend
- **Exception handling** with try/catch blocks
- **Graceful fallbacks** when database connection fails
- **User-facing notifications** via toast messages
- **HTTP-only error responses** in JSON format

## Backend Error Handling

### Error Types

| Error Type | Status Code | Format | Origin |
|------------|-------------|--------|--------|
| Validation error | 400 | `{"error": "..."}` | Pydantic |
| Authentication error | 401 | `{"error": "..."}` | require_user |
| Authorization error | 403 | `{"error": "..."}` | Ownership checks |
| Not found | 404 | `{"error": "..."}` | Missing resources |
| Conflict | 409 | `{"error": "..."}` | Duplicate post |
| Server error | 500 | `{"error": "..."}` | External APIs |

### Error Response Format

All error responses follow a consistent format:
```json
{
  "error": "Descriptive error message"
}
```

### Authentication Errors

**Source:** `auth.py:109-113`
```python
def require_user(request, db):
    user = get_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
```

**Handlers:**
- `get_user_from_request()` returns None for missing/invalid tokens
- `decode_token()` returns None for invalid tokens
- Routes check user existence and return 401/403

### Authorization Errors

**Ownership:**
```python
if post.user_id != user.id:
    return JSONResponse(status_code=403, content={"error": "Not authorized"})
```

**Admin:**
```python
if not user or not hasattr(user, "github_id") or user.github_id not in ADMIN_GITHUB_IDS:
    return JSONResponse(status_code=403, content={"error": "Admin access required"})
```

### Validation Errors

**Pydantic validation:**
- `CreatePostRequest`: Validates post fields
- `LoginRequest`: Validates login credentials
- `AdminLoginRequest`: Validates admin credentials

**Manual validation:**
```python
# Comment content validation
if not content:
    return JSONResponse(status_code=400, content={"error": "Content required"})

# GitHub URL validation
if not owner or not repo:
    return JSONResponse(status_code=400, content={"error": "Invalid GitHub URL"})
```

### Database Errors

**Connection errors:**
```python
# database.py
def get_db():
    try:
        db = SessionLocal()
        yield db
    except OperationalError:
        yield None  # Graceful degradation
    finally:
        if db:
            db.close()
```

**Fallback pattern:**
```python
# main.py getPosts()
@app.get('/api/posts')
def getPosts(request: Request, db: Session = Depends(get_db)):
    try:
        return postHandler.get_all_posts(db, offset=offset, limit=limit)
    except Exception:
        return posts  # Static fallback data
```

**Note:** When `db` is None (connection failed), routes must check for None:
```python
if db is not None:
    # Run query
else:
    # Use fallback
```

### External API Errors

```python
# GitHub API failure
if not data:
    return JSONResponse(
        status_code=404,
        content={"error": "Repository not found or rate-limited"}
    )

# Gemini API failure
except Exception as e:
    return JSONResponse(
        status_code=500,
        content={"error": f"Failed to generate content: {str(e)}"}
    )
```

## Frontend Error Handling

### HTTP Client Error Handling

**Source:** `client/src/api/client.js`

```javascript
export const request = async (path, options = {}) => {
  try {
    // ... make request
    
    // 401 handling with token refresh
    if (res.status === 401 && !path.includes("/auth/")) {
      // Refresh token
      await refreshPromise
      // Retry request
    }
    
    if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`)
    return res.json()
  } catch (e) {
    throw e
  }
}
```

**Error types handled:**
- 401: Token refresh + retry
- Non-OK responses: Throws error
- Network failures: Throws error

### Component Error Handling

**Common pattern:**
```javascript
const handleSubmit = async () => {
  setLoading(true)
  try {
    await createPost(data)
    addToast("Post created", "success")
    navigate(`/post/${postId}`)
  } catch (e) {
    addToast(e.message, "error")
  } finally {
    setLoading(false)
  }
}
```

### Toast Notification System

**Source:** `client/src/context/ToastContext.jsx`

**Usage:**
```javascript
addToast(message, type, duration)
```

**Types:**
- `success`: Green styling
- `error`: Red styling
- `info`: Blue styling

**Features:**
- Auto-dismiss after duration
- Stacked display
- Multiple simultaneous messages

### Loading/Error States

**Common pattern:**
```javascript
// Loading state
{loading ? <LoadingSkeleton /> : <PostContent />}

// Error display
{error && <div className="error-message">{error}</div>}
```

## Error Lifecycle

### Backend Error Lifecycle

```
Error Origin (database, validation, auth, external API)
  ↓
Caught where? (route handler, auth check, validation)
  ↓
Transformed? (JSONResponse with error message)
  ↓
Logged? (console/print statements in admin routes)
  ↓
Returned? (HTTP response with status code)
  ↓
Rendered? (JSON response to client)
```

### Frontend Error Lifecycle

```
Error Origin (API call, form validation, rendering)
  ↓
Caught where? (component try/catch)
  ↓
Transformed? (error message extracted from response)
  ↓
Logged? (not typically logged)
  ↓
Returned? (thrown to caller)
  ↓
Rendered? (toast notification, error message in UI)
```

## Specific Error Scenarios

### Scenario 1: Authentication Failure

```
User submits invalid credentials
  ↓
POST /api/admin/login
  ↓
verify_credentials() returns None
  ↓
Returns 401 JSONResponse
  ↓
Frontend: res.ok is false
  ↓
Frontend: addToast("Invalid credentials", "error")
  ↓
Toast displayed to user
```

### Scenario 2: Authorization Failure

```
User tries to edit someone else's post
  ↓
PUT /api/posts/{id}
  ↓
require_user() validates auth
  ↓
postHandler.get_post_raw() finds post
  ↓
post.user_id != user.id
  ↓
Returns 403 JSONResponse
  ↓
Frontend: addToast("Not authorized to update this post", "error")
```

### Scenario 3: Token Expiry

```
Request with expired token
  ↓
Backend: decode_token() returns None
  ↓
Backend: get_user_from_request() returns None
  ↓
Backend: require_user() raises 401
  ↓
Frontend: request() catches 401
  ↓
Frontend: call refreshToken()
  ↓
Frontend: retry original request with new token
  ↓
Frontend: success or error handled normally
```

### Scenario 4: Database Connection Failure

```
Database is down
  ↓
get_db() yields None
  ↓
getPosts() tries postHandler.get_all_posts(None, ...)
  ↓
Exception caught
  ↓
Returns static fallback posts
  ↓
Frontend receives data normally
  ↓
No user-visible error
```

### Scenario 5: External API Failure

```
GitHub API is down or rate-limited
  ↓
fetch_github_repo() returns None
  ↓
getGithubInfo() returns 404
  ↓
Frontend: addToast("Repository not found or rate-limited", "error")
```

## Error Handling by Component

### CreatePost Page
- Form validation errors shown inline
- API errors via toast
- GitHub info fetch errors via toast
- AI generation errors via toast

### Post Page
- Post not found shows error UI
- Comment submission errors via toast
- Delete confirmation errors via toast

### AdminDashboard
- API errors via toast
- Delete confirmation requires type-to-confirm
- Modal errors handled gracefully

### Home Page
- Load errors fall back to static posts
- Infinite scroll errors stop loading (no retry)

## Error Handling Gaps

### Observed Issues

1. **Post page bug:** `client/src/pages/Post.jsx:42` references `data` in a catch block where it may be undefined, potentially causing a ReferenceError
2. **Limited logging:** Backend only uses `print()` for admin route debugging
3. **Generic error messages:** Errors from GEMINI include raw exception strings
4. **No error boundaries:** No React error boundaries for component crashes
5. **No request cancellation:** No AbortController usage for interrupted requests
6. **Fallback ambiguity:** When DB fails and static data is returned, there's no indication to the user or developer

### Recommendations

1. Implement centralized error logging (Sentry, etc.)
2. Add error boundaries at page level
3. Standardize error response format with error codes
4. Add request timeouts and cancellation
5. Improve database fallback to include `is_fallback` flag
6. Add structured logging instead of print statements