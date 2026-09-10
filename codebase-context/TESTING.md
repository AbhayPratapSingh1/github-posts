# Testing

This document explains the testing strategy and coverage in the Post Panel application.

## Overview

Post Panel has two testing suites:
- **Frontend tests:** JavaScript unit/integration tests (Vitest + React Testing Library)
- **Backend tests:** Python API/layer tests (Pytest)

## Test Infrastructure

### Frontend

**Framework:** Vitest 5
**Environment:** jsdom
**Test runner config:** `client/vite.config.js` (test section)
**Test setup:** `client/src/test-setup.js`
**Assertions:** Vitest built-in + @testing-library/jest-dom
**Component testing:** @testing-library/react

**Commands:**
```bash
npm test          # Run all tests once
npm run test:watch  # Watch mode
npm run lint      # Lint (oxlint)
```

### Backend

**Framework:** Pytest
**Database:** SQLite (in-memory)
**Fixtures:** `backend-fastapi/tests/conftest.py`

**Commands:**
```bash
pytest           # Run all tests
pytest -v        # Verbose output
pytest test_posts.py  # Specific file
```

## Test Files

### Frontend Tests

#### `client/src/tests/api/client.test.js`
**Purpose:** Tests the HTTP client request function
**Coverage:**
- Authentication header injection
- 401 handling with token refresh
- Request retry logic
- Error handling

#### `client/src/tests/api/posts.test.js`
**Purpose:** Tests the post API endpoint functions
**Coverage:**
- Endpoint URL correctness
- HTTP method correctness
- Headers and content type
- Query parameter encoding

#### `client/src/tests/components/Modal.test.jsx`
**Purpose:** Tests the Modal component
**Coverage:**
- Rendering and visibility
- Close button behavior
- Focus trap

#### `client/src/tests/components/ImageLightbox.test.jsx`
**Purpose:** Tests the ImageLightbox component
**Coverage:**
- Image rendering
- Keyboard navigation
- Counter display

#### `client/src/tests/components/Logo.test.jsx`
**Purpose:** Tests the Logo component
**Coverage:**
- Rendering
- Image source

#### `client/src/tests/context/AuthContext.test.jsx`
**Purpose:** Tests the authentication context
**Coverage:**
- OAuth callback URL parsing
- Token storage
- Login flow
- Logout flow

#### `client/src/tests/context/ToastContext.test.jsx`
**Purpose:** Tests the toast notification context
**Coverage:**
- Message display
- Auto-dismissal (fake timers)
- Multiple toasts

### Backend Tests

#### `backend-fastapi/tests/conftest.py`
**Purpose:** Test fixtures and configuration
**Contents:**
- SQLite test database setup
- `Base.metadata.create_all` / `drop_all`
- Autouse cleanup fixture
- `get_db` dependency override
- `auth_headers` and `other_auth_headers` fixtures
- `create_test_user` and `create_test_post` factories

#### `backend-fastapi/tests/test_posts.py`
**Purpose:** Tests post CRUD operations
**Coverage:**
- Post creation
- Post retrieval
- Post update
- Post deletion
- Ownership verification
- Pagination
- Slug generation
- Duplicate detection

#### `backend-fastapi/tests/test_auth.py`
**Purpose:** Tests authentication flows
**Coverage:**
- Admin login
- Logout
- Session management

#### `backend-fastapi/tests/test_auth_me.py`
**Purpose:** Tests user info endpoint
**Coverage:**
- `/api/auth/me` endpoint
- Token validation
- User data formatting

#### `backend-fastapi/tests/test_github.py`
**Purpose:** Tests GitHub integration functions
**Coverage:**
- GitHub API mocking (via `@patch`)
- Repository info fetching
- Error handling

#### `backend-fastapi/tests/test_utils.py`
**Purpose:** Tests utility functions
**Coverage:**
- `slugify()`
- `parse_github_url()`
- Cache behavior

## Test Setup Details

### Backend Fixtures

```python
# conftest.py
@pytest.fixture
def db_session():
    # Create in-memory SQLite database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    
    # Override get_db dependency
    TestingSessionLocal = sessionmaker(bind=engine)
    
    yield session
    
    Base.metadata.drop_all(engine)
```

**Key fixtures:**
- `auth_headers`: Authenticated request headers
- `other_auth_headers`: Headers for a different user (for ownership tests)
- `create_test_user`: Factory creating test users
- `create_test_post`: Factory creating test posts

### Frontend Setup

```javascript
// vite.config.js test configuration
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test-setup.js'],
  css: false,
}
```

**Setup file:** `src/test-setup.js`
- Imports @testing-library/jest-dom
- Configures cleanup between tests

## Coverage Review

### What Is Covered

| Area | Frontend | Backend | Level |
|------|----------|---------|-------|
| HTTP client | ✓ | N/A | Good |
| Post API functions | ✓ | N/A | Good |
| Modal component | ✓ | N/A | Basic |
| ImageLightbox | ✓ | N/A | Basic |
| Logo | ✓ | N/A | Basic |
| AuthContext | ✓ | N/A | Good |
| ToastContext | ✓ | N/A | Good |
| Post CRUD | N/A | ✓ | Good |
| Auth flows | N/A | ✓ | Good |
| GitHub integration | N/A | ✓ | Basic |
| Utility functions | N/A | ✓ | Good |

### Important Untested Areas

**Frontend:**
- Page components (Home, Post, CreatePost, AdminDashboard, AdminLogin)
- Comments component
- ProfileMenu component
- ProtectedRoute component
- GoToTop component
- Infinite scroll logic
- Form validation
- AI generation UI flow

**Backend:**
- Admin dashboard endpoints
- Admin post/user deletion endpoints
- Comment creation/retrieval endpoints
- AI generation endpoint (Gemini)
- Missing integration tests between handlers and routes
- End-to-end API tests

## Test Quality Observations

### Strengths
- Good unit test coverage for core logic (API client, auth)
- Consistent test patterns
- Fixtures reduce test boilerplate
- Real database schema used (SQLite for tests)
- Tests integrated into CI/CD

### Weaknesses
- No page-level integration tests
- No E2E tests
- Backend tests don't run in CI/CD (only frontend tests in GitHub Actions)
- No test coverage reporting
- Edge cases not tested (empty states, error states, permission boundaries)
- No load/performance tests in CI

## CI/CD Testing

**File:** `.github/workflows/ci-cd.yml`

**Current CI testing:**
```yaml
jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Install client dependencies
        run: npm ci
      - name: Run linter
        run: npm run lint
      - name: Run tests
        run: npm test
```

**Gaps:**
- Backend tests not run in CI
- No backend linting
- No coverage thresholds
- No E2E testing

## How to Run Tests

### Frontend
```bash
cd client
npm install
npm test              # Run once
npm run test:watch    # Watch mode
```

### Backend
```bash
cd backend-fastapi
pip install -r requirements.txt
pytest                # Run all tests
pytest -v             # Verbose
```

### Full Test Suite (Locally)
```bash
# Frontend
cd client && npm test
# Backend
cd ../backend-fastapi && pytest
```

## Load Testing

**Location:** `backend-fastapi/loadtests/`

### Load Test Files
- **locustfile.py:** Locust load test scenarios
  - Anonymous users (3x weight)
  - Authenticated users (1x weight)
  - Burst scenario (1x weight)
- **quick_load.py:** Simple thread-based load test
  - Measures p50, p95, p99 latency
  - Tracks status code distribution

### Running Load Tests
```bash
# Locust (web UI at http://localhost:8089)
locust -f loadtests/locustfile.py

# Quick load test
python loadtests/quick_load.py
```

**Note:** Locust is not in `requirements.txt` — install separately: `pip install locust`

## Bruno API Testing

**Location:** `bruno/post-panel-api/`

**Collection contents:**
- Get All Posts
- Get Post by ID
- Get Missing Post (404 assertion)

**Environment:** `Local.bru` points to `http://localhost:3000` (legacy backend port)

**Issue:** Environment URL is stale — should point to FastAPI backend at `http://localhost:7180`