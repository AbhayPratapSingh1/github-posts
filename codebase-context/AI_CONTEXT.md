# AI Context — Fastest Path to Understanding Post Panel

This document is optimized for AI coding agents. It provides the fastest possible way to understand the repository without exhaustively exploring it.

## Project Summary

Post Panel is a project showcase web app where users sign in with GitHub, create/edit/delete "post" entries for their projects, comment on posts, and use AI (Gemini) to auto-generate post content from a GitHub repository. It uses a React SPA frontend and a FastAPI Python backend with PostgreSQL.

## Tech Stack

**Frontend:**
- React 19 + Vite 8 (dev/build)
- Tailwind CSS v4 (styling)
- React Router v7 (routing)
- react-markdown + remark-gfm (MD rendering)
- react-quill-new (rich text editor)
- Vitest + Testing Library (tests)

**Backend:**
- FastAPI (Python web framework)
- SQLAlchemy 2.0 (ORM)
- Alembic (migrations)
- PyJWT (authentication)
- httpx (HTTP client for GitHub/Gemini)

**Database:**
- PostgreSQL (primary)
- SQLite (test environment)

**Auth:**
- GitHub OAuth (users)
- JWT tokens (session)
- Environment-based admin allowlist

**Infrastructure:**
- Render (backend + DB)
- Vercel (frontend)
- GitHub Actions (CI/CD)
- Docker Compose (local Postgres)

**Testing:**
- Vitest (frontend unit tests)
- Pytest (backend tests)

## Architecture

```
                    ┌─────────────────────┐
                    │  React SPA (client/) │
                    │  Vite + Tailwind    │
                    └──────────┬──────────┘
                               │ HTTP + JWT
                    ┌──────────▼──────────┐
                    │  FastAPI (main.py)  │
                    │  Routes + OAuth + AI│
                    └──────────┬──────────┘
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  postHandler   │    │  auth.py       │    │  GitHub API    │
│  (post CRUD)   │    │  (JWT, tokens) │    │  Gemini API    │
└────────┬───────┘    └────────────────┘    └────────────────┘
         ▼
┌────────────────┐
│  PostgreSQL     │
│  (3 tables)     │
└────────────────┘
```

## Important Files

### Backend (backend-fastapi/)

| File | Why It Matters |
|------|----------------|
| `main.py` | **THE backend entry point.** All routes, OAuth, AI generation (~950 lines). Read fully before backend changes. |
| `auth.py` | JWT creation/validation, user resolution, admin logic. |
| `config.py` | Environment variable loading with defaults. |
| `database.py` | DB engine/session setup, graceful degradation. |
| `app/models.py` | SQLAlchemy models: Post, User, Comment. |
| `handler/postHandler.py` | Post serialization + CRUD business logic. |
| `all_posts.py` | Static fallback data when DB is down. |
| `alembic/versions/` | Database migrations. |
| `tests/conftest.py` | Test fixtures (SQLite DB, auth headers, factories). |
| `scripts/seed.py` | Idempotent demo data seeder. |
| `render.yaml` | Render deployment blueprint. |

### Frontend (client/)

| File | Why It Matters |
|------|----------------|
| `src/main.jsx` | App entry point, provider wiring. |
| `src/App.jsx` | All routes. |
| `src/api/client.js` | **The HTTP client.** Handles auth, 401 refresh, retry. Read before touching API calls. |
| `src/api/posts.js` | All API endpoint wrappers. |
| `src/context/AuthContext.jsx` | Auth state, OAuth token parsing, login/logout. |
| `src/context/ToastContext.jsx` | Toast notifications. |
| `src/pages/Home.jsx` | Post list + infinite scroll. |
| `src/pages/Post.jsx` | Single post view (has a latent bug — see risks). |
| `src/pages/CreatePost.jsx` | Create/edit form, GitHub + AI integration. |
| `src/pages/AdminDashboard.jsx` | Admin stats + content management. |
| `src/components/ProtectedRoute.jsx` | Route guard component. |

## Important Functions

### Backend
| Function | File | Purpose |
|----------|------|---------|
| `create_access_token()` | `auth.py:12` | JWT access token generation |
| `create_refresh_token()` | `auth.py:22` | JWT refresh token generation |
| `get_user_from_request()` | `auth.py:65` | Auth from cookie/header |
| `refresh_access_token()` | `auth.py:93` | Refresh token validation |
| `require_user()` | `auth.py:109` | Protected route dependency |
| `Post_handler.*()` | `postHandler.py` | Post CRUD + serialization |
| `slugify()` | `main.py:67` | Title → post ID |
| `parse_github_url()` | `main.py:74` | Extract owner/repo from URL |
| `fetch_github_repo()` | `main.py:84` | GitHub repo metadata (cached 1hr) |
| `fetch_readme()` | `main.py:692` | README content for AI |
| `generate_with_gemini()` | `main.py:706` | AI content generation |
| Route handlers | `main.py` | All API endpoints |

### Frontend
| Function | File | Purpose |
|----------|------|---------|
| `request()` | `api/client.js:33` | HTTP client with token refresh |
| `refreshToken()` | `api/client.js:12` | 401 recovery |
| `getPosts()` | `api/posts.js:14` | Post list fetch |
| `createPost()` | `api/posts.js:21` | Post creation |
| `updatePost()` | `api/posts.js:28` | Post update |
| `deletePost()` | `api/posts.js:42` | Post deletion |
| `getGithubInfo()` | `api/posts.js:60` | GitHub repo fetch |
| `generatePostContent()` | `api/posts.js:71` | AI generation |
| `checkAuth()` | `AuthContext.jsx:30` | Auth validation |
| `login()` | `AuthContext.jsx:91` | Admin login |
| `logout()` | `AuthContext.jsx:112` | Logout |

## Important Data Models

### User (`app/models.py:29`)
`id, github_id (unique), username, name, email, avatar_url, bio, created_at, github_token`

### Post (`app/models.py:7`)
`id (slug PK), user_id, title, type, shortDescription, hosted (JSON), availableAt (JSON), description, github, dateOfCreation (int), language, lastPushAt, defaultBranch, stats (JSON), githubOwner, created_at, updated_at`

### Comment (`app/models.py:43`)
`id, post_id, user_id, content, created_at, updated_at`

**Key relationship details:**
- **No DB-level foreign keys** — relationships are manual (join in queries)
- Comment joins User via `Comment.user_id == User.id`
- Post ownership: `post.user_id == user.id`

## Important APIs

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/posts?offset&limit` | None | List posts (12/page, max 50) |
| GET | `/api/posts/{id}` | None | Post + 5 comments |
| POST | `/api/posts` | User | Create post (slug ID, GitHub enrich) |
| PUT | `/api/posts/{id}` | Owner | Update post |
| DELETE | `/api/posts/{id}` | Owner | Delete post |
| GET | `/api/posts/{id}/comments` | None | Comments (6 max) |
| POST | `/api/posts/{id}/comments` | User | Add comment |
| GET | `/api/auth/me` | Optional | Current user |
| POST | `/api/auth/login` | None | Admin/credential login |
| POST | `/api/auth/logout` | None | Clear session |
| POST | `/api/auth/refresh` | Refresh | New access token |
| GET | `/api/auth/github` | None | OAuth start |
| GET | `/api/auth/github/callback` | None | OAuth callback |
| GET | `/api/admin/check` | Admin | Verify admin |
| POST | `/api/admin/login` | None | Admin login |
| GET | `/api/admin/dashboard` | Admin | Statistics |
| PUT | `/api/admin/posts/{id}` | Admin | Update any post |
| DELETE | `/api/admin/posts/{id}` | Admin | Delete any post |
| DELETE | `/api/admin/posts` | Admin | Delete all posts |
| DELETE | `/api/admin/users` | Admin | Delete all users |
| GET | `/api/github/info?url=` | None | Repo metadata (cached) |
| POST | `/api/github/generate?url=` | None | AI post generation |

## Important Flows

See [FLOWS.md](./FLOWS.md) for full detail.

- **Signin** → GitHub OAuth: Login page → `/auth/github` → GitHub → callback → user upsert → tokens → auth state → redirect
- **Single Post** → `/post/:id`: Post page → `getPostById()` → GET `/api/posts/{id}` → Post + comments render
- **Create Post** → `/create`: Protected → Form → optional GitHub info → optional AI → POST `/api/posts` → redirect
- **Comments** → Comments component → `getPostCommentById()`/POST comment → render list
- **Admin Login** → `/admin` → GitHub + password → `admin_token` → dashboard

## Environment Variables

| Variable | Required in Prod | Secret |
|----------|------------------|--------|
| `APP_ENV` | Yes (`prod`) | No |
| `DATABASE_URL` | Yes | Yes |
| `JWT_SECRET` | Yes (change default!) | Yes |
| `FRONTEND_URL` | Yes | No |
| `BACKEND_URL` | Yes | No |
| `CORS_ORIGINS` | Yes | No |
| `GITHUB_CLIENT_ID_POST_PANEL` | Yes | Yes |
| `GITHUB_CLIENT_SECRET_POST_PANEL` | Yes | Yes |
| `GEMINI_API_KEY_POST_PANEL` | Yes (for AI) | Yes |
| `ADMIN_GITHUB_IDS` | Yes | No |
| `ADMIN_PASSWORD` | Yes (change default!) | Yes |
| `PORT` | No | No |
| `JWT_ACCESS_EXPIRY_MINUTES` | No | No |
| `JWT_REFRESH_EXPIRY_DAYS` | No | No |
| `VITE_BACKEND_URL` (frontend) | Yes | No |
| `VITE_PORT` (frontend) | No | No |
| `GITHUB_TOKEN` | Optional | Yes |

**Warning:** `GEMINI_API_KEY_POST_PANEL`, `GITHUB_CLIENT_ID_POST_PANEL`, `GITHUB_CLIENT_SECRET_POST_PANEL` are read through `config.py` (which loads `.env.{APP_ENV}`, e.g. `.env.prod`); in production deployments these must be set as platform environment variables.

See [ENVIRONMENT.md](./ENVIRONMENT.md) for full detail.

## Common Change Scenarios

### Add a new API endpoint
1. Read `backend-fastapi/main.py` route patterns
2. Add route using `@app.<method>("/api/...")`
3. Use `Depends(get_db)` for DB session
4. Use `require_user()` if auth required
5. Add Pydantic model in `main.py` if request body needed
6. Add wrapper function in `client/src/api/posts.js`
7. Test with a backend test file

### Modify authentication
1. `backend-fastapi/auth.py` — token logic
2. `backend-fastapi/main.py` — auth routes
3. `client/src/context/AuthContext.jsx` — frontend state
4. `client/src/api/client.js` — token handling
5. Follow patterns in [AUTH.md](./AUTH.md)

### Change post rendering
1. `client/src/pages/Post.jsx` — post display
2. `client/src/pages/Home.jsx` — post cards
3. `backend-fastapi/handler/postHandler.py` — serialization
4. `backend-fastapi/main.py` — comments inclusion

### Modify comments
1. `backend-fastapi/main.py` — comment routes (lines 480-562)
2. `client/src/components/Comments.jsx` — UI
3. `client/src/api/posts.js` — API wrappers

### Add a database field
1. `backend-fastapi/app/models.py` — add Column
2. `backend-fastapi/alembic/versions/` — create migration
3. `backend-fastapi/handler/postHandler.py` — update serialization
4. `backend-fastapi/main.py` — update routes if needed
5. `client/src/config/posts.js` — update types if needed
6. Frontend components — display/use field
7. Update tests

### Add a new page
1. Create component in `client/src/pages/`
2. Add route in `client/src/App.jsx`
3. Add API wrapper in `client/src/api/posts.js` if needed
4. Add tests in `client/src/tests/`

### Change frontend state
1. `client/src/context/AuthContext.jsx` — global auth state
2. `client/src/context/ToastContext.jsx` — notifications
3. Component `useState` for local state
4. No external state libraries — use the existing patterns

### Add an integration
1. `backend-fastapi/main.py` — add API logic (or new module)
2. `backend-fastapi/config.py` — add environment variable
3. Update [ENVIRONMENT.md] for documentation
4. Handle failures gracefully (follow existing patterns)

### Modify notifications
1. `client/src/context/ToastContext.jsx` — toast system
2. `useToast()` hook — add notifications
3. No backend notification system exists

### Change permissions
1. `backend-fastapi/auth.py` — auth logic
2. `backend-fastapi/main.py` — route-level checks
3. `client/src/components/ProtectedRoute.jsx` — frontend guard
4. `ADMIN_GITHUB_IDS` env var — admin access

### Modify background jobs
**Note:** There are NO background jobs, queues, cron jobs, or workers in this application. Everything is synchronous. If you need async processing, you'd be adding a new capability.

### Modify webhooks
**Note:** No webhooks exist. GitHub OAuth callback is the closest thing (see `github_callback()` in `main.py:219`).

### Modify caching
1. `backend-fastapi/main.py:81-82` — `_github_cache` in-memory cache
2. `GITHUB_CACHE_TTL = 3600` — 1 hour TTL
3. No other caching exists (no Redis, no browser cache config)

### Modify file uploads
**Note:** No file upload functionality exists. The closest is fetching external images via URLs.

## Known Risks & Gotchas

### Bugs/Latent Issues
1. **`Post.jsx:42`** references `data` in catch block → ReferenceError on fetch failure
2. **Bruno env** points to legacy port 3000 (should be 7180)
3. **Legacy `backend/`** Hono backend is dead code kept for reference
4. **`get_db()`** yields `None` on DB failure — routes must check for None (most don't robustly)

### Security Concerns
1. Default `JWT_SECRET=dev-secret-change-me` — change in production
2. Default `ADMIN_PASSWORD=admin123` — change in production
3. Tokens passed in OAuth redirect URL (fragile, though cleared client-side)
4. `dangerouslySetInnerHTML` for HTML descriptions (XSS risk)
5. `ADMIN_GITHUB_IDS` default contains a real GitHub ID

### Architecture Notes
- Backend is **single-file** (`main.py`, ~950 lines) — all routes, OAuth, AI
- **No DB foreign keys/relationships** — manual joins
- **No background jobs/queues** — everything synchronous
- **Dual token storage** — cookies + localStorage (slightly redundant)
- **No version pinning** in `requirements.txt`

## Quick Commands

```bash
# Frontend
cd client
npm install
npm run dev        # Port 5180
npm test           # Vitest
npm run lint       # oxlint
npm run build      # Production build

# Backend
cd backend-fastapi
pip install -r requirements.txt
docker-compose up -d   # Postgres (from repo root)
alembic upgrade head
python scripts/seed.py
uvicorn main:app --reload --port 7180
pytest               # Backend tests
```

## Testing Commands

```bash
# Frontend tests
cd client && npm test

# Backend tests
cd backend-fastapi && pytest

# Load tests
cd backend-fastapi
locust -f loadtests/locustfile.py
python loadtests/quick_load.py
```

## "Where Should I Look?" Index

| Task | Start Here | Then Inspect |
|------|-----------|--------------|
| Signin | `pages/Login.jsx` | `AuthContext.jsx` → `main.py:206-315` |
| Single post | `pages/Post.jsx` | `api/posts.js` → `main.py:614-658` |
| Comments | `components/Comments.jsx` | `main.py:480-562` |
| Add field | `app/models.py` | Migration → `postHandler.py` → API → frontend |
| Add endpoint | `main.py` | `auth.py` → `api/posts.js` |
| Add page | `pages/` | `App.jsx` routes |
| Change permissions | `auth.py` | `main.py` route checks + `ADMIN_GITHUB_IDS` |
| Admin features | `main.py:317-601` | `pages/AdminDashboard.jsx` |
| AI generation | `main.py:706-840` | `pages/CreatePost.jsx` |
| GitHub integration | `main.py:84-106, 660-690` | `CreatePost.jsx` |
| Notifications | `context/ToastContext.jsx` | All components using `useToast()` |
| DB migrations | `alembic/versions/` | `app/models.py` |