# Integrations

This document catalogs every external service integrated with the Post Panel application.

## Integration Overview

| Service | Purpose | Package | Authentication |
|---------|---------|---------|----------------|
| GitHub OAuth | User authentication | httpx | OAuth tokens |
| GitHub API | Repository data | httpx | Bearer tokens |
| GitHub Raw | README content | httpx | Optional tokens |
| Google Gemini | AI content generation | httpx | API key |
| PostgreSQL | Data persistence | psycopg2-binary | Database credentials |
| Render | Backend deployment | N/A | API key / platform |
| Vercel | Frontend deployment | vercel CLI | Token |

## GitHub Integration

### GitHub OAuth

**Purpose:** User authentication via GitHub accounts

**SDK/Package:** httpx (direct HTTP calls)

**Configuration:**
- `GITHUB_CLIENT_ID_POST_PANEL`: OAuth app client ID
- `GITHUB_CLIENT_SECRET_POST_PANEL`: OAuth app client secret
- `BACKEND_URL`: Callback URL base

**Authentication:**
- OAuth 2.0 authorization code flow
- Scope: `user:email`

**API Operations:**
1. **Authorize:** `GET https://github.com/login/oauth/authorize`
   - Params: `client_id`, `redirect_uri`, `scope`
   - Purpose: Redirect user to GitHub login

2. **Token Exchange:** `POST https://github.com/login/oauth/access_token`
   - Body: `client_id`, `client_secret`, `code`
   - Purpose: Exchange authorization code for access token

3. **User Profile:** `GET https://api.github.com/user`
   - Header: `Authorization: Bearer <token>`
   - Purpose: Fetch authenticated user's profile

**Called from:** `backend-fastapi/main.py` (`github_login()`, `github_callback()`)

**Failure behavior:**
- Missing client ID: Returns 500
- Token exchange failure: Redirects to login with error
- User fetch failure: Redirects to login with error

**Retry behavior:** No retry logic, fails fast with error redirect

**Development setup:**
1. Create GitHub OAuth app at: `https://github.com/settings/developers`
2. Set authorization callback to `http://localhost:7180/api/auth/github/callback`
3. Set `GITHUB_CLIENT_ID_POST_PANEL` and `GITHUB_CLIENT_SECRET_POST_PANEL`

**Production setup:**
1. Same OAuth app or new one for production
2. Set callback to production backend URL

### GitHub Repository API

**Purpose:** Fetch repository metadata for post creation/enrichment

**SDK/Package:** httpx (direct HTTP calls)

**Configuration:**
- `GITHUB_TOKEN`: Fallback token (optional)
- User's stored `github_token`: Preferred token

**Authentication:**
- `Authorization: token <token>` header
- Falls back between user's token and `GITHUB_TOKEN`

**API Operations:**

1. **Repository Info:** `GET https://api.github.com/repos/{owner}/{repo}`
   - Purpose: Fetch repo metadata (language, stars, forks, etc.)
   - Response fields: `language`, `default_branch`, `pushed_at`, `owner.login`, `stargazers_count`, `forks_count`, `watchers_count`, `open_issues_count`

2. **README Fetch:** `GET https://raw.githubusercontent.com/{owner}/{repo}/HEAD/README.{ext}`
   - Extensions tried: `md`, `MD`, `markdown`, `txt`
   - Purpose: Fetch README content for AI generation
   - Maximum: 4000 characters

**Called from:**
- `fetch_github_repo()` - Repository metadata
- `fetch_readme()` - README content

**Caching:**
- In-memory dictionary `_github_cache`
- TTL: 1 hour (`GITHUB_CACHE_TTL = 3600`)
- Cache key: `{owner}/{repo}`

**Failure behavior:**
- API failure: Returns None
- Repository not found: Returns None (404 handling)
- Rate limiting: Returns None with error message suggesting token refresh

**Retry behavior:** No retry logic

**Rate limiting considerations:**
- GitHub API limit: 60 requests/hour (unauthenticated)
- GitHub API limit: 5000 requests/hour (authenticated)
- Uses user's GitHub token when available to reduce rate limiting
- 1-hour cache reduces repeated calls

## Google Gemini Integration

**Purpose:** AI-powered content generation for posts

**SDK/Package:** httpx (direct HTTP calls)

**Configuration:**
- `GEMINI_API_KEY_POST_PANEL`: API key (loaded from process environment)

**Authentication:**
- API key in URL query: `?key=<API_KEY>`

**API Operations:**

1. **Generate Content:** `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=<API_KEY>`

   **Request:**
   ```json
   {
     "contents": [{
       "parts": [{"text": "<prompt with repo data and README>"}]
     }],
     "generationConfig": {
       "temperature": 0.7,
       "maxOutputTokens": 4096
     }
   }
   ```

   **Response:**
   ```json
   {
     "candidates": [{
       "content": {
         "parts": [{"text": "<JSON output>"}]
       }
     }]
   }
   ```

**Prompt engineering:**
- Includes repo name, language, description, stars, forks
- Includes README content (first 3000 chars)
- Instructs model to output specific JSON structure
- Instructs model to avoid HTML tags
- Instructs model to use specific description structure (Gameplay, Features, Tech Stack)

**Post-processing:**
1. Strip markdown code fences
2. Extract JSON object from response
3. `fix_json_strings()` - Repair unescaped newlines and control characters
4. Convert markdown description to HTML for Quill editor

**Called from:** `generate_with_gemini()` in `backend-fastapi/main.py`

**Failure behavior:**
- Non-200 response: Raises exception
- No JSON in response: Raises exception
- JSON parse failure: Raises exception
- API key not configured: Returns 500

**Retry behavior:** No retry logic

**Timeout:** 30 seconds

**Development setup:**
1. Obtain API key from Google AI Studio
2. Set `GEMINI_API_KEY_POST_PANEL` in environment

**Production setup:**
1. Set API key in deployment platform environment variables

## PostgreSQL Integration

**Purpose:** Primary data persistence

**SDK/Package:** psycopg2-binary, SQLAlchemy

**Configuration:**
- `DATABASE_URL`: Connection string
- Pool settings: `pool_pre_ping=True`

**Authentication:** Database credentials in connection string

**API Operations:**
- CRUD operations via SQLAlchemy ORM
- Schema management via Alembic migrations

**Called from:** `database.py`, `app/models.py`, all handlers

**Failure behavior:**
- Connection failure: `get_db()` yields None (routes fall back to static data)
- Query failure: Exception caught in routes (fallback data)

**Retry behavior:** No explicit retry, but `pool_pre_ping=True` handles stale connections

**Development setup:**
1. `docker-compose up -d` (PostgreSQL 16 on port 5434)
2. `alembic upgrade head` (run migrations)
3. `python scripts/seed.py` (seed demo data)

**Production setup:**
- Managed database (Render/railway)
- Connection string from platform

## Deployment Integrations

### Render (Backend Hosting)

**Purpose:** Hosts the FastAPI backend

**Configuration:** `backend-fastapi/render.yaml`

**Authentication:** `RENDER_SERVICE_ID`, `RENDER_API_KEY` (GitHub secrets)

**API Operations:**
- Deploy via GitHub Actions
- Health check at `/docs`
- Auto-deploy on main branch push

**Features used:**
- Web service (Python runtime)
- Managed PostgreSQL database
- Environment variables

### Vercel (Frontend Hosting)

**Purpose:** Hosts the React SPA

**Configuration:** Via Vercel dashboard and CLI

**Authentication:** `VERCEL_TOKEN` (GitHub secret)

**API Operations:**
- Deploy via GitHub Actions
- Environment variable `BACKEND_URL` (maps to `VITE_BACKEND_URL`)

**Features used:**
- Static site hosting
- Environment variables

## Integration Dependency Graph

```
Post Panel
├── GitHub
│   ├── OAuth (user authentication)
│   ├── API (repository data)
│   └── Raw (README content)
├── Google Gemini
│   └── generateContent (AI content generation)
├── PostgreSQL
│   └── Data persistence
├── Render
│   └── Backend hosting
└── Vercel
    └── Frontend hosting
```

## Failure Modes and Recovery

### GitHub API Failure
```
GitHub API request fails
  ↓
fetch_github_repo() returns None
  ↓
Route handler checks for None
  ↓
Returns 404 with error message
OR
Proceeds with partial data (no GitHub enrichment)
```

### Gemini API Failure
```
Gemini API request fails
  ↓
generate_with_gemini() raises exception
  ↓
generatePostContent() catches exception
  ↓
Returns 500 with error message
```

### Database Failure
```
Database connection fails
  ↓
get_db() yields None
  ↓
getPosts() catches exception
  ↓
Returns static fallback posts (all_posts.py)
```

## External Service Configuration Summary

| Service | Required Environment Variables | Optional Variables |
|---------|-------------------------------|-------------------|
| GitHub OAuth | `GITHUB_CLIENT_ID_POST_PANEL`, `GITHUB_CLIENT_SECRET_POST_PANEL` | None |
| GitHub API | None | `GITHUB_TOKEN` |
| Gemini | `GEMINI_API_KEY_POST_PANEL` | None |
| PostgreSQL | `DATABASE_URL` | None |
| Render | None (dashboard config) | None |
| Vercel | None (dashboard config) | None |

## Integration Security

### GitHub
- OAuth tokens stored in `User.github_token` (plain text - consider encryption)
- Tokens sent in Authorization headers
- Never exposed to frontend

### Gemini
- API key in URL query parameter (Google's standard pattern)
- Key never exposed to frontend
- Loaded only from process environment

### PostgreSQL
- Credentials via environment variables
- Never committed to version control (`.gitignore` handles this)

### Deployment
- Tokens stored as GitHub Action secrets
- Never committed to version control