# Configuration

This document catalogs all configuration files in the Post Panel application.

## Configuration File Overview

| File | Purpose | Safe to Modify | Generated |
|------|---------|----------------|-----------|
| `backend-fastapi/config.py` | Backend environment config | Yes | No |
| `backend-fastapi/alembic.ini` | Database migration config | Yes (rarely) | No |
| `backend-fastapi/alembic/env.py` | Migration environment | Yes (rarely) | No |
| `backend-fastapi/requirements.txt` | Python dependencies | Yes | No |
| `client/vite.config.js` | Build and dev config | Yes | No |
| `client/package.json` | Frontend dependencies/scripts | Yes | No |
| `client/.oxlintrc.json` | Linting rules | Yes | No |
| `client/tailwind.config.js` | Tailwind CSS config | No (uses v4 defaults) | No |
| `docker-compose.yml` | Local PostgreSQL setup | Yes | No |
| `backend-fastapi/render.yaml` | Render deployment | Yes (rarely) | No |
| `backend-fastapi/railway.json` | Railway deployment | Yes (rarely) | No |
| `backend-fastapi/Procfile` | Heroku deployment | Yes (rarely) | No |
| `.github/workflows/ci-cd.yml` | CI/CD pipeline | Yes (rarely) | No |
| `.env.*` files | Environment variables | Yes | No |
| `package-lock.json` | Locked npm dependencies | No | Yes |
| `node_modules/` | Installed dependencies | No | Yes |

## Backend Configuration

### config.py (Environment Configuration)

**File:** `backend-fastapi/config.py`

**Purpose:** Loads and exposes all backend environment variables.

**Key behavior:**
1. Reads `APP_ENV` (default: `local`)
2. Loads `.env.{APP_ENV}` file if it exists
3. Falls back to defaults for missing variables

**Configuration sections:**
- **Application:** APP_ENV, PORT, BACKEND_URL, FRONTEND_URL, CORS_ORIGINS
- **Database:** DATABASE_URL
- **Auth:** JWT_SECRET, JWT_ALGORITHM, JWT_ACCESS_EXPIRY_MINUTES, JWT_REFRESH_EXPIRY_DAYS
- **GitHub:** GITHUB_CLIENT_ID_POST_PANEL, GITHUB_CLIENT_SECRET_POST_PANEL
- **AI:** GEMINI_API_KEY_POST_PANEL
- **Admin:** ADMIN_GITHUB_IDS, ADMIN_PASSWORD

**Warning:** `GEMINI_API_KEY_POST_PANEL`, `GITHUB_CLIENT_ID_POST_PANEL`, and `GITHUB_CLIENT_SECRET_POST_PANEL` are loaded directly from process environment (via `os.getenv`), NOT from `.env` files. This means they must be set in the shell/environment where the server runs.

### Alembic Configuration

**Files:** `backend-fastapi/alembic.ini`, `backend-fastapi/alembic/env.py`

**Purpose:** Manages database migrations.

**Key configuration:**
- `alembic.ini` has a hardcoded default `sqlalchemy.url`
- `env.py` overrides the URL from `DATABASE_URL` environment variable
- Uses `Base.metadata` from `app.models` for autogenerate

**Modifying:** Only modify when adding new migrations or changing database properties.

### requirements.txt

**File:** `backend-fastapi/requirements.txt`

**Purpose:** Lists Python package dependencies.

**Current packages:**
```
fastapi
uvicorn
sqlalchemy
alembic
python-dotenv
psycopg2-binary
httpx
PyJWT
markdown
```

**Note:** No version pinning. This can lead to unexpected behavior with dependency updates.

## Frontend Configuration

### vite.config.js

**File:** `client/vite.config.js`

**Purpose:** Build tool configuration for Vite.

**Key configuration:**
```javascript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.VITE_PORT) || 5180
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port,
      proxy: {
        '/api': env.VITE_BACKEND_URL || 'http://127.0.0.1:7180',
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.js'],
      css: false,
    },
  }
})
```

**Key behavior:**
- Loads environment variables with `loadEnv`
- Default dev server port: 5180
- Proxies `/api` requests to backend (7180) or `VITE_BACKEND_URL`
- Configures Vitest for testing (jsdom environment)

### package.json

**File:** `client/package.json`

**Purpose:** Frontend dependencies and scripts.

**Scripts:**
```json
{
  "dev": "vite",
  "build": "vite build",
  "lint": "oxlint",
  "test": "vitest run",
  "test:watch": "vitest",
  "preview": "vite preview"
}
```

**Dependencies:** React, React Router, Tailwind CSS, react-markdown, react-quill-new, remark-gfm, react-icons

**Dev dependencies:** Vite, Vitest, Testing Library, jsdom, oxlint, Tailwind plugins

### .oxlintrc.json

**File:** `client/.oxlintrc.json`

**Purpose:** Linting rules for oxlint.

**Key configuration:** React hooks rules and standard linting rules.

### Tailwind CSS (v4)

**Configuration:** No `tailwind.config.js` file detected (uses v4 conventions).

**Setup:**
- `@tailwindcss/vite` plugin in `vite.config.js`
- `@tailwindcss/typography` for prose styling
- CSS imports in `client/src/index.css`

## Database Configuration

### docker-compose.yml

**File:** `docker-compose.yml`

**Purpose:** Local PostgreSQL development database.

```yaml
services:
  db:
    image: postgres:16
    container_name: post-panel-db
    env_file:
      - .env.local
    ports:
      - "5434:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
```

**Key configuration:**
- PostgreSQL 16
- Container name: `post-panel-db`
- Host port: 5434 (to avoid conflicts with other Postgres installs)
- Data persisted in named volume `pgdata`
- Credentials from `.env.local`

**Commands:**
```bash
docker-compose up -d     # Start database
docker-compose down      # Stop database
docker-compose down -v   # Stop and remove data volume
```

### SQLAlchemy Connection

**File:** `backend-fastapi/database.py`

**Key configuration:**
- `create_engine(DATABASE_URL, pool_pre_ping=True)`
- Session factory: `SessionLocal`
- FastAPI dependency: `get_db()`

## Build Configuration

### Frontend Build (Vite)

**Command:** `npm run build`

**Process:**
1. Loads environment variables
2. Bundles React application with Vite
3. Outputs to `client/dist/`

**Key settings:**
- React plugin for JSX support
- Tailwind CSS plugin
- Base URL: `/` (root)

### Backend Build

**No compilation needed** - Python runs directly from source.

**Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Runtime Configuration

### Backend Runtime
- **Server:** Uvicorn ASGI server
- **Port:** Default 7180 (or `PORT` env)
- **Auto-reload:** `--reload` flag for development
- **Database:** PostgreSQL via SQLAlchemy

### Frontend Runtime
- **Dev server:** Vite (port 5180)
- **Production:** Static files served by Vercel

## Deployment Configuration

### Render (backend)

**File:** `backend-fastapi/render.yaml`

**Key configuration:**
- Build: `pip install -r requirements.txt`
- Start: `alembic upgrade head && python3 scripts/seed.py && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check: `/docs`
- Auto-deploy: true
- Managed PostgreSQL database

### Railway (alternative backend)

**File:** `backend-fastapi/railway.json`

**Key configuration:**
- Build: Nixpacks, `pip install -r requirements.txt`
- Start: `alembic upgrade head && python3 scripts/seed.py && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check: `/`
- Restart policy: ON_FAILURE, max 3 retries

### Heroku (alternative backend)

**File:** `backend-fastapi/Procfile`

**Key configuration:**
`web: alembic upgrade head && python3 scripts/seed.py && uvicorn main:app --host 0.0.0.0 --port $PORT`

### Vercel (frontend)

**Configuration:** Managed via Vercel dashboard and CLI

**Deployment:** GitHub Actions workflow deploys via `vercel` CLI

## CI/CD Configuration

**File:** `.github/workflows/ci-cd.yml`

**Workflow:**
1. **Lint & Test** (all pushes/PRs to main)
   - Install client dependencies
   - Run oxlint
   - Run vitest
2. **Deploy Backend** (main pushes only)
   - Deploy to Render via GitHub Action
3. **Deploy Frontend** (main pushes only)
   - Install Vercel CLI
   - Pull Vercel environment
   - Build frontend with `VITE_BACKEND_URL`
   - Deploy to Vercel

**Secrets required:**
- `RENDER_SERVICE_ID`
- `RENDER_API_KEY`
- `VERCEL_TOKEN`
- `BACKEND_URL`

## Environment Selection

### APP_ENV Variable

**Values:**
- `local` (default) - Development
- `prod` - Production

**Effects:**
- Selects `.env.{APP_ENV}` file
- Controls cookie `secure` flag (`prod` = true)
- Controls cookie `samesite` (`prod` = none, otherwise lax)

### Frontend Environment

- `NODE_ENV`: Set automatically by Vite
- `VITE_BACKEND_URL`: API URL for production
- `.env.prod`: Production variables file

## Configuration File Safety

### Safe to Modify
- `.env.*` files (environment variables)
- `backend-fastapi/requirements.txt` (dependencies)
- `client/package.json` (when intentional)
- Linting configuration

### Modify with Caution
- `vite.config.js` (affects build)
- `config.py` (affects all backend)
- `docker-compose.yml` (affects local DB)
- Deployment configs (affect production)

### Do Not Modify
- `package-lock.json` (generated, use `npm install`)
- `node_modules/` (generated)
- Migration files in `alembic/versions/` (except new migrations)
- `dist/` (generated build output)

## Configuration Patterns

### Backend Pattern
```python
# Standard pattern for backend config
VARIABLE = os.getenv("VARIABLE_NAME", "default_value")
```

### Frontend Pattern
```javascript
// Standard pattern for frontend config
const value = import.meta.env.VITE_VARIABLE || "default"
```

### Environment Variable Naming
- Backend: `UPPER_SNAKE_CASE` (e.g., `DATABASE_URL`)
- Frontend: `VITE_` prefix (e.g., `VITE_BACKEND_URL`)
- GitHub-specific: `_POST_PANEL` suffix (e.g., `GEMINI_API_KEY_POST_PANEL`)