# Dependencies

This document catalogs all external and internal dependencies in the Post Panel application.

## External Dependencies

### Framework

#### FastAPI
- **Package:** fastapi
- **Version:** Not pinned (latest)
- **Purpose:** Python web framework for building APIs
- **Used in:** `backend-fastapi/main.py`
- **Why it exists:** Provides async request handling, automatic OpenAPI docs, dependency injection
- **Important APIs:** Route decorators, Depends, HTTPException, middleware
- **Configuration required:** None (uses defaults)
- **Notes:** Modern, fast framework with excellent async support

#### Uvicorn
- **Package:** uvicorn
- **Version:** Not pinned (latest)
- **Purpose:** ASGI server for running FastAPI
- **Used in:** `backend-fastapi/main.py` (entry point)
- **Why it exists:** Production-grade server for Python ASGI applications
- **Important APIs:** `uvicorn.run()`
- **Configuration required:** Port, host, reload settings
- **Notes:** Standard ASGI server, good performance

### UI

#### React
- **Package:** react, react-dom
- **Version:** ^19.2.7
- **Purpose:** UI library for building component-based interfaces
- **Used in:** All frontend components
- **Why it exists:** Declarative, component-based UI development
- **Important APIs:** useState, useEffect, useContext, JSX
- **Configuration required:** None
- **Notes:** Latest major version with improved performance

#### React Router
- **Package:** react-router-dom
- **Version:** ^7.18.2
- **Purpose:** Client-side routing for React applications
- **Used in:** `client/src/App.jsx`, all page components
- **Why it exists:** Enables SPA navigation without page reloads
- **Important APIs:** Routes, Route, useNavigate, useParams
- **Configuration required:** BrowserRouter wrapper
- **Notes:** Latest major version with improved data APIs

#### Tailwind CSS
- **Package:** tailwindcss
- **Version:** ^4.3.3
- **Purpose:** Utility-first CSS framework
- **Used in:** All frontend components via className
- **Why it exists:** Rapid UI development with consistent design
- **Important APIs:** Utility classes, @apply directive
- **Configuration required:** Vite plugin, PostCSS
- **Notes:** Latest major version with new features

#### React Markdown
- **Package:** react-markdown
- **Version:** ^10.1.0
- **Purpose:** Markdown rendering in React
- **Used in:** `client/src/pages/Post.jsx`
- **Why it exists:** Renders post descriptions in markdown format
- **Important APIs:** Markdown component, plugins
- **Configuration required:** remark-gfm plugin
- **Notes:** Lightweight, extensible

#### React Quill New
- **Package:** react-quill-new
- **Version:** ^3.8.3
- **Purpose:** Rich text editor for React
- **Used in:** `client/src/pages/CreatePost.jsx`
- **Why it exists:** WYSIWYG editing for post descriptions
- **Important APIs:** ReactQuill component, formats, modules
- **Configuration required:** CSS import, toolbar configuration
- **Notes:** Maintained fork of react-quill

### Database

#### PostgreSQL
- **Package:** psycopg2-binary
- **Version:** Not pinned (latest)
- **Purpose:** PostgreSQL adapter for Python
- **Used in:** `backend-fastapi/database.py`
- **Why it exists:** Connects Python to PostgreSQL database
- **Important APIs:** Connection, cursor, execution
- **Configuration required:** DATABASE_URL environment variable
- **Notes:** Binary version for easier installation

#### SQLAlchemy
- **Package:** sqlalchemy
- **Version:** Not pinned (latest)
- **Purpose:** Python SQL toolkit and ORM
- **Used in:** `backend-fastapi/app/models.py`, `backend-fastapi/database.py`
- **Why it exists:** Provides ORM, connection pooling, database abstraction
- **Important APIs:** Column, Integer, String, JSON, declarative_base
- **Configuration required:** Database URL, engine configuration
- **Notes:** ORM layer for database operations

#### Alembic
- **Package:** alembic
- **Version:** Not pinned (latest)
- **Purpose:** Database migration tool for SQLAlchemy
- **Used in:** `backend-fastapi/alembic/`
- **Why it exists:** Manages database schema changes
- **Important APIs:** Migration scripts, upgrade/downgrade functions
- **Configuration required:** `alembic.ini`, database URL
- **Notes:** Essential for database version control

### Authentication

#### PyJWT
- **Package:** PyJWT
- **Version:** Not pinned (latest)
- **Purpose:** JSON Web Token implementation for Python
- **Used in:** `backend-fastapi/auth.py`
- **Why it exists:** Token creation and validation for authentication
- **Important APIs:** `jwt.encode()`, `jwt.decode()`
- **Configuration required:** JWT_SECRET, JWT_ALGORITHM
- **Notes:** Standard JWT library for Python

### Validation

#### Pydantic
- **Package:** pydantic (included with FastAPI)
- **Version:** Not pinned (latest)
- **Purpose:** Data validation using Python type annotations
- **Used in:** `backend-fastapi/main.py` (request models)
- **Why it exists:** Automatic request validation and serialization
- **Important APIs:** BaseModel, Field, validator
- **Configuration required:** None
- **Notes:** Integrated with FastAPI

### State Management

#### React Context
- **Package:** react (built-in)
- **Version:** ^19.2.7
- **Purpose:** Global state management without external libraries
- **Used in:** `client/src/context/AuthContext.jsx`, `ToastContext.jsx`
- **Why it exists:** Provides auth and toast state to all components
- **Important APIs:** createContext, useContext, Provider
- **Configuration required:** None
- **Notes:** Lightweight solution for simple global state

### Networking

#### httpx
- **Package:** httpx
- **Version:** Not pinned (latest)
- **Purpose:** Modern HTTP client for Python
- **Used in:** `backend-fastapi/main.py` (GitHub API calls)
- **Why it exists:** Async HTTP requests to external APIs
- **Important APIs:** `httpx.AsyncClient()`, `client.get()`, `client.post()`
- **Configuration required:** None
- **Notes:** Modern alternative to requests with async support

### Storage

#### LocalStorage (Browser)
- **Package:** Web API (built-in)
- **Version:** N/A
- **Purpose:** Client-side key-value storage
- **Used in:** `client/src/api/client.js`, `client/src/context/AuthContext.jsx`
- **Why it exists:** Persists authentication tokens
- **Important APIs:** `localStorage.getItem()`, `localStorage.setItem()`
- **Configuration required:** None
- **Notes:** Simple storage for tokens, not sensitive data

### Markdown Processing

#### Markdown (Python)
- **Package:** markdown
- **Version:** Not pinned (latest)
- **Purpose:** Python Markdown parser
- **Used in:** `backend-fastapi/main.py` (AI generation)
- **Why it exists:** Converts markdown to HTML for Quill editor
- **Important APIs:** `markdown.markdown()`
- **Configuration required:** None
- **Notes:** Standard Markdown library for Python

#### remark-gfm
- **Package:** remark-gfm
- **Version:** ^4.0.1
- **Purpose:** GitHub Flavored Markdown plugin for react-markdown
- **Used in:** `client/src/pages/Post.jsx`
- **Why it exists:** Enables tables, strikethrough, etc. in markdown
- **Important APIs:** Plugin for react-markdown
- **Configuration required:** None
- **Notes:** Extends standard markdown with GFM features

### Analytics

#### None detected
No analytics packages found in the codebase.

### Monitoring

#### None detected
No monitoring packages found in the codebase.

### Testing

#### Vitest
- **Package:** vitest
- **Version:** ^5.0.0
- **Purpose:** Testing framework for Vite projects
- **Used in:** `client/src/tests/`
- **Why it exists:** Fast unit testing with Vite integration
- **Important APIs:** `describe`, `it`, `expect`, `vi.fn()`
- **Configuration required:** `vite.config.js` configuration
- **Notes:** Modern, fast testing framework

#### React Testing Library
- **Package:** @testing-library/react
- **Version:** ^16.3.3
- **Purpose:** Testing utilities for React components
- **Used in:** All frontend test files
- **Why it exists:** Encourages testing user behavior over implementation
- **Important APIs:** `render`, `screen`, `fireEvent`
- **Configuration required:** None
- **Notes:** Industry standard for React testing

#### jsdom
- **Package:** jsdom
- **Version:** ^30.0.1
- **Purpose:** JavaScript DOM implementation for testing
- **Used in:** Vitest configuration
- **Why it exists:** Provides DOM environment for tests
- **Important APIs:** Simulates browser environment
- **Configuration required:** Vitest environment setting
- **Notes:** Enables testing of DOM-dependent code

#### Pytest
- **Package:** pytest
- **Version:** Not in requirements.txt
- **Purpose:** Python testing framework
- **Used in:** `backend-fastapi/tests/`
- **Why it exists:** Simple, powerful testing for Python
- **Important APIs:** `@pytest.fixture`, `assert`
- **Configuration required:** `conftest.py` fixtures
- **Notes:** Standard testing framework for Python

### Build Tooling

#### Vite
- **Package:** vite
- **Version:** ^8.1.1
- **Purpose:** Frontend build tool and dev server
- **Used in:** `client/`
- **Why it exists:** Fast development and optimized builds
- **Important APIs:** Dev server, build, plugins
- **Configuration required:** `vite.config.js`
- **Notes:** Latest major version with improved performance

#### @vitejs/plugin-react
- **Package:** @vitejs/plugin-react
- **Version:** ^6.0.3
- **Purpose:** React support for Vite
- **Used in:** `client/vite.config.js`
- **Why it exists:** Enables JSX, fast refresh, and React features
- **Important APIs:** React plugin configuration
- **Configuration required:** None
- **Notes:** Official React plugin for Vite

### Development Tooling

#### oxlint
- **Package:** oxlint
- **Version:** ^1.71.0
- **Purpose:** Fast JavaScript/TypeScript linter
- **Used in:** `client/` via `npm run lint`
- **Why it exists:** Code quality and consistency
- **Important APIs:** Linting rules, configuration
- **Configuration required:** `.oxlintrc.json`
- **Notes:** Fast alternative to ESLint

#### Python Dotenv
- **Package:** python-dotenv
- **Version:** Not pinned (latest)
- **Purpose:** Load environment variables from .env files
- **Used in:** `backend-fastapi/config.py`
- **Why it exists:** Development environment configuration
- **Important APIs:** `load_dotenv()`, `os.getenv()`
- **Configuration required:** `.env` files
- **Notes:** Standard for Python environment management

## Internal Dependencies

### Backend Internal Dependencies

#### Post Handler Dependencies
```
Post_handler
├── Post model (app/models.py)
├── User model (app/models.py)
└── Database session (database.py)
```

#### Auth Module Dependencies
```
auth.py
├── User model (app/models.py)
├── Config (config.py)
└── JWT library (PyJWT)
```

#### Database Dependencies
```
database.py
├── Config (config.py)
├── SQLAlchemy (sqlalchemy)
└── PostgreSQL driver (psycopg2-binary)
```

### Frontend Internal Dependencies

#### API Client Dependencies
```
api/client.js
├── Config (config/env.js)
└── LocalStorage (browser API)
```

#### Auth Context Dependencies
```
context/AuthContext.jsx
├── API client (api/client.js)
├── React Context (react)
└── LocalStorage (browser API)
```

#### Page Dependencies
```
pages/Home.jsx
├── API functions (api/posts.js)
├── Auth context (context/AuthContext.jsx)
├── Toast context (context/ToastContext.jsx)
└── Components (components/*)

pages/Post.jsx
├── API functions (api/posts.js)
├── React Markdown (react-markdown)
├── Lightbox (components/ImageLightbox.jsx)
└── Comments (components/Comments.jsx)

pages/CreatePost.jsx
├── API functions (api/posts.js)
├── React Quill (react-quill-new)
├── Auth context (context/AuthContext.jsx)
└── Toast context (context/ToastContext.jsx)
```

### Cross-Layer Dependencies

#### Frontend → Backend
```
Frontend
├── api/client.js → HTTP requests → Backend API
├── api/posts.js → Specific endpoints → Backend routes
└── Config → API_BASE → Backend URL
```

#### Backend → Database
```
Backend
├── main.py → get_db() → Database session
├── handler/ → SQLAlchemy queries → Database
└── auth.py → User queries → Database
```

#### Backend → External APIs
```
Backend
├── main.py → httpx → GitHub API
├── main.py → Gemini API (Google)
└── auth.py → GitHub OAuth
```

## Version Pinning Strategy

### Frontend (client/)
- Uses caret (`^`) versioning for minor updates
- React and related packages pinned to specific major versions
- Dev dependencies more loosely pinned

### Backend (backend-fastapi/)
- No version pinning in requirements.txt
- Relies on latest stable versions
- **Risk:** May break with major version updates
- **Recommendation:** Pin major versions at minimum

## Dependency Conflicts and Considerations

### Current Issues
1. **Locust not in requirements.txt:** Load testing tool missing from dependencies
2. **No version pinning (backend):** May cause unexpected behavior with updates
3. **Legacy backend dependencies:** `backend/package.json` contains unused dependencies

### Recommendations
1. Pin backend dependencies with version ranges
2. Add locust to requirements.txt or separate load-test requirements
3. Remove legacy backend directory or document as deprecated
4. Consider adding lock files (package-lock.json, pip freeze)

## Development vs Production Dependencies

### Development Only
- **Frontend:** vitest, @testing-library/*, jsdom, oxlint
- **Backend:** pytest (not in requirements.txt), locust (not in requirements.txt)

### Production
- **Frontend:** React, React Router, Tailwind CSS, react-markdown, react-quill-new
- **Backend:** FastAPI, Uvicorn, SQLAlchemy, Alembic, PyJWT, httpx, markdown, psycopg2-binary

### Both
- **Frontend:** Vite (used for dev and build)
- **Backend:** python-dotenv (used in all environments)