# Post Panel — Setup & Deployment Guide

How to run this repository locally and how to deploy it to production.

---

## 1. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Docker + Docker Compose | any recent | Runs the Postgres 16 container |
| Python | 3.9+ (tested on 3.9.6) | FastAPI backend |
| Node.js + npm | 20+ (tested on 22) | Vite/React client |

Optional: `pyenv` for per-project Python, `pipx` optional. The backend was verified with system Python + user site-packages — a dedicated venv is recommended but not required.

## 2. Repo layout

```
post-panel/
├── client/            # React 19 + Vite 8 + Tailwind v4 (frontend)
├── backend-fastapi/   # FastAPI + SQLAlchemy + Alembic (primary API)
├── backend/           # Legacy Node/Hono API (no longer primary)
├── bruno/             # API test collection (Bruno)
├── docker-compose.yml # Postgres 16 (host port 5434)
├── dev.sh             # iTerm launcher (2x2 panes + tabs)
├── .env.local/.env.prod        # DB container creds (docker-compose)
└── SETUP.md           # this file
```

## 3. Local setup

### 3.1 Create the three env file pairs

Env files are git-ignored (`.gitignore` allows only `.env.example`), so create them from the templates below.

**a) Root — feeds docker-compose** (`.env.local`):

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=post_panel
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/post_panel
```

**b) Backend — feeds FastAPI/Alembic** (`backend-fastapi/.env.local`):

```bash
APP_ENV=local
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/post_panel
```

**c) Client — feeds the Vite dev proxy** (`client/.env.local`):

```bash
VITE_BACKEND_URL=http://127.0.0.1:7180
```

> `APP_ENV` picks the env file: `local` → `.env.local`, `prod` → `.env.prod`.
> The same three files exist as `.env.prod` templates with placeholder values — fill them with real values when deploying.

### 3.2 Start the database

```bash
docker-compose up -d        # postgres:16 on localhost:5434
docker ps                   # post-panel-db should be Up
```

### 3.3 Install and run the backend

```bash
cd backend-fastapi
pip install -r requirements.txt                  # fastapi, uvicorn, sqlalchemy, alembic, python-dotenv, psycopg2-binary

alembic upgrade head                             # creates the `post` table (via migration b6755bd8cbe8)
python3 scripts/seed.py                          # loads 16 posts from all_posts.py (idempotent — safe to re-run)

python3 -m uvicorn main:app --reload --port 7180 # API on http://localhost:7180
```

Optional venv instead of system pip:

```bash
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

### 3.4 Install and run the client

```bash
cd client
npm install
npm run dev                                      # Vite on http://localhost:5173
```

> If ports 5173–5175 are already used by other projects, Vite auto-increments (e.g. → **5176**). Find the real URL from the terminal output or `lsof -iTCP -sTCP:LISTEN | grep node`.

The Vite dev server proxies `/api/*` to `VITE_BACKEND_URL` (see `vite.config.js`), so the browser code just calls `/api/posts`.

### 3.5 Verify everything

```bash
curl http://localhost:7180/api/posts          # 16 posts, JSON
curl http://localhost:7180/api/posts/fall-ball
curl -o /dev/null -w "%{http_code}\n" http://localhost:7180/api/posts/nope   # 404

# via the client proxy:
curl http://localhost:5176/api/posts          # use your actual Vite port
```

DB check:

```bash
docker exec -it post-panel-db psql -U postgres -d post_panel -c "SELECT count(*) FROM post;"   # 16
```

Client quality gates: `npm run lint` (oxlint), `npm test` (node --test, 5 tests).

### 3.6 Sanity checks

- **DB down fallback:** stop Docker (`docker-compose stop`) — the API still starts (no import-time connect test) and serves `all_posts.py` instead; everything keeps working.
- **Seeding is idempotent:** re-running `python3 scripts/seed.py` adds nothing (existence check on `id` first).
- **Wipe everything:** `docker-compose down -v`, then redo steps 3.2–3.3.

---

## 4. Deployment

Two separate pieces, deployed independently:

- **Backend** (FastAPI + Postgres) — e.g. Render / Railway / Fly.io
- **Frontend** (static Vite build) — e.g. Vercel / Netlify

> At build time the client inlines `VITE_BACKEND_URL`, and at runtime it calls that URL directly (cross-origin). Two things make this work in prod: (1) `VITE_BACKEND_URL` must be set when **building** the frontend, and (2) the backend must allow that origin via CORS.

### 4.1 Backend env (production)

| Variable | Value |
|---|---|
| `APP_ENV` | `prod` |
| `DATABASE_URL` | managed Postgres URL (e.g. Render Postgres / Neon / Supabase) |
| `CORS_ORIGINS` | comma-separated frontend origins, e.g. `https://my-post-panel.vercel.app` (or `*` to allow all) |

Set these as platform env vars (don't commit real credentials — `.env*` is git-ignored; on Render/Railway add them in the dashboard or a `.env.prod` file on the server).

### 4.2 Backend on Render (example)

1. Create a **Web Service**: build command `pip install -r requirements.txt`, start command `uvicorn main:app --host 0.0.0.0 --port $PORT` (Render injects `$PORT`).
2. Create a **Postgres** database and copy its internal URL into `DATABASE_URL`.
3. **Pre-deploy command** (runs once, before the server starts): `alembic upgrade head && python3 scripts/seed.py`.
4. Add `CORS_ORIGINS` with your frontend domain.
5. Deploy — verify `https://<your-app>.onrender.com/api/posts` returns 16 posts.

Railway/Fly.io are equivalent: same env vars, same start command (`--port $PORT` or `--port 8000`), migrations run one time during setup.

### 4.3 Frontend on Vercel (example)

1. Import the repo, root directory: `client/`.
2. Build command: `npm run build`, output directory: `dist` (check the framework present preset).
3. Env var `VITE_BACKEND_URL=https://<your-backend>.onrender.com` — must be set **at build time** (Vite inlines it). It's the backend **origin only** (no `/api` suffix — the client appends `/api` itself).
4. Optionally set `CORS_ORIGINS=https://<your-frontend>.vercel.app` on the backend.
5. Deploy — the Home and Post pages now fetch live data from the API.

Netlify is the same with `npm run build` + `publish dist`.

### 4.4 Alternative: single-domain (no CORS)

If you prefer serving both on one domain, put the backend behind a reverse proxy that rewrites `/api/*` → backend (e.g. nginx `location /api { proxy_pass http://backend:7180; }`, or Vercel rewrites). Then:
- `VITE_BACKEND_URL` stays unset (the client calls same-origin `/api`)
- No CORS needed
- Note: `client/.env.prod` currently contains the cross-origin placeholder — with this approach, leave it empty.

### 4.5 Production checklist

- [ ] Managed Postgres reachable from the backend, and `alembic upgrade head` ran (table + `alembic_version` exist)
- [ ] `python3 scripts/seed.py` executed (16 rows) — or the prod DB is fed from the live GitHub sync instead
- [ ] `VITE_BACKEND_URL` set at frontend build time
- [ ] `CORS_ORIGINS` includes the frontend origin
- [ ] `curl https://api…/api/posts` and `curl https://front…/api/posts` both work from a browser

---

## 5. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `ImportError: cannot import name 'sessionmaker' from 'sqlalchemy'` | SQLAlchemy 2.x moved ORM names to `sqlalchemy.orm`. Use `from sqlalchemy.orm import sessionmaker` (all repo code already does). |
| `psycopg2.errors.UndefinedTable: relation "post" does not exist` | Migrations not applied. Run `alembic upgrade head` **before** seeding/starting. |
| `alembic upgrade head` says "No migrations to apply" but table is missing | Stale `alembic_version` row. Run `alembic stamp base`, then `alembic upgrade head` again. |
| Client port seems wrong (other app answers on 5173) | Vite auto-incremented. Check the terminal URL or `lsof -iTCP -sTCP:LISTEN | grep node`. |
| `/api/posts` returns 404 in prod but works locally | Missing/wrong `VITE_BACKEND_URL` at build time, or CORS blocked — check backend `CORS_ORIGINS` and rebuild the frontend. |
| Missing post returns `{"error": …}` | Should be HTTP 404 with that body (JSONResponse). Verify with `-w "%{http_code}"`. |