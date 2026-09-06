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

- **Backend** (FastAPI + Postgres) — Render (free tier)
- **Frontend** (static Vite build) — Vercel (free tier)

### 5.1 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      VERCEL                             │
│  Frontend (React + Vite)                                │
│  https://post-panel.vercel.app                          │
└─────────────────────┬───────────────────────────────────┘
                      │ API calls
                      ▼
┌─────────────────────────────────────────────────────────┐
│                      RENDER                             │
│  Backend (FastAPI + Uvicorn)                            │
│  https://post-panel-api.onrender.com                    │
└─────────────────────┬───────────────────────────────────┘
                      │ Database connection
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    RENDER POSTGRES                      │
│  PostgreSQL (free tier, 90-day expiry)                  │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Backend on Render

1. **Sign up** at render.com (no credit card required)
2. **Create a PostgreSQL database:**
   - New → PostgreSQL
   - Name: `post-panel-db`
   - User: `abhaypratapsingh`
   - Database: `post_panel`
   - Plan: Free
   - Click "Create Database"
   - Copy the **Internal Database URL**

3. **Create a Web Service:**
   - New → Web Service
   - Connect your GitHub repo
   - Name: `post-panel-api`
   - Region: Oregon (US West)
   - Branch: `main`
   - Runtime: Python
   - Root Directory: `backend-fastapi`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `alembic upgrade head && python3 scripts/seed.py && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Plan: Free

4. **Set environment variables:**

| Variable | Value |
|---|---|
| `APP_ENV` | `prod` |
| `DATABASE_URL` | (paste Internal Database URL from step 2) |
| `JWT_SECRET` | (run `openssl rand -hex 32` locally) |
| `CORS_ORIGINS` | `https://post-panel.vercel.app` |
| `GEMINI_API_KEY_POST_PANEL` | from ~/.zshrc |
| `GITHUB_CLIENT_ID_POST_PANEL` | from ~/.zshrc |
| `GITHUB_CLIENT_SECRET_POST_PANEL` | from ~/.zshrc |

5. **Deploy** — Render auto-deploys on push to `main`

**Note:** Free tier spins down after 15 min inactivity. First request after sleep takes 30-60s.

### 5.3 Frontend on Vercel

1. **Import repo** on Vercel, select `client/` as root directory
2. **Set environment variable:**

| Variable | Value |
|---|---|
| `VITE_BACKEND_URL` | `https://post-panel-api.onrender.com` |

3. **Deploy** — Vercel builds and deploys automatically

### 5.4 CI/CD Pipeline (GitHub Actions)

The project includes a CI/CD pipeline that runs on every push to `main`:

**Pipeline stages:**
1. **Lint & Test** — Runs `npm run lint` and `npm test` on the client
2. **Deploy Backend** — Deploys to Render (only on `main` push)
3. **Deploy Frontend** — Deploys to Vercel (only on `main` push)

**Required GitHub Secrets:**

| Secret | How to get |
|---|---|
| `RENDER_SERVICE_ID` | Render dashboard → Settings → General → Service ID |
| `RENDER_API_KEY` | Render dashboard → Account Settings → API Keys |
| `VERCEL_TOKEN` | Vercel dashboard → Settings → Tokens |
| `BACKEND_URL` | Your Render backend URL |

**To set up:**
1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Add the four secrets above
3. Push to `main` — pipeline runs automatically

### 5.5 Production checklist

- [ ] Render PostgreSQL database created
- [ ] Render Web Service created with root directory `backend-fastapi`
- [ ] Environment variables set in Render
- [ ] Vercel project created with `VITE_BACKEND_URL` set
- [ ] GitHub Actions secrets configured
- [ ] `CORS_ORIGINS` includes Vercel frontend URL
- [ ] `JWT_SECRET` set to strong random string
- [ ] GitHub OAuth callback URL updated to production frontend URL

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
