# Directory Map

This document explains the repository directory structure, the purpose of each directory, and what they contain.

## Root Directory

### `/` (post-panel/)
**Purpose:** Project root containing all application code and configuration.
**Contains:** Frontend, backend, configuration files, documentation.
**Dependencies:** All subdirectories depend on root configuration.
**Important files:**
- `docker-compose.yml` - Local PostgreSQL setup
- `.github/workflows/ci-cd.yml` - CI/CD pipeline
- `dev.sh` - Development environment setup
- `README.md` - Project overview
- `SETUP.md` - Detailed setup instructions

**Do not modify casually:** `.gitignore`, `.github/workflows/`

---

## Frontend: `client/`

### `client/`
**Purpose:** React SPA frontend application.
**Contains:** Source code, configuration, tests, public assets.
**Dependencies:** Node.js, npm, Vite, React ecosystem.
**Important files:**
- `package.json` - Dependencies and scripts
- `vite.config.js` - Build configuration
- `.oxlintrc.json` - Linting rules
- `.env.prod` - Production environment variables

**Do not modify casually:** `vite.config.js`, `package.json`

### `client/src/`
**Purpose:** Application source code.
**Contains:** Components, pages, API clients, utilities.
**Dependencies:** React, React Router, Tailwind CSS.
**Important files:**
- `main.jsx` - Application entry point
- `App.jsx` - Route definitions
- `index.css` - Global styles

### `client/src/api/`
**Purpose:** HTTP client and API endpoint wrappers.
**Contains:** Fetch utilities, API functions.
**Dependencies:** Backend API, authentication context.
**Important files:**
- `client.js` - Base HTTP client with refresh logic
- `posts.js` - Post-specific API functions

**Do not modify casually:** `client.js` (affects all API calls)

### `client/src/components/`
**Purpose:** Reusable UI components.
**Contains:** Modal, Lightbox, ProfileMenu, ProtectedRoute, etc.
**Dependencies:** React, Tailwind CSS, context providers.
**Important files:**
- `ProtectedRoute.jsx` - Authentication guard
- `Modal.jsx` - Reusable modal with focus trap
- `ImageLightbox.jsx` - Image viewing with keyboard navigation

### `client/src/config/`
**Purpose:** Configuration constants and environment setup.
**Contains:** Environment variables, post types, text constants.
**Dependencies:** Environment variables, Vite.
**Important files:**
- `env.js` - API base URL configuration
- `posts.js` - Post type definitions
- `text.js` - Text constants (read time calculation)

### `client/src/context/`
**Purpose:** React context providers for global state.
**Contains:** Auth context, Toast context.
**Dependencies:** React, API client.
**Important files:**
- `AuthContext.jsx` - Authentication state and methods
- `ToastContext.jsx` - Notification system

**Do not modify casually:** `AuthContext.jsx` (affects all authenticated operations)

### `client/src/pages/`
**Purpose:** Page-level components for each route.
**Contains:** Home, Post, Login, CreatePost, Admin pages.
**Dependencies:** Components, API, context.
**Important files:**
- `Home.jsx` - Main post listing
- `Post.jsx` - Single post view
- `CreatePost.jsx` - Post creation/editing form
- `AdminDashboard.jsx` - Admin interface

### `client/src/tests/`
**Purpose:** Frontend test suites.
**Contains:** Unit and integration tests.
**Dependencies:** Vitest, React Testing Library.
**Important files:**
- `api/client.test.js` - HTTP client tests
- `context/AuthContext.test.jsx` - Auth context tests

### `client/public/`
**Purpose:** Static assets served directly.
**Contains:** Favicon, logo.
**Dependencies:** None.
**Important files:**
- `favicon.svg` - Browser tab icon
- `logo.svg` - Application logo

---

## Backend: `backend-fastapi/`

### `backend-fastapi/`
**Purpose:** Primary FastAPI backend application.
**Contains:** All backend code, configuration, migrations, tests.
**Dependencies:** Python, FastAPI, SQLAlchemy, PostgreSQL.
**Important files:**
- `main.py` - Application entry point and routes
- `requirements.txt` - Python dependencies
- `render.yaml` - Render deployment config
- `railway.json` - Railway deployment config

**Do not modify casually:** `main.py` (contains all routes and business logic)

### `backend-fastapi/app/`
**Purpose:** Application modules and models.
**Contains:** SQLAlchemy ORM models.
**Dependencies:** SQLAlchemy.
**Important files:**
- `models.py` - Database schema definitions

### `backend-fastapi/handler/`
**Purpose:** Business logic handlers.
**Contains:** Post CRUD operations.
**Dependencies:** Models, database.
**Important files:**
- `postHandler.py` - Post business logic

### `backend-fastapi/alembic/`
**Purpose:** Database migration management.
**Contains:** Migration scripts, configuration.
**Dependencies:** Alembic, SQLAlchemy, database.
**Important files:**
- `env.py` - Migration environment configuration
- `versions/` - Individual migration scripts

**Do not modify casually:** Migration files (can break database)

### `backend-fastapi/scripts/`
**Purpose:** Utility scripts for development and deployment.
**Contains:** Database seeding script.
**Dependencies:** Models, database.
**Important files:**
- `seed.py` - Database seeder with demo data

### `backend-fastapi/tests/`
**Purpose:** Backend test suites.
**Contains:** Pytest test files.
**Dependencies:** Pytest, SQLite (test database).
**Important files:**
- `conftest.py` - Test fixtures and setup
- `test_posts.py` - Post CRUD tests
- `test_auth.py` - Authentication tests

### `backend-fastapi/loadtests/`
**Purpose:** Load and performance testing.
**Contains:** Locust and quick load test scripts.
**Dependencies:** Locust (not in requirements.txt).
**Important files:**
- `locustfile.py` - Locust load test scenarios
- `quick_load.py` - Simple load test script

---

## Legacy Backend: `backend/`

### `backend/`
**Purpose:** Deprecated Hono (Node.js) backend.
**Contains:** Old API implementation.
**Dependencies:** Node.js, Hono, SQLite.
**Important files:**
- `index.js` - Legacy server entry point
- `src/posts.js` - Legacy post data

**Note:** This directory is kept for reference only. The application uses `backend-fastapi/` as the primary backend.

---

## API Testing: `bruno/`

### `bruno/`
**Purpose:** API testing collection.
**Contains:** Bruno API test files.
**Dependencies:** Bruno API client.
**Important files:**
- `post-panel-api/` - Test collection for Post Panel API

**Note:** Currently points to legacy port 3000 (needs update to 7180).

---

## CI/CD: `.github/`

### `.github/workflows/`
**Purpose:** GitHub Actions CI/CD pipelines.
**Contains:** Workflow definitions.
**Dependencies:** GitHub Actions, Render, Vercel.
**Important files:**
- `ci-cd.yml` - Build, test, and deployment pipeline

**Do not modify casually:** CI/CD configuration affects deployments

---

## Configuration Files

### Root Configuration
**Purpose:** Project-wide configuration.
**Contains:** Docker, git, environment files.
**Important files:**
- `docker-compose.yml` - Local PostgreSQL container
- `.gitignore` - Git ignore rules
- `.env.local` - Local environment variables
- `.env.prod` - Production environment variables

### `backend-fastapi/` Configuration
**Purpose:** Backend-specific configuration.
**Contains:** Python config, deployment configs.
**Important files:**
- `config.py` - Environment variable loading
- `alembic.ini` - Database migration config
- `Procfile` - Heroku deployment
- `render.yaml` - Render deployment

### `client/` Configuration
**Purpose:** Frontend-specific configuration.
**Contains:** Vite config, linting, environment.
**Important files:**
- `vite.config.js` - Build and dev server config
- `.oxlintrc.json` - Linting rules
- `.env.prod` - Frontend environment variables

---

## Documentation Files

### Root Documentation
**Purpose:** Project documentation.
**Contains:** README, setup instructions, build log.
**Important files:**
- `README.md` - Project overview
- `SETUP.md` - Detailed setup instructions
- `BUILD.md` - Build process documentation
- `TODO.md` - Planned improvements

### `codebase-context/`
**Purpose:** AI-optimized codebase documentation.
**Contains:** Architecture, API, data model documentation.
**Dependencies:** All source code.
**Important files:**
- `README.md` - Entry point for developers/AI agents
- `AI_CONTEXT.md` - Optimized for AI coding agents

---

## Directory Dependency Graph

```
post-panel/
├── client/ (Frontend)
│   ├── src/api/ → backend-fastapi/ (API calls)
│   ├── src/context/ → src/api/ (Auth state)
│   ├── src/pages/ → src/components/, src/api/
│   └── src/components/ → src/context/
├── backend-fastapi/ (Backend)
│   ├── main.py → handler/, app/, auth.py, database.py
│   ├── handler/ → app/models.py, database.py
│   ├── app/models.py → database.py
│   └── alembic/ → app/models.py, database.py
├── backend/ (Legacy - not used)
└── bruno/ → backend-fastapi/ (API testing)
```

## Critical Directories

### High Impact (changes affect many areas)
1. `backend-fastapi/main.py` - All routes and business logic
2. `client/src/api/client.js` - All API communication
3. `client/src/context/AuthContext.jsx` - Authentication state
4. `backend-fastapi/app/models.py` - Database schema
5. `backend-fastapi/auth.py` - Authentication logic

### Medium Impact (changes affect specific features)
1. `client/src/pages/` - Page-level changes
2. `backend-fastapi/handler/postHandler.py` - Post operations
3. `backend-fastapi/alembic/versions/` - Database changes

### Low Impact (isolated changes)
1. `client/src/components/` - UI component changes
2. `client/src/config/` - Configuration changes
3. `backend-fastapi/tests/` - Test changes

## Things That Should Not Be Modified Casually

1. **Authentication logic** (`backend-fastapi/auth.py`, `client/src/context/AuthContext.jsx`)
2. **Database models** (`backend-fastapi/app/models.py`)
3. **Migration files** (`backend-fastapi/alembic/versions/`)
4. **CI/CD pipeline** (`.github/workflows/ci-cd.yml`)
5. **Deployment configuration** (`render.yaml`, `railway.json`)
6. **API client refresh logic** (`client/src/api/client.js`)
7. **Environment variable loading** (`backend-fastapi/config.py`)