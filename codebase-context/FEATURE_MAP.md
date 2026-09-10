# Feature-to-File Map

This document maps every major feature/domain to the files that implement it.

## Feature Map Overview

| Feature | Frontend | API | Business Logic | Database | Tests |
|---------|----------|-----|----------------|----------|-------|
| Posts | `pages/Home.jsx`, `pages/Post.jsx` | `api/posts.js` | `handler/postHandler.py` | `app/models.py:7` | `test_posts.py` |
| Create/Edit | `pages/CreatePost.jsx` | `api/posts.js` | `main.py:842-948` | `app/models.py:7` | `test_posts.py` |
| Comments | `components/Comments.jsx` | `api/posts.js` | `main.py:480-562` | `app/models.py:43` | (none) |
| Auth (GitHub) | `pages/Login.jsx`, `context/AuthContext.jsx` | `api/client.js` | `auth.py`, `main.py:206-315` | `app/models.py:29` | `test_auth_me.py` |
| Admin | `pages/AdminLogin.jsx`, `pages/AdminDashboard.jsx` | `api/posts.js` | `main.py:317-601` | `app/models.py` | (none) |
| GitHub Integration | `pages/CreatePost.jsx` | `api/posts.js:60` | `main.py:660-704` | — | `test_github.py` |
| AI Generation | `pages/CreatePost.jsx` | `api/posts.js:71` | `main.py:706-840` | — | (none) |
| Authentication | `context/AuthContext.jsx` | `api/client.js` | `auth.py` | `app/models.py:29` | `test_auth*.py` |
| Notifications | `context/ToastContext.jsx` | — | — | — | `ToastContext.test.jsx` |
| Dashboard Stats | `pages/AdminDashboard.jsx` | `api/posts.js` | `main.py:384-445` | `app/models.py` | (none) |

---

## Post Management (Detail)

**Feature:** Posts

**Frontend:**
- `client/src/pages/Home.jsx` — Post feed with infinite scroll
- `client/src/pages/Post.jsx` — Single post view with comments
- `client/src/api/posts.js` — Post API wrapper functions

**API:**
- GET `/api/posts` — List with pagination
- GET `/api/posts/{id}` — Single post with comments
- POST `/api/posts` — Create
- PUT `/api/posts/{id}` — Update (owner)
- DELETE `/api/posts/{id}` — Delete (owner)

**Business Logic:**
- `backend-fastapi/handler/postHandler.py` — CRUD + serialization

**Database:**
- `backend-fastapi/app/models.py:7` — Post model
- `backend-fastapi/alembic/versions/` — Schema migrations

**Tests:**
- `backend-fastapi/tests/test_posts.py` — CRUD, ownership, pagination
- `client/src/tests/api/posts.test.js` — API wrappers

**Configuration:**
- `client/src/config/posts.js` — POST_TYPE enum, fallback seed
- `client/src/config/text.js` — read-time constant

**External Dependencies:**
- GitHub API (when repo URL provided)

---

## Authentication (Detail)

**Feature:** Authentication

**Frontend:**
- `client/src/pages/Login.jsx` — GitHub OAuth login page
- `client/src/context/AuthContext.jsx` — Auth state and actions
- `client/src/components/ProtectedRoute.jsx` — Route guard
- `client/src/api/client.js` — Token handling, 401 refresh

**API:**
- GET `/api/auth/me` — Current user
- POST `/api/auth/login` — Admin credentials
- POST `/api/auth/logout` — Clear session
- POST `/api/auth/refresh` — Token refresh
- GET `/api/auth/github` — OAuth start
- GET `/api/auth/github/callback` — OAuth return

**Business Logic:**
- `backend-fastapi/auth.py` — JWT, token logic, user resolution

**Database:**
- `backend-fastapi/app/models.py:29` — User model

**Tests:**
- `backend-fastapi/tests/test_auth.py` — Login/logout
- `backend-fastapi/tests/test_auth_me.py` — Token validation
- `client/src/tests/context/AuthContext.test.jsx` — Frontend auth
- `client/src/tests/api/client.test.js` — Token refresh logic

**Configuration:**
- `JWT_SECRET`, `JWT_ACCESS_EXPIRY_MINUTES`, `JWT_REFRESH_EXPIRY_DAYS`
- `GITHUB_CLIENT_ID_POST_PANEL`, `GITHUB_CLIENT_SECRET_POST_PANEL`
- `ADMIN_PASSWORD`, `ADMIN_GITHUB_IDS`

**External Dependencies:**
- GitHub OAuth

---

## Admin Panel (Detail)

**Feature:** Admin

**Frontend:**
- `client/src/pages/AdminLogin.jsx` — Admin login page
- `client/src/pages/AdminDashboard.jsx` — Dashboard with stats

**API:**
- GET `/api/admin/check` — Verify admin
- POST `/api/admin/login` — Admin login
- GET `/api/admin/dashboard` — Dashboard data
- PUT `/api/admin/posts/{id}` — Update any post
- DELETE `/api/admin/posts/{id}` — Delete any post
- DELETE `/api/admin/posts` — Delete all posts
- DELETE `/api/admin/users` — Delete all users

**Business Logic:**
- `backend-fastapi/main.py:317-601` — All admin routes

**Database:**
- `backend-fastapi/app/models.py` — User, Post models

**Tests:**
- None (admin endpoints untested)

**Configuration:**
- `ADMIN_GITHUB_IDS` (admin allowlist)
- `ADMIN_PASSWORD` (login password)

---

## Comments (Detail)

**Feature:** Comments

**Frontend:**
- `client/src/components/Comments.jsx` — Comment UI
- `client/src/pages/Post.jsx` — Comment integration
- `client/src/api/posts.js:19` — API wrapper

**API:**
- GET `/api/posts/{post_id}/comments` — List (max 6)
- POST `/api/posts/{post_id}/comments` — Create (auth required)

**Business Logic:**
- `backend-fastapi/main.py:480-562` — Comment routes + user join

**Database:**
- `backend-fastapi/app/models.py:43` — Comment model

**Tests:**
- None (comment endpoints untested)

---

## GitHub Integration (Detail)

**Feature:** GitHub

**Frontend:**
- `client/src/pages/CreatePost.jsx` — GitHub URL input
- `client/src/api/posts.js:60-69` — `getGithubInfo()`

**API:**
- GET `/api/github/info?url=` — Repo metadata (cached 1hr)

**Business Logic:**
- `backend-fastapi/main.py:74-106` — URL parse + repo fetch
- `backend-fastapi/main.py:660-690` — Info endpoint

**Tests:**
- `backend-fastapi/tests/test_github.py` — Mocked GitHub API tests
- `backend-fastapi/tests/test_utils.py` — Utility tests

**External Dependencies:**
- GitHub REST API
- `GITHUB_TOKEN` — Fallback auth
- User `github_token` — Preferred auth

---

## AI Generation (Detail)

**Feature:** AI

**Frontend:**
- `client/src/pages/CreatePost.jsx` — "Generate with AI" button
- `client/src/api/posts.js:71-82` — `generatePostContent()`

**API:**
- POST `/api/github/generate?url=` — Generate content

**Business Logic:**
- `backend-fastapi/main.py:692-704` — `fetch_readme()`
- `backend-fastapi/main.py:706-802` — `generate_with_gemini()`
- `backend-fastapi/main.py:804-840` — Generation route

**Tests:**
- None (AI endpoint untested)

**External Dependencies:**
- Google Gemini API (gemini-2.5-flash)
- GitHub API (repo data + README)
- `GEMINI_API_KEY_POST_PANEL` — API key

---

## Notifications (Detail)

**Feature:** Notifications

**Frontend:**
- `client/src/context/ToastContext.jsx` — Toast provider
- Used via `useToast()` hook in all components

**Backend:** No backend notification system

**Tests:**
- `client/src/tests/context/ToastContext.test.jsx` — Toast tests

---

## Change Impact Map

### Changing User Model
```
User model change
  ↓
Database migration (alembic)
  ↓
auth.py (user lookup, token payloads)
  ↓
main.py routes (github_callback, admin routes)
  ↓
API responses (user serialization)
  ↓
AuthContext.jsx (frontend user state)
  ↓
ProfileMenu, Post page (author display)
  ↓
Tests (conftest fixtures, test_auth files)
```

### Changing Post Model
```
Post model change
  ↓
Database migration (alembic)
  ↓
postHandler.py (_post_to_dict, CRUD)
  ↓
main.py routes (create/update/delete)
  ↓
API responses (post serialization)
  ↓
config/posts.js (frontend types, fallback seed)
  ↓
Home, Post, CreatePost pages
  ↓
Tests (test_posts.py, frontend api tests)
```

### Changing Auth Logic
```
auth.py change
  ↓
main.py routes (uses require_user, get_user_from_request)
  ↓
API client (client.js — token handling)
  ↓
AuthContext.jsx (frontend auth state)
  ↓
ProtectedRoute (route guards)
  ↓
All authenticated pages
  ↓
Tests (test_auth*.py, client.test.js, AuthContext.test.jsx)
```

### Changing Database Connection
```
database.py change
  ↓
get_db() dependency (all routes)
  ↓
Fallback behavior (all_posts.py)
  ↓
All handlers
  ↓
Error handling patterns
```

### Changing GitHub Integration
```
GITHUB vars change
  ↓
config.py
  ↓
main.py (OAuth + repo fetch)
  ↓
CreatePost page
  ↓
Tests (test_github.py)

POTENTIAL BREAKAGE: All GitHub login, repo enrichment, AI generation
```

### Changing AI Generation
```
main.py generate_with_gemini() change
  ↓
API response format
  ↓
CreatePost.jsx (form population)
  ↓
Gemini prompt engineering
  ↓
Cost/usage considerations
```

## Feature Dependencies

### Posts Feature
```
Posts → User (author)
Posts → GitHub API (enrichment)
Posts → Database
Posts → Auth (write operations)
```

### Comments Feature
```
Comments → Post (parent)
Comments → User (author)
Comments → Auth (write operations)
Comments → Database
```

### Admin Feature
```
Admin → User (admin verification)
Admin → Posts (moderation)
Admin → Users (management)
Admin → Database (aggregations)
Admin → Auth (admin token)
```

### Auth Feature
```
Auth → GitHub OAuth (login)
Auth → User (storage)
Auth → JWT (tokens)
Auth → Database (user lookup)
Auth → All features (gating)
```