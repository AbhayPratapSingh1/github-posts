# Post Panel - Codebase Context

**Generated:** 2026-09-10  
**Repository:** post-panel  
**Primary branch:** main  
**Documentation scope:** Full repository inspection

This documentation describes the repository state at generation time. Re-run/update it when major architecture or feature changes occur.

## What This Application Does

Post Panel is a project showcase web application where users can:
- Sign in with GitHub OAuth
- Create, edit, and delete posts showcasing their projects
- Add comments to posts
- Use AI to generate post content from GitHub repositories
- View a dashboard with statistics (admin only)

## Primary Technologies

- **Frontend:** React 19, Vite 8, Tailwind CSS v4, React Router v7
- **Backend:** FastAPI (Python), SQLAlchemy 2.0, Alembic
- **Database:** PostgreSQL
- **Authentication:** GitHub OAuth, JWT tokens
- **AI:** Google Gemini 2.5 Flash for content generation
- **Deployment:** Render (backend), Vercel (frontend), Docker (local DB)

## High-Level Architecture

```
User → React SPA (Vite) → FastAPI Backend → PostgreSQL
  ↓
GitHub OAuth → User upsert
  ↓
Gemini API → Content generation
```

## How to Run Locally

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker (for PostgreSQL)
- GitHub OAuth App credentials
- Gemini API key (optional, for AI features)

### Setup
1. Clone the repository
2. Start PostgreSQL: `docker-compose up -d`
3. Backend setup:
   ```bash
   cd backend-fastapi
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   alembic upgrade head
   python scripts/seed.py
   uvicorn main:app --reload --port 7180
   ```
4. Frontend setup:
   ```bash
   cd client
   npm install
   npm run dev
   ```

### Important Commands
- `npm run dev` (client) - Start frontend dev server
- `uvicorn main:app --reload` (backend) - Start backend server
- `npm test` (client) - Run frontend tests
- `pytest` (backend) - Run backend tests
- `npm run lint` (client) - Run oxlint
- `alembic upgrade head` - Run database migrations
- `python scripts/seed.py` - Seed database with demo data

## Important Directories

- `client/` - React frontend application
- `backend-fastapi/` - Primary FastAPI backend
- `backend/` - Legacy Hono backend (deprecated)
- `bruno/` - API test collection
- `.github/workflows/` - CI/CD pipelines

## Where Business Logic Lives

- **Post management:** `backend-fastapi/handler/postHandler.py`
- **Authentication:** `backend-fastapi/auth.py`
- **AI generation:** `backend-fastapi/main.py` (inline functions)
- **GitHub integration:** `backend-fastapi/main.py` (inline functions)

## Where API Logic Lives

- **All routes:** `backend-fastapi/main.py` (single file, ~950 lines)
- **API client:** `client/src/api/client.js` and `client/src/api/posts.js`

## Where Database Logic Lives

- **Models:** `backend-fastapi/app/models.py`
- **Migrations:** `backend-fastapi/alembic/versions/`
- **Database connection:** `backend-fastapi/database.py`

## Where Authentication Lives

- **Backend auth:** `backend-fastapi/auth.py`
- **Frontend auth context:** `client/src/context/AuthContext.jsx`
- **Protected routes:** `client/src/components/ProtectedRoute.jsx`

## Where Frontend Rendering Happens

- **Pages:** `client/src/pages/` (Home, Post, Login, CreatePost, Admin*)
- **Components:** `client/src/components/` (Modal, Lightbox, ProfileMenu, etc.)
- **Main entry:** `client/src/main.jsx`

## Where Environment Configuration Lives

- **Backend config:** `backend-fastapi/config.py`
- **Frontend config:** `client/src/config/env.js`
- **Environment files:** `.env.local`, `.env.prod` (root), `backend-fastapi/`, `client/`

## Most Important Execution Flows

1. **Authentication flow:** Login → GitHub OAuth → Token storage → Protected routes
2. **Post creation:** CreatePost page → GitHub info fetch → Optional AI generation → API submission
3. **Post viewing:** Home page → Post detail → Comments loading
4. **Admin dashboard:** Admin login → Statistics aggregation → Content management

## Context Files

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture breakdown
- [DIRECTORY_MAP.md](./DIRECTORY_MAP.md) - Directory-by-directory explanation
- [DEPENDENCIES.md](./DEPENDENCIES.md) - External and internal dependencies
- [FUNCTIONS.md](./FUNCTIONS.md) - Important functions and their purposes
- [DATA_MODEL.md](./DATA_MODEL.md) - Database schema and relationships
- [API.md](./API.md) - All API endpoints documented
- [AUTH.md](./AUTH.md) - Authentication and authorization details
- [FLOWS.md](./FLOWS.md) - End-to-end application flows
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment variables and configuration
- [CONFIGURATION.md](./CONFIGURATION.md) - Framework and build configuration
- [INTEGRATIONS.md](./INTEGRATIONS.md) - External service integrations
- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) - Frontend state management
- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - Error handling patterns
- [TESTING.md](./TESTING.md) - Testing strategy and coverage
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment process and infrastructure
- [SECURITY.md](./SECURITY.md) - Security considerations
- [CONVENTIONS.md](./CONVENTIONS.md) - Coding conventions
- [GLOSSARY.md](./GLOSSARY.md) - Domain-specific terminology
- [AI_CONTEXT.md](./AI_CONTEXT.md) - Optimized for AI coding agents

## If You Are an AI Coding Agent

Before modifying code, read these files in order:

1. **ARCHITECTURE.md** - Understand the overall structure
2. **DIRECTORY_MAP.md** - Know where files are located
3. **DEPENDENCIES.md** - Understand external and internal dependencies
4. **DATA_MODEL.md** - Understand the database schema
5. **API.md** - Understand the API endpoints
6. **FLOWS.md** - Understand the specific flow you're modifying
7. **Relevant implementation files** - The actual code you'll be changing

This approach minimizes unnecessary repository exploration and provides the context needed for effective code modifications.

## Key Observations

- The backend is a single-file architecture (`main.py`) that could benefit from refactoring
- Authentication uses dual tokens (cookies and localStorage) which can be confusing
- No database foreign keys are defined; relationships are handled manually in code
- The frontend uses React context for state management (no external stores)
- Tests exist but coverage could be improved in critical flows

## Potential Documentation Gaps

- Detailed error handling patterns in the frontend
- Performance considerations and optimizations
- Scalability characteristics
- Monitoring and observability setup
- Detailed business rules beyond basic CRUD operations