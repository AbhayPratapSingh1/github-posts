# Post Panel — Setup & Deployment Guide

How to run this repository locally and how to deploy it to production.

---

## 1. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Python | 3.9+ (tested on 3.9.6) | FastAPI backend |
| Node.js + npm | 20+ (tested on 22) | Vite/React client |
| PostgreSQL | 14+ | Database |

Optional: `pyenv` for per-project Python, `pipx` optional. A dedicated venv is recommended but not required.

## 2. Repo layout

```
post-panel/
├── client/            # React 19 + Vite 8 + Tailwind v4 (frontend)
├── backend-fastapi/   # FastAPI + SQLAlchemy + Alembic (primary API)
├── backend/           # Legacy Node/Hono API (no longer primary)
├── bruno/             # API test collection (Bruno)
├── dev.sh             # iTerm launcher (2x2 panes + tabs)
├── SETUP.md           # this file
└── .env.local         # DB container creds (if using Docker)
```

## 3. Local setup

### 3.1 Start PostgreSQL

**Option A: Local PostgreSQL (recommended)**

Ensure PostgreSQL is running on `localhost:5432`. Create the database and user:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create user and database
CREATE USER abhaypratapsingh WITH SUPERUSER;
CREATE DATABASE post_panel OWNER abhaypratapsingh;
\q
```

**Option B: Docker PostgreSQL**

```bash
docker run -d \
  --name post-panel-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=post_panel \
  -p 5432:5432 \
  postgres:16
```

### 3.2 Create environment files

**a) Backend — `backend-fastapi/.env.local`:**

```bash
APP_ENV=local
DATABASE_URL=postgresql://abhaypratapsingh@localhost:5432/post_panel
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:5180

# Optional: Token expiry settings (defaults shown)
JWT_ACCESS_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=30
```

> **Note:** API keys (Gemini, GitHub) are stored in `~/.zshrc` and loaded automatically when running the server in your terminal. They are NOT in the .env files for security reasons.

**b) Client — `client/.env.local`:**

```bash
VITE_PORT=5180
```

> Note: `VITE_BACKEND_URL` is NOT set in local development. The Vite dev server proxies `/api` requests to the backend automatically.

### 3.3 Install and run the backend

```bash
cd backend-fastapi

# Create virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed the database (optional - loads sample posts)
python3 scripts/seed.py

# Start the server (ensure ~/.zshrc is sourced for API keys)
python3 -m uvicorn main:app --reload --port 7180
```

> **Important:** The server must be started in a terminal where `~/.zshrc` is sourced (or run `source ~/.zshrc` first) to load the Gemini and GitHub API keys.

The API will be available at `http://localhost:7180`.

### 3.4 Install and run the client

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

The client will be available at `http://localhost:5180`.

### 3.5 Verify everything

```bash
# Test API endpoints
curl http://localhost:7180/api/posts
curl http://localhost:7180/api/posts/flappy-bird

# Test via client proxy
curl http://localhost:5180/api/posts

# Test authentication
curl -X POST http://localhost:7180/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userid":"admin","password":"12345"}' \
  -c cookies.txt

# Check database
psql -U abhaypratapsingh -d post_panel -c "SELECT count(*) FROM post;"
```

## 4. Features

### 4.1 Authentication

- JWT-based authentication withhttponly cookies
- Access token: 15 minutes expiry
- Refresh token: 30 days expiry
- Auto-refresh on 401 responses

**Default credentials:**
- User ID: `admin`
- Password: `12345`

### 4.2 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/posts` | Get all posts |
| GET | `/api/posts/{id}` | Get post by ID |
| POST | `/api/posts` | Create new post (auth required) |
| PUT | `/api/posts/{id}` | Update post (auth required) |
| DELETE | `/api/posts/{id}` | Delete post (auth required) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/github/info` | Get GitHub repo info |
| POST | `/api/github/generate` | Generate post content with AI |

### 4.3 AI Content Generation

The app can generate post content from GitHub repositories using Google Gemini:

1. Enter a GitHub repository URL
2. Click "Generate with AI"
3. The app fetches README and repo metadata
4. Generates title, description, and metadata
5. Description is converted from Markdown to HTML for the rich text editor

**Setup:** Set `GEMINI_API_KEY_POST_PANEL` in your environment variables.

## 5. Deployment

Two separate pieces, deployed independently:

- **Backend** (FastAPI + Postgres) — e.g. Render / Railway / Fly.io
- **Frontend** (static Vite build) — e.g. Vercel / Netlify

### 5.1 Backend env (production)

| Variable | Value |
|---|---|
| `APP_ENV` | `prod` |
| `DATABASE_URL` | managed Postgres URL |
| `JWT_SECRET` | strong random string |
| `CORS_ORIGINS` | comma-separated frontend origins |
| `GEMINI_API_KEY_POST_PANEL` | your Gemini API key (from ~/.zshrc) |
| `GITHUB_CLIENT_ID_POST_PANEL` | GitHub OAuth client ID (from ~/.zshrc) |
| `GITHUB_CLIENT_SECRET_POST_PANEL` | GitHub OAuth client secret (from ~/.zshrc) |

### 5.2 Backend on Render (example)

1. Create a **Web Service**: build command `pip install -r requirements.txt`, start command `uvicorn main:app --host 0.0.0.0 --port $PORT`.
2. Create a **Postgres** database and copy its internal URL into `DATABASE_URL`.
3. **Pre-deploy command**: `alembic upgrade head && python3 scripts/seed.py`.
4. Add `CORS_ORIGINS` with your frontend domain.
5. Deploy — verify `https://<your-app>.onrender.com/api/posts` returns posts.

### 5.3 Frontend on Vercel (example)

1. Import the repo, root directory: `client/`.
2. Build command: `npm run build`, output directory: `dist`.
3. Env var `VITE_BACKEND_URL=https://<your-backend>.onrender.com` — must be set **at build time**.
4. Deploy — the Home and Post pages now fetch live data from the API.

### 5.4 Production checklist

- [ ] Managed Postgres reachable from the backend
- [ ] `alembic upgrade head` ran (table exists)
- [ ] `python3 scripts/seed.py` executed (or data synced from GitHub)
- [ ] `VITE_BACKEND_URL` set at frontend build time
- [ ] `CORS_ORIGINS` includes the frontend origin
- [ ] `JWT_SECRET` set to a strong random string
- [ ] `GEMINI_API_KEY_POST_PANEL` set (if using AI generation)

## 6. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `psycopg2.errors.UndefinedTable: relation "post" does not exist` | Migrations not applied. Run `alembic upgrade head` before seeding/starting. |
| `alembic upgrade head` says "No migrations to apply" but table is missing | Stale `alembic_version` row. Run `alembic stamp base`, then `alembic upgrade head` again. |
| Client port seems wrong (other app answers on 5173) | Vite auto-incremented. Check the terminal URL or `lsof -iTCP -sTCP:LISTEN | grep node`. |
| `/api/posts` returns 404 in prod but works locally | Missing/wrong `VITE_BACKEND_URL` at build time, or CORS blocked. |
| Auth errors after deploying | Check `JWT_SECRET` is set and consistent. Cookies require HTTPS in production. |
| AI generation fails | Check `GEMINI_API_KEY_POST_PANEL` is set and valid. |

## 7. Development

### Running tests

```bash
cd client
npm test
```

### Linting

```bash
cd client
npm run lint
```

### Database resets

```bash
# Reset database completely
docker-compose down -v  # if using Docker
alembic downgrade base
alembic upgrade head
python3 scripts/seed.py
```

## 8. Architecture

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, React Router v7
- **Backend**: FastAPI, SQLAlchemy, Alembic, PyJWT
- **Database**: PostgreSQL 16
- **Auth**: JWT withhttponly cookies (access + refresh tokens)
- **AI**: Google Gemini 2.5 Flash for content generation

---

For questions or issues, please open an issue on the repository.
