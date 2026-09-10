# Entry Points

All the ways into the Post Panel application — frontend routes, backend process start, and CLI/scripts.

## 1. Frontend Routes (React Router)

Defined in `client/src/App.jsx`. All entry points are browser URLs.

| Route | Path | Component | Auth Required | Purpose |
|-------|------|-----------|---------------|---------|
| Home | `/` | `Home.jsx` | No | Post feed with infinite scroll |
| Post detail | `/post/:id` | `Post.jsx` | No | Single post + comments |
| Create post | `/create` | `CreatePost.jsx` | Yes (ProtectedRoute) | Create new post |
| Edit post | `/post/:id/edit` | `CreatePost.jsx` | Yes + owner | Edit existing post |
| Login | `/login` | `Login.jsx` | No | GitHub OAuth + admin links |
| Admin login | `/admin` | `AdminLogin.jsx` | No | Admin credential login |
| Admin dashboard | `/admin/dashboard` | `AdminDashboard.jsx` | Yes (token) | Admin stats/management |
| Admin edit post | `/admin/post/:id/edit` | `CreatePost.jsx` | ProtectedRoute | Admin editing of any post |

**Route guards:**
- `ProtectedRoute` (`client/src/components/ProtectedRoute.jsx`) wraps `/create`, `/post/:id/edit`, and `/admin/post/:id/edit` — redirects to `/login` if no auth.
- `AdminDashboard` self-checks for `admin_token` in localStorage.

**URL parameter handling:**
- `Post.jsx` uses `useParams().id` → `getPostById(id)`.
- `CreatePost.jsx` uses `useParams().id` to load existing post for edit mode.

## 2. Backend Start

### Development

```bash
cd backend-fastapi
uvicorn main:app --reload --port 7180
```

### Production (Render)

- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Defined in `render.yaml`, `Procfile`, `railway.json`.

**App creation:** `app = FastAPI(...)` at top of `backend-fastapi/main.py`. Fails on missing `DATABASE_URL`.

## 3. External HTTP Entry Points (OAuth)

- `GET /api/auth/github` — Redirects user to GitHub OAuth consent.
- `GET /api/auth/github/callback` — GitHub redirects here with `code` + `state`; completes login.

Configuration required: `GITHUB_CLIENT_ID_POST_PANEL`, `GITHUB_CLIENT_SECRET_POST_PANEL`, `FRONTEND_URL`.

## 4. Database Migrations

- `alembic upgrade head` — Apply schema to `DATABASE_URL`.
- Version files in `backend-fastapi/alembic/versions/`.

## 5. CLI Scripts

| Script | Purpose | When Run |
|--------|---------|----------|
| `python scripts/seed.py` | Seeds 3 users, 52 posts, 5 comments | After first migration (dev) |
| `pytest` | Runs backend test suite | CI + dev |
| `locust -f loadtests/locustfile.py` | Load testing | Manual |
| `python loadtests/quick_load.py` | Quick load test | Manual |

## 6. CI/CD Trigger

- `.github/workflows/ci-cd.yml` — Runs on push/PR to `main` (backend tests, frontend tests/build) and deploys to Render + Vercel on merge.

## 7. Static/Shutdown

No startup events, background tasks, or lifecycle hooks are registered in `main.py` (verification: FastAPI `@app.on_event` / lifespan block absent).