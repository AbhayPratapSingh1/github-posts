# Environment Variables

This document catalogs all environment variables referenced by the Post Panel codebase.

> **Security Note:** Actual secret values are never shown. Only variable names, purposes, and placeholder formats are documented.

## Configuration Loading

### Backend Configuration Flow

```
config.py loads environment variables
  ↓
Selects .env file based on APP_ENV (default: local)
  ↓
Loads .env.{APP_ENV} if exists (python-dotenv)
  ↓
Reads remaining variables from process environment
  ↓
Exports variables for use throughout the application
```

**Loading order:**
1. Environment variables already set in the process
2. `.env.{APP_ENV}` file (e.g., `.env.local`, `.env.prod`)
3. Defaults defined in `config.py`

### Frontend Configuration Flow

```
Vite loads environment variables
  ↓
Variables prefixed with VITE_ are exposed to client code
  ↓
import.meta.env object contains them
  ↓
config/env.js reads and exports for application use
```

## Environment Variable Reference

### Application

#### APP_ENV
- **Variable:** `APP_ENV`
- **Required:** No
- **Default:** `local`
- **Purpose:** Selects which `.env` file to load and controls security settings
- **Used by:** `backend-fastapi/config.py`
- **Expected format:** `local` or `prod`
- **Example:** `APP_ENV=prod`
- **Production considerations:** Controls `secure` cookie flag and `samesite` attribute
- **Sensitive:** No

#### PORT
- **Variable:** `PORT`
- **Required:** No
- **Default:** `7180`
- **Purpose:** Port for the FastAPI backend server
- **Used by:** `backend-fastapi/config.py`, main entry point
- **Expected format:** Integer
- **Example:** `PORT=7180`
- **Production considerations:** Often set by the hosting platform (Render, Railway)
- **Sensitive:** No

#### BACKEND_URL
- **Variable:** `BACKEND_URL`
- **Required:** No
- **Default:** `http://localhost:7180`
- **Purpose:** Public URL of the backend, used for OAuth redirect
- **Used by:** `backend-fastapi/config.py`, `main.py` (OAuth)
- **Expected format:** Full URL
- **Example:** `BACKEND_URL=https://post-panel-api.onrender.com`
- **Production considerations:** Must match the deployed backend URL
- **Sensitive:** No

#### FRONTEND_URL
- **Variable:** `FRONTEND_URL`
- **Required:** No
- **Default:** `http://localhost:5180`
- **Purpose:** Public URL of the frontend, used for OAuth redirect destination
- **Used by:** `backend-fastapi/config.py`, `main.py` (OAuth callback)
- **Expected format:** Full URL
- **Example:** `FRONTEND_URL=https://post-panel.vercel.app`
- **Production considerations:** Must match the deployed frontend URL
- **Sensitive:** No

#### CORS_ORIGINS
- **Variable:** `CORS_ORIGINS`
- **Required:** No
- **Default:** `FRONTEND_URL` value
- **Purpose:** Comma-separated list of allowed CORS origins
- **Used by:** `backend-fastapi/config.py`, `main.py` (CORS middleware)
- **Expected format:** Comma-separated URLs
- **Example:** `CORS_ORIGINS=https://post-panel.vercel.app,http://localhost:5180`
- **Production considerations:** Must include the deployed frontend URL
- **Sensitive:** No

### Database

#### DATABASE_URL
- **Variable:** `DATABASE_URL`
- **Required:** Yes (for production)
- **Default:** `postgresql://postgres:postgres@localhost:5434/post_panel`
- **Purpose:** PostgreSQL connection string
- **Used by:** `backend-fastapi/database.py`, `backend-fastapi/alembic/env.py`, `backend-fastapi/tests/conftest.py`
- **Expected format:** PostgreSQL connection string
- **Example:** `DATABASE_URL=postgresql://postgres:postgres@localhost:5434/post_panel`
- **Production considerations:** Use managed database URL (e.g., Render, Railway)
- **Sensitive:** Yes (contains credentials)

#### POSTGRES_USER (docker-compose)
- **Variable:** `POSTGRES_USER`
- **Required:** For local Docker
- **Default:** None (from `.env.local`)
- **Purpose:** PostgreSQL username for Docker container
- **Used by:** `docker-compose.yml`
- **Expected format:** String
- **Example:** `POSTGRES_USER=postgres`
- **Production considerations:** Local development only
- **Sensitive:** Yes

#### POSTGRES_PASSWORD (docker-compose)
- **Variable:** `POSTGRES_PASSWORD`
- **Required:** For local Docker
- **Default:** None (from `.env.local`)
- **Purpose:** PostgreSQL password for Docker container
- **Used by:** `docker-compose.yml`
- **Expected format:** String
- **Example:** `POSTGRES_PASSWORD=<password>`
- **Production considerations:** Local development only
- **Sensitive:** Yes

#### POSTGRES_DB (docker-compose)
- **Variable:** `POSTGRES_DB`
- **Required:** For local Docker
- **Default:** None (from `.env.local`)
- **Purpose:** PostgreSQL database name for Docker container
- **Used by:** `docker-compose.yml`
- **Expected format:** String
- **Example:** `POSTGRES_DB=post_panel`
- **Production considerations:** Local development only
- **Sensitive:** No

### Authentication

#### JWT_SECRET
- **Variable:** `JWT_SECRET`
- **Required:** Yes (for production)
- **Default:** `dev-secret-change-me`
- **Purpose:** Secret key for JWT token signing
- **Used by:** `backend-fastapi/auth.py`, `backend-fastapi/config.py`
- **Expected format:** Random string, min 32 chars recommended
- **Example:** `JWT_SECRET=<random-long-string>`
- **Production considerations:** MUST change from default in production
- **Sensitive:** Yes (critical for token security)

#### JWT_ALGORITHM
- **Variable:** `JWT_ALGORITHM`
- **Required:** No
- **Default:** `HS256`
- **Purpose:** JWT signing algorithm
- **Used by:** `backend-fastapi/auth.py`
- **Expected format:** Supported JWT algorithm
- **Example:** `JWT_ALGORITHM=HS256`
- **Production considerations:** Use strong algorithm (RS256 for production)
- **Sensitive:** No

#### JWT_ACCESS_EXPIRY_MINUTES
- **Variable:** `JWT_ACCESS_EXPIRY_MINUTES`
- **Required:** No
- **Default:** `15`
- **Purpose:** Access token expiration time in minutes
- **Used by:** `backend-fastapi/config.py`, `auth.py`
- **Expected format:** Integer (minutes)
- **Example:** `JWT_ACCESS_EXPIRY_MINUTES=15`
- **Production considerations:** Balance security vs. user experience
- **Sensitive:** No

#### JWT_REFRESH_EXPIRY_DAYS
- **Variable:** `JWT_REFRESH_EXPIRY_DAYS`
- **Required:** No
- **Default:** `30`
- **Purpose:** Refresh token expiration time in days
- **Used by:** `backend-fastapi/config.py`, `auth.py`
- **Expected format:** Integer (days)
- **Example:** `JWT_REFRESH_EXPIRY_DAYS=30`
- **Production considerations:** Longer is more convenient, shorter is more secure
- **Sensitive:** No

#### ADMIN_GITHUB_IDS
- **Variable:** `ADMIN_GITHUB_IDS`
- **Required:** No (has default)
- **Default:** `47173091`
- **Purpose:** Comma-separated GitHub IDs authorized as admins
- **Used by:** `backend-fastapi/config.py`, `main.py` (admin routes)
- **Expected format:** Comma-separated integers
- **Example:** `ADMIN_GITHUB_IDS=47173091,12345678`
- **Production considerations:** The default value appears to be a real GitHub ID - change in production
- **Sensitive:** No (but sensitive operationally)

#### ADMIN_PASSWORD
- **Variable:** `ADMIN_PASSWORD`
- **Required:** No (has default)
- **Default:** `admin123`
- **Purpose:** Password for admin login
- **Used by:** `backend-fastapi/config.py`, `main.py` (admin login)
- **Expected format:** Strong password string
- **Example:** `ADMIN_PASSWORD=<strong-password>`
- **Production considerations:** MUST change from default in production
- **Sensitive:** Yes

### External APIs - GitHub

#### GITHUB_CLIENT_ID_POST_PANEL
- **Variable:** `GITHUB_CLIENT_ID_POST_PANEL`
- **Required:** Yes (for GitHub login)
- **Default:** Empty string
- **Purpose:** GitHub OAuth application client ID
- **Used by:** `backend-fastapi/config.py`, `main.py` (OAuth flow)
- **Expected format:** GitHub OAuth client ID
- **Example:** `GITHUB_CLIENT_ID_POST_PANEL=<github-client-id>`
- **Production considerations:** Must match GitHub OAuth app configuration
- **Sensitive:** Yes

#### GITHUB_CLIENT_SECRET_POST_PANEL
- **Variable:** `GITHUB_CLIENT_SECRET_POST_PANEL`
- **Required:** Yes (for GitHub login)
- **Default:** Empty string
- **Purpose:** GitHub OAuth application client secret
- **Used by:** `backend-fastapi/config.py`, `main.py` (OAuth flow)
- **Expected format:** GitHub OAuth client secret
- **Example:** `GITHUB_CLIENT_SECRET_POST_PANEL=<github-client-secret>`
- **Production considerations:** MUST NEVER be exposed to clients
- **Sensitive:** Yes (critical)

#### GITHUB_TOKEN
- **Variable:** `GITHUB_TOKEN`
- **Required:** No
- **Default:** None
- **Purpose:** Fallback GitHub API token for unauthenticated repo fetches
- **Used by:** `backend-fastapi/main.py` (fetch_github_repo, fetch_readme)
- **Expected format:** GitHub personal access token
- **Example:** `GITHUB_TOKEN=<github-token>`
- **Production considerations:** Used when user's own token unavailable
- **Sensitive:** Yes

### External APIs - AI

#### GEMINI_API_KEY_POST_PANEL
- **Variable:** `GEMINI_API_KEY_POST_PANEL`
- **Required:** Yes (for AI generation feature)
- **Default:** Empty string
- **Purpose:** Google Gemini API key for AI content generation
- **Used by:** `backend-fastapi/config.py`, `main.py` (generate_with_gemini)
- **Expected format:** Google API key
- **Example:** `GEMINI_API_KEY_POST_PANEL=<gemini-api-key>`
- **Production considerations:** `config.py` loads `.env.{APP_ENV}` (e.g. `.env.prod`) via dotenv, but production deployments rely on the shell environment since `.env` files are typically not deployed.
- **Sensitive:** Yes (critical)

### Frontend

#### VITE_BACKEND_URL
- **Variable:** `VITE_BACKEND_URL`
- **Required:** No
- **Default:** Empty (uses Vite proxy)
- **Purpose:** Backend API base URL for frontend
- **Used by:** `client/src/config/env.js`, `client/vite.config.js`
- **Expected format:** Full URL (without `/api` suffix)
- **Example:** `VITE_BACKEND_URL=https://post-panel-api.onrender.com`
- **Production considerations:** Must point to the deployed backend
- **Sensitive:** No

#### VITE_PORT
- **Variable:** `VITE_PORT`
- **Required:** No
- **Default:** `5180`
- **Purpose:** Frontend dev server port
- **Used by:** `client/src/config/env.js`, `client/vite.config.js`
- **Expected format:** Integer
- **Example:** `VITE_PORT=5180`
- **Production considerations:** Development only
- **Sensitive:** No

## Environment Variable Grouping

### Backend Variables
| Variable | Required | Sensitive | Production Default |
|----------|----------|-----------|-------------------|
| APP_ENV | No | No | `prod` |
| PORT | No | No | Platform-provided |
| BACKEND_URL | No | No | Deployed URL |
| FRONTEND_URL | No | No | Deployed URL |
| CORS_ORIGINS | No | No | Frontend URL |
| DATABASE_URL | Yes | Yes | Managed DB URL |
| JWT_SECRET | Yes | Yes | Generated in Render |
| JWT_ACCESS_EXPIRY_MINUTES | No | No | 15 |
| JWT_REFRESH_EXPIRY_DAYS | No | No | 30 |
| ADMIN_GITHUB_IDS | No | No | Real GitHub ID |
| ADMIN_PASSWORD | No | Yes | `admin123` (CHANGE!) |
| GITHUB_CLIENT_ID_POST_PANEL | Yes | Yes | GitHub app |
| GITHUB_CLIENT_SECRET_POST_PANEL | Yes | Yes | GitHub app |
| GITHUB_TOKEN | No | Yes | None |
| GEMINI_API_KEY_POST_PANEL | Optional | Yes | None |

### Frontend Variables
| Variable | Required | Sensitive |
|----------|----------|-----------|
| VITE_BACKEND_URL | No | No |
| VITE_PORT | No | No |

### Docker Variables
| Variable | Required | Sensitive |
|----------|----------|-----------|
| POSTGRES_USER | Yes | Yes |
| POSTGRES_PASSWORD | Yes | Yes |
| POSTGRES_DB | Yes | No |
| DATABASE_URL | Yes | Yes |

### CI/CD Variables
| Variable | Required | Sensitive | Used In |
|----------|----------|-----------|---------|
| RENDER_SERVICE_ID | Yes | No | GitHub Actions |
| RENDER_API_KEY | Yes | Yes | GitHub Actions |
| VERCEL_TOKEN | Yes | Yes | GitHub Actions |
| BACKEND_URL | Yes | No | GitHub Actions (Vercel build) |

## Environment File Structure

### Root `.env.local` (Docker DB)
```
POSTGRES_USER=<user>
POSTGRES_PASSWORD=<password>
POSTGRES_DB=post_panel
DATABASE_URL=postgresql://<user>:<password>@localhost:5434/post_panel
```

### Root `.env.prod` (Docker DB production)
```
POSTGRES_USER=<user>
POSTGRES_PASSWORD=<password>
POSTGRES_DB=post_panel
DATABASE_URL=postgresql://<user>:<password>@localhost:5434/post_panel
```

### `backend-fastapi/.env.local`
```
APP_ENV=local
DATABASE_URL=<database-connection-string>
JWT_SECRET=<dev-secret>
FRONTEND_URL=http://localhost:5180
```

### `backend-fastapi/.env.prod`
```
APP_ENV=prod
DATABASE_URL=<database-connection-string>
```

### `client/.env.prod`
```
VITE_BACKEND_URL=<backend-url>
```

## Configuration Security Notes

### Sensitivity Levels

**Critical (never expose):**
- `DATABASE_URL` credentials
- `JWT_SECRET`
- `GITHUB_CLIENT_SECRET_POST_PANEL`
- `GITHUB_TOKEN`
- `GEMINI_API_KEY_POST_PANEL`
- `ADMIN_PASSWORD`

**Sensitive (restrict access):**
- `GITHUB_CLIENT_ID_POST_PANEL`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`

**Operational (not secret, but config-dependent):**
- `ADMIN_GITHUB_IDS`
- `CORS_ORIGINS`
- `BACKEND_URL`, `FRONTEND_URL`

### Security Concerns

**Observed risks:**
1. `JWT_SECRET` default is a public string (`dev-secret-change-me`)
2. `ADMIN_PASSWORD` default is `admin123`
3. `ADMIN_GITHUB_IDS` default appears to be a real GitHub ID
4. `GEMINI_API_KEY_POST_PANEL`, `GITHUB_CLIENT_ID_POST_PANEL`, `GITHUB_CLIENT_SECRET_POST_PANEL` are read via `config.py` (loads `.env.{APP_ENV}`) — in production these must be supplied by the deployment platform's environment variables

**Recommended practices:**
1. Use environment-specific secrets in production
2. Never commit `.env` files to version control (`.gitignore` already handles this)
3. Use platform secret managers (Render, Vercel)
4. Rotate secrets periodically
5. Use strong random values for all secrets

## Configuration Verification

To verify all required environment variables are set:
```bash
# Backend
python -c "from config import *; import config; print('PORT:', config.PORT); print('APP_ENV:', config.APP_ENV)"

# Check that secrets are not defaults
# Frontend
echo $VITE_BACKEND_URL
```